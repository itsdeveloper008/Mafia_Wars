'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameEngine } from '@/game-engine/GameEngine'
import { TimerManager } from '@/game-engine/TimerManager'
import { ensureAuthUser, watchAuth } from '@/services/firebase/auth'
import { isFirebaseConfigured } from '@/services/firebase/client'
import {
  submitNightAction,
  submitVote,
  subscribeHostLogs,
  subscribeMySecret,
  subscribeNightActions,
  subscribePublicLogs,
  subscribeSecrets,
  subscribeVotes,
} from '@/services/rooms/actionService'
import {
  kickPlayer,
  joinAsPlayer,
  subscribePlayers,
  updatePlayerFields,
} from '@/services/rooms/playerService'
import {
  createRoom,
  getRoomByCode,
  setRoomPaused,
  subscribeRoom,
  subscribeState,
  updateRoomSettings,
} from '@/services/rooms/roomService'
import type {
  GameSession,
  GameStateDoc,
  LogDoc,
  NightActionDoc,
  PlayerDoc,
  RoomDoc,
  RoomSettings,
  SecretDoc,
  VoteDoc,
} from '@/types/game'

const emptyState = (roomId: string): GameStateDoc => ({
  roomId,
  status: 'waiting',
  nightStep: 'actions',
  currentRound: 0,
  timerStartedAt: null,
  timerDurationMs: 0,
  winner: null,
  morningMessage: '',
  eliminatedPlayerId: null,
  pendingTiePlayerIds: [],
  updatedAt: Date.now(),
})

export function useGameSession() {
  const [uid, setUid] = useState('')
  const [room, setRoom] = useState<RoomDoc | null>(null)
  const [state, setState] = useState<GameStateDoc | null>(null)
  const [players, setPlayers] = useState<PlayerDoc[]>([])
  const [mySecret, setMySecret] = useState<SecretDoc | null>(null)
  const [secrets, setSecrets] = useState<SecretDoc[]>([])
  const [votes, setVotes] = useState<Record<string, VoteDoc>>({})
  const [nightActions, setNightActions] = useState<NightActionDoc[]>([])
  const [publicLogs, setPublicLogs] = useState<LogDoc[]>([])
  const [hostLogs, setHostLogs] = useState<LogDoc[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const advancing = useRef(false)

  useEffect(() => {
    if (!isFirebaseConfigured()) return
    return watchAuth((user) => setUid(user?.uid ?? ''))
  }, [])

  useEffect(() => {
    if (!isFirebaseConfigured()) return
    void ensureAuthUser().catch((e: Error) => setError(e.message))
  }, [])

  const roomId = room?.roomId

  useEffect(() => {
    if (!roomId) return
    const unsubs = [
      subscribeRoom(roomId, setRoom, (e) => setError(e.message)),
      subscribeState(roomId, setState),
      subscribePlayers(roomId, setPlayers, (e) => setError(e.message)),
      subscribeVotes(roomId, setVotes),
      subscribeNightActions(roomId, setNightActions),
      subscribePublicLogs(roomId, setPublicLogs),
    ]
    return () => unsubs.forEach((u) => u())
  }, [roomId])

  const isHost = Boolean(room && uid && room.hostId === uid)
  const me = players.find((p) => p.uid === uid)

  useEffect(() => {
    if (!roomId || !me) {
      setMySecret(null)
      return
    }
    return subscribeMySecret(roomId, me.playerId, setMySecret)
  }, [roomId, me?.playerId])

  useEffect(() => {
    if (!roomId || !isHost) {
      setSecrets([])
      setHostLogs([])
      return
    }
    const unsubs = [
      subscribeSecrets(roomId, setSecrets),
      subscribeHostLogs(roomId, setHostLogs),
    ]
    return () => unsubs.forEach((u) => u())
  }, [roomId, isHost])

  // Host auto-mode phase driver (single writer)
  useEffect(() => {
    if (!room || !state || !isHost) return
    if (!room.settings.autoMode) return
    if (room.paused) return
    if (state.status === 'waiting' || state.status === 'finished') return

    const id = setInterval(() => {
      if (advancing.current) return
      if (
        !TimerManager.isExpired(
          state.timerStartedAt,
          state.timerDurationMs,
          room.paused,
        )
      ) {
        return
      }
      advancing.current = true
      void GameEngine.advanceFromTimer(
        room,
        state,
        players,
        secrets,
        votes,
        nightActions,
      )
        .catch((e: Error) => setError(e.message))
        .finally(() => {
          advancing.current = false
        })
    }, 400)

    return () => clearInterval(id)
  }, [room, state, isHost, players, secrets, votes, nightActions])

  const session: GameSession | null = useMemo(() => {
    if (!room || !uid) return null
    return {
      room,
      state: state ?? emptyState(room.roomId),
      players,
      me,
      mySecret: mySecret ?? undefined,
      secrets: isHost ? secrets : [],
      votes,
      nightActions: Object.fromEntries(
        nightActions.map((a) => [a.playerId, a]),
      ),
      publicLogs,
      hostLogs: isHost ? hostLogs : [],
      isHost,
      uid,
    }
  }, [
    room,
    state,
    players,
    me,
    mySecret,
    secrets,
    votes,
    nightActions,
    publicLogs,
    hostLogs,
    isHost,
    uid,
  ])

  const create = useCallback(
    async (hostName: string, roomName: string) => {
      setBusy(true)
      setError('')
      try {
        const user = await ensureAuthUser()
        setUid(user.uid)
        const created = await createRoom({
          hostId: user.uid,
          hostName,
          roomName,
        })
        setRoom(created)
        setState(emptyState(created.roomId))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not create room')
        throw e
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const join = useCallback(
    async (name: string, code: string, avatar: string) => {
      setBusy(true)
      setError('')
      try {
        const user = await ensureAuthUser()
        setUid(user.uid)
        const found = await getRoomByCode(code)
        if (!found) throw new Error('Room not found. Check the code.')
        if (found.status !== 'waiting') {
          throw new Error('This game already started.')
        }
        await joinAsPlayer({
          roomId: found.roomId,
          uid: user.uid,
          displayName: name,
          avatar,
          maxPlayers: found.settings.maxPlayers,
          hostId: found.hostId,
        })
        setRoom(found)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not join room')
        throw e
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const actions = useMemo(() => {
    if (!room || !uid) return null
    return {
      updateSettings: (settings: RoomSettings) =>
        updateRoomSettings(room.roomId, settings),
      toggleReady: async () => {
        if (!me) return
        await updatePlayerFields(room.roomId, me.playerId, {
          isReady: !me.isReady,
        })
      },
      toggleMic: async () => {
        if (!me) return
        await updatePlayerFields(room.roomId, me.playerId, {
          micEnabled: !me.micEnabled,
        })
      },
      toggleCamera: async () => {
        if (!me) return
        await updatePlayerFields(room.roomId, me.playerId, {
          cameraEnabled: !me.cameraEnabled,
        })
      },
      toggleHand: async () => {
        if (!me) return
        await updatePlayerFields(room.roomId, me.playerId, {
          raisedHand: !me.raisedHand,
        })
      },
      kick: (playerId: string) => kickPlayer(room.roomId, playerId),
      startGame: async () => {
        setBusy(true)
        try {
          await GameEngine.startGame(room, players)
        } finally {
          setBusy(false)
        }
      },
      pause: (paused: boolean) => setRoomPaused(room.roomId, paused),
      skipPhase: async () => {
        if (!state) return
        await GameEngine.skipPhase(
          room,
          state,
          players,
          secrets,
          votes,
          nightActions,
        )
      },
      endGame: async () => {
        // force finish without winner via restart-like status
        await GameEngine.restartLobby(room, players)
      },
      playAgain: async () => {
        await GameEngine.restartLobby(room, players)
      },
      breakTie: async (eliminatedId: string) => {
        if (!state) return
        await GameEngine.hostBreakTie(
          room,
          state,
          players,
          secrets,
          eliminatedId,
        )
      },
      acknowledgeHand: async (playerId: string) => {
        await updatePlayerFields(room.roomId, playerId, { raisedHand: false })
      },
      muteAll: async (micEnabled: boolean) => {
        await Promise.all(
          players.map((p) =>
            updatePlayerFields(room.roomId, p.playerId, { micEnabled }),
          ),
        )
      },
      vote: async (targetId: string) => {
        if (!me) return
        await submitVote({
          roomId: room.roomId,
          playerId: me.playerId,
          uid,
          targetId,
        })
      },
      nightAction: async (targetId: string) => {
        if (!me || !mySecret) return
        await submitNightAction({
          roomId: room.roomId,
          playerId: me.playerId,
          uid,
          role: mySecret.role,
          targetId,
        })
      },
      addDiscussionTime: async (seconds: number) => {
        if (!state || state.status !== 'discussion') return
        const { updateDoc } = await import('firebase/firestore')
        const { stateDoc } = await import('@/services/rooms/paths')
        await updateDoc(stateDoc(room.roomId), {
          timerDurationMs: state.timerDurationMs + seconds * 1000,
          updatedAt: Date.now(),
        })
      },
    }
  }, [room, uid, me, players, state, secrets, votes, nightActions, mySecret])

  return {
    session,
    busy,
    error,
    setError,
    create,
    join,
    actions,
    isConfigured: isFirebaseConfigured(),
  }
}
