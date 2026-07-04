'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getDocs } from 'firebase/firestore'
import { GameEngine } from '@/game-engine/GameEngine'
import { TimerManager } from '@/game-engine/TimerManager'
import { analytics } from '@/lib/analytics'
import { toUserError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { sessionStorage } from '@/lib/sessionStorage'
import { ensureAuthUser, watchAuth } from '@/services/firebase/auth'
import { isFirebaseConfigured } from '@/services/firebase/client'
import {
  submitNightAction,
  submitVote,
  subscribeHostLogs,
  subscribeMySecret,
  subscribeMyNightAction,
  subscribeMyVote,
  subscribeNightActions,
  subscribePublicLogs,
  subscribeSecrets,
  subscribeVotes,
} from '@/services/rooms/actionService'
import { playersCol } from '@/services/rooms/paths'
import {
  kickPlayer,
  joinAsPlayer,
  subscribePlayers,
  updatePlayerFields,
} from '@/services/rooms/playerService'
import {
  createRoom,
  getRoomByCode,
  getRoomById,
  setRoomPaused,
  subscribeRoom,
  subscribeState,
  updateRoomFields,
  updateRoomSettings,
} from '@/services/rooms/roomService'
import { useUiStore } from '@/store/uiStore'
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
  const [restoring, setRestoring] = useState(true)
  const advancing = useRef(false)
  const pushToast = useUiStore((s) => s.pushToast)
  const prevPlayerCount = useRef(0)

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setRestoring(false)
      return
    }
    return watchAuth((user) => setUid(user?.uid ?? ''))
  }, [])

  // Auth + session recovery after refresh
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setRestoring(false)
      return
    }
    let cancelled = false
    async function restore() {
      try {
        const user = await ensureAuthUser()
        if (cancelled) return
        setUid(user.uid)
        const saved = sessionStorage.getRoom()
        if (!saved) return
        const found = await getRoomById(saved)
        if (!found) {
          sessionStorage.clearRoom()
          return
        }
        if (found.hostId === user.uid) {
          setRoom(found)
          logger.info('session.restored_host', { roomId: found.roomId })
          pushToast({ title: 'Reconnected', description: `Room ${found.roomCode}`, tone: 'success' })
          return
        }
        const snap = await getDocs(playersCol(found.roomId))
        const mine = snap.docs.find((d) => (d.data() as PlayerDoc).uid === user.uid)
        if (mine) {
          await updatePlayerFields(found.roomId, user.uid, {
            isConnected: true,
            connectionQuality: 'good',
          })
          setRoom(found)
          logger.info('session.restored_player', { roomId: found.roomId })
          pushToast({ title: 'Reconnected', description: `Room ${found.roomCode}`, tone: 'success' })
        } else {
          sessionStorage.clearRoom()
        }
      } catch (e) {
        const err = toUserError(e)
        setError(err.userMessage)
        logger.error('session.restore_failed', { message: err.userMessage })
      } finally {
        if (!cancelled) setRestoring(false)
      }
    }
    void restore()
    return () => {
      cancelled = true
    }
  }, [pushToast])

  const roomId = room?.roomId
  const isHost = Boolean(room && uid && room.hostId === uid)
  const me = players.find((p) => p.uid === uid)

  useEffect(() => {
    if (!roomId) return
    const unsubs = [
      subscribeRoom(roomId, setRoom, (e) => setError(e.message)),
      subscribeState(roomId, setState),
      subscribePlayers(roomId, setPlayers, (e) => setError(e.message)),
      subscribePublicLogs(roomId, setPublicLogs),
    ]
    return () => unsubs.forEach((u) => u())
  }, [roomId])

  // Host reads all votes/actions; players only their own (security rules)
  useEffect(() => {
    if (!roomId || !uid) return
    if (isHost) {
      const unsubs = [
        subscribeVotes(roomId, setVotes),
        subscribeNightActions(roomId, setNightActions),
      ]
      return () => unsubs.forEach((u) => u())
    }
    if (!me) return
    const unsubs = [
      subscribeMyVote(roomId, me.playerId, (vote) => {
        setVotes(vote ? { [vote.playerId]: vote } : {})
      }),
      subscribeMyNightAction(roomId, me.playerId, (action) => {
        setNightActions(action ? [action] : [])
      }),
    ]
    return () => unsubs.forEach((u) => u())
  }, [roomId, uid, isHost, me?.playerId])

  // Toast when players join/leave
  useEffect(() => {
    if (!room || room.status !== 'waiting') {
      prevPlayerCount.current = players.length
      return
    }
    if (prevPlayerCount.current && players.length > prevPlayerCount.current) {
      pushToast({ title: 'Player joined', tone: 'info' })
    }
    if (prevPlayerCount.current && players.length < prevPlayerCount.current) {
      pushToast({ title: 'Player left', tone: 'warning' })
    }
    prevPlayerCount.current = players.length
  }, [players.length, room, pushToast])

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
        sessionStorage.saveRoom(created.roomId)
        sessionStorage.saveDisplayName(hostName)
        setRoom(created)
        setState(emptyState(created.roomId))
        logger.info('room.created', { roomId: created.roomId })
        analytics.track('room_created', { roomCode: created.roomCode })
        pushToast({ title: 'Room created', description: created.roomCode, tone: 'success' })
      } catch (e) {
        const err = toUserError(e)
        setError(err.userMessage)
        pushToast({ title: 'Could not create room', description: err.userMessage, tone: 'danger' })
        throw e
      } finally {
        setBusy(false)
      }
    },
    [pushToast],
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
        sessionStorage.saveRoom(found.roomId)
        sessionStorage.saveDisplayName(name)
        setRoom(found)
        logger.info('room.joined', { roomId: found.roomId })
        analytics.track('room_joined', { roomCode: found.roomCode })
        pushToast({ title: 'Joined room', description: found.roomCode, tone: 'success' })
      } catch (e) {
        const err = toUserError(e)
        setError(err.userMessage)
        pushToast({ title: 'Could not join', description: err.userMessage, tone: 'danger' })
        throw e
      } finally {
        setBusy(false)
      }
    },
    [pushToast],
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
        if (!me || !me.isAlive) return
        const raising = !me.raisedHand
        await updatePlayerFields(room.roomId, me.playerId, {
          raisedHand: raising,
          raisedHandAt: raising ? Date.now() : null,
        })
        if (!raising && room.currentSpeakerId === me.playerId) {
          await updateRoomFields(room.roomId, { currentSpeakerId: null })
        }
      },
      kick: (playerId: string) => kickPlayer(room.roomId, playerId),
      startGame: async () => {
        setBusy(true)
        try {
          await GameEngine.startGame(room, players)
          logger.info('game.started', { roomId: room.roomId, players: players.length })
          analytics.track('game_started', {
            roomCode: room.roomCode,
            players: players.length,
          })
          pushToast({ title: 'Game started', tone: 'success' })
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
        await updatePlayerFields(room.roomId, playerId, {
          raisedHand: false,
          raisedHandAt: null,
          canSpeak: true,
          micEnabled: true,
        })
        await updateRoomFields(room.roomId, { currentSpeakerId: playerId })
      },
      grantSpeak: async (playerId: string) => {
        await Promise.all(
          players.map((p) =>
            updatePlayerFields(room.roomId, p.playerId, {
              canSpeak: p.playerId === playerId,
              micEnabled: p.playerId === playerId,
              raisedHand: p.playerId === playerId ? false : p.raisedHand,
              raisedHandAt: p.playerId === playerId ? null : p.raisedHandAt,
            }),
          ),
        )
        await updateRoomFields(room.roomId, { currentSpeakerId: playerId })
      },
      clearSpeaker: async () => {
        await updateRoomFields(room.roomId, { currentSpeakerId: null })
        await Promise.all(
          players.map((p) =>
            updatePlayerFields(room.roomId, p.playerId, {
              canSpeak: room.settings.discussionMode === 'free',
            }),
          ),
        )
      },
      hostMutePlayer: async (playerId: string, muted: boolean) => {
        await updatePlayerFields(room.roomId, playerId, {
          hostMuted: muted,
          micEnabled: muted ? false : true,
          isSpeaking: false,
        })
      },
      muteAll: async (micEnabled: boolean) => {
        await Promise.all(
          players.map((p) =>
            updatePlayerFields(room.roomId, p.playerId, {
              micEnabled,
              hostMuted: !micEnabled,
              isSpeaking: false,
            }),
          ),
        )
      },
      lockVoice: async (voiceLocked: boolean) => {
        await updateRoomSettings(room.roomId, {
          ...room.settings,
          voiceLocked,
        })
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
  }, [room, uid, me, players, state, secrets, votes, nightActions, mySecret, pushToast])

  // Mark disconnected on tab close
  useEffect(() => {
    if (!room || !me) return
    const onLeave = () => {
      void updatePlayerFields(room.roomId, me.playerId, {
        isConnected: false,
        connectionQuality: 'offline',
        isSpeaking: false,
      })
    }
    window.addEventListener('pagehide', onLeave)
    return () => window.removeEventListener('pagehide', onLeave)
  }, [room, me])

  return {
    session,
    busy,
    restoring,
    error,
    setError,
    create,
    join,
    actions,
    isConfigured: isFirebaseConfigured(),
  }
}
