'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { isFirebaseConfigured } from '@/lib/firebase'
import { getClientId } from '@/lib/client-id'
import {
  makeEvent,
  phaseDurationMs,
  resolveNight,
  resolveVotes,
} from '@/lib/game/engine'
import { buildRoleDeck, isMafiaTeam } from '@/lib/game/roles'
import type {
  GamePhase,
  GameSettings,
  NightStep,
  Player,
  RoomState,
} from '@/lib/game/types'
import { AVATARS, DEFAULT_SETTINGS, ROLE_INFO } from '@/lib/game/types'
import {
  createEmptyRoom,
  createRoom,
  generateRoomCode,
  joinRoomAsPlayer,
  subscribeRoom,
  updateRoom,
} from '@/lib/rooms'
import { HostDashboard } from './HostDashboard'
import { LandingScreen } from './LandingScreen'
import { LobbyScreen } from './LobbyScreen'
import { PlayerGameView } from './PlayerGameView'
import { SummaryScreen } from './SummaryScreen'
import { EntryScreen } from './EntryScreen'

type Screen = 'landing' | 'entry' | 'room'

export default function GameApp() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [clientId, setClientId] = useState('')
  const [room, setRoom] = useState<RoomState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isHost = Boolean(room && clientId && room.hostId === clientId)
  const me = room?.players.find((p) => p.id === clientId)

  useEffect(() => {
    setClientId(getClientId())
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) setScreen('entry')
  }, [])

  useEffect(() => {
    if (!room?.code || !isFirebaseConfigured()) return
    return subscribeRoom(
      room.code,
      (next) => setRoom(next),
      (err) => setError(err.message),
    )
  }, [room?.code])

  const patchRoom = useCallback(
    async (patch: Partial<RoomState>) => {
      if (!room) return
      await updateRoom(room.code, patch)
    },
    [room],
  )

  // Host-only auto phase advance when timer expires
  useEffect(() => {
    if (!room || !isHost || room.paused || !room.phaseEndsAt) return
    if (room.mode !== 'game') return

    const id = setInterval(() => {
      if (Date.now() < (room.phaseEndsAt ?? 0)) return
      void advancePhase(room, patchRoom)
    }, 500)
    return () => clearInterval(id)
  }, [room, isHost, patchRoom])

  async function handleCreate(hostName: string, roomName: string) {
    if (!requireFirebase()) return
    setBusy(true)
    setError('')
    try {
      const id = clientId || getClientId()
      const code = generateRoomCode()
      const next = createEmptyRoom({
        code,
        hostId: id,
        hostName: hostName.trim() || 'Host',
        roomName: roomName.trim() || `${hostName}'s Room`,
      })
      await createRoom(next)
      setClientId(id)
      setRoom(next)
      setScreen('room')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create room')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(name: string, code: string, avatar: string) {
    if (!requireFirebase()) return
    setBusy(true)
    setError('')
    try {
      const id = clientId || getClientId()
      const player: Player = {
        id,
        name: name.trim(),
        avatar,
        ready: false,
        connected: true,
        connectionQuality: 'good',
        micOn: false,
        cameraOn: false,
        handRaised: false,
        alive: true,
        lastWill: '',
        missedVotes: 0,
      }
      const next = await joinRoomAsPlayer(code.trim().toUpperCase(), player)
      setClientId(id)
      setRoom(next)
      setScreen('room')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join room')
    } finally {
      setBusy(false)
    }
  }

  function requireFirebase() {
    if (isFirebaseConfigured()) return true
    setError(
      'Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* keys and restart.',
    )
    return false
  }

  if (screen === 'landing') {
    return <LandingScreen onContinue={() => setScreen('entry')} />
  }

  if (screen === 'entry' || !room) {
    return (
      <EntryScreen
        busy={busy}
        error={error}
        initialCode={
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('code') ?? ''
            : ''
        }
        onCreate={handleCreate}
        onJoin={handleJoin}
        onBack={() => setScreen('landing')}
      />
    )
  }

  if (room.mode === 'lobby') {
    return (
      <LobbyScreen
        room={room}
        isHost={isHost}
        me={me}
        clientId={clientId}
        busy={busy}
        error={error}
        onUpdateSettings={(settings) => void patchRoom({ settings })}
        onToggleReady={async () => {
          if (!me) return
          const players = room.players.map((p) =>
            p.id === me.id ? { ...p, ready: !p.ready } : p,
          )
          await patchRoom({ players })
        }}
        onToggleMic={async () => {
          if (!me) return
          const players = room.players.map((p) =>
            p.id === me.id ? { ...p, micOn: !p.micOn } : p,
          )
          await patchRoom({ players })
        }}
        onToggleCamera={async () => {
          if (!me) return
          const players = room.players.map((p) =>
            p.id === me.id ? { ...p, cameraOn: !p.cameraOn } : p,
          )
          await patchRoom({ players })
        }}
        onKick={async (playerId) => {
          if (!isHost) return
          await patchRoom({
            players: room.players.filter((p) => p.id !== playerId),
            hostEvents: [
              ...room.hostEvents,
              makeEvent(0, 'system', `Host removed a player.`),
            ],
          })
        }}
        onStart={async () => {
          if (!isHost) return
          setBusy(true)
          try {
            await startGame(room, patchRoom)
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not start')
          } finally {
            setBusy(false)
          }
        }}
      />
    )
  }

  if (room.mode === 'summary') {
    return (
      <SummaryScreen
        room={room}
        isHost={isHost}
        onPlayAgain={async () => {
          if (!isHost) return
          await patchRoom({
            mode: 'lobby',
            phase: 'night',
            nightStep: 'doctor',
            round: 1,
            paused: false,
            players: room.players.map((p) => ({
              ...p,
              ready: false,
              alive: true,
              role: undefined,
              handRaised: false,
              missedVotes: 0,
            })),
            publicEvents: [],
            privateLogs: {},
            nightActions: { mafiaVotes: {} },
            votes: {},
            phaseEndsAt: null,
            winner: null,
            morningMessage: '',
            eliminatedThisRound: null,
            hostEvents: [
              ...room.hostEvents,
              makeEvent(0, 'system', 'Match restarted.'),
            ],
          })
        }}
      />
    )
  }

  if (isHost) {
    return (
      <HostDashboard
        room={room}
        onPatch={patchRoom}
        onSkipPhase={() => void advancePhase(room, patchRoom)}
        onEndGame={async () => {
          await patchRoom({
            mode: 'summary',
            hostEvents: [
              ...room.hostEvents,
              makeEvent(room.round, 'system', 'Host ended the game.'),
            ],
          })
        }}
      />
    )
  }

  return (
    <PlayerGameView
      room={room}
      me={me}
      onPatchPlayer={async (partial) => {
        if (!me) return
        const players = room.players.map((p) =>
          p.id === me.id ? { ...p, ...partial } : p,
        )
        await patchRoom({ players })
      }}
      onNightAction={async (actions) => {
        await patchRoom({
          nightActions: { ...room.nightActions, ...actions },
        })
      }}
      onVote={async (targetId) => {
        if (!me) return
        await patchRoom({
          votes: { ...room.votes, [me.id]: targetId },
        })
      }}
    />
  )
}

async function startGame(
  room: RoomState,
  patchRoom: (p: Partial<RoomState>) => Promise<void>,
) {
  if (room.players.length < 4) {
    throw new Error('Need at least 4 players.')
  }
  const deck = buildRoleDeck(room.players.length, {
    includeGodfather: room.settings.includeGodfather,
    includeGrandma: room.settings.includeGrandma,
    includeJester: room.settings.includeJester,
  })
  const players = room.players.map((p, i) => ({
    ...p,
    role: deck[i],
    alive: true,
    ready: true,
    handRaised: false,
    missedVotes: 0,
  }))

  const endsAt = Date.now() + phaseDurationMs('night', room.settings)
  await patchRoom({
    mode: 'game',
    phase: 'night',
    nightStep: 'doctor',
    round: 1,
    players,
    publicEvents: [
      makeEvent(1, 'night', 'Night has fallen. The city holds its breath.'),
    ],
    hostEvents: [
      ...room.hostEvents,
      makeEvent(1, 'night', 'Game started. Roles assigned.'),
      ...players.map((p) =>
        makeEvent(1, 'system', `${p.name} → ${p.role}`),
      ),
    ],
    privateLogs: {},
    nightActions: { mafiaVotes: {} },
    votes: {},
    phaseEndsAt: endsAt,
    winner: null,
    morningMessage: '',
    eliminatedThisRound: null,
    paused: false,
  })
}

async function advancePhase(
  room: RoomState,
  patchRoom: (p: Partial<RoomState>) => Promise<void>,
) {
  if (room.mode !== 'game' || room.paused) return

  if (room.phase === 'night') {
    await runNightStep(room, patchRoom)
    return
  }

  if (room.phase === 'morning') {
    await patchRoom({
      phase: 'discussion',
      phaseEndsAt:
        Date.now() + phaseDurationMs('discussion', room.settings),
      publicEvents: [
        ...room.publicEvents,
        makeEvent(room.round, 'discussion', 'Discussion begins.'),
      ],
      hostEvents: [
        ...room.hostEvents,
        makeEvent(room.round, 'discussion', 'Discussion phase started.'),
      ],
    })
    return
  }

  if (room.phase === 'discussion') {
    const alive = room.players.filter((p) => p.alive)
    const votes: Record<string, string> = {}
    for (const p of alive) votes[p.id] = room.votes[p.id] ?? 'abstain'
    await patchRoom({
      phase: 'voting',
      votes,
      phaseEndsAt: Date.now() + phaseDurationMs('voting', room.settings),
      publicEvents: [
        ...room.publicEvents,
        makeEvent(room.round, 'voting', 'Voting has begun.'),
      ],
      hostEvents: [
        ...room.hostEvents,
        makeEvent(room.round, 'voting', 'Voting phase started.'),
      ],
    })
    return
  }

  if (room.phase === 'voting') {
    const result = resolveVotes({
      players: room.players,
      votes: room.votes,
      round: room.round,
    })
    if (result.winner) {
      await patchRoom({
        mode: 'summary',
        phase: 'result',
        players: result.players,
        winner: result.winner,
        eliminatedThisRound: result.eliminatedId,
        publicEvents: [...room.publicEvents, ...result.publicEvents],
        hostEvents: [...room.hostEvents, ...result.hostEvents],
        phaseEndsAt: null,
      })
      return
    }
    await patchRoom({
      phase: 'result',
      players: result.players,
      eliminatedThisRound: result.eliminatedId,
      publicEvents: [...room.publicEvents, ...result.publicEvents],
      hostEvents: [...room.hostEvents, ...result.hostEvents],
      phaseEndsAt: Date.now() + 5000,
    })
    return
  }

  if (room.phase === 'result') {
    const nextRound = room.round + 1
    await patchRoom({
      phase: 'night',
      nightStep: 'doctor',
      round: nextRound,
      nightActions: { mafiaVotes: {} },
      votes: {},
      eliminatedThisRound: null,
      phaseEndsAt: Date.now() + phaseDurationMs('night', room.settings),
      publicEvents: [
        ...room.publicEvents,
        makeEvent(nextRound, 'night', 'Night has fallen.'),
      ],
      hostEvents: [
        ...room.hostEvents,
        makeEvent(nextRound, 'night', `Round ${nextRound} night started.`),
      ],
      players: room.players.map((p) => ({ ...p, handRaised: false })),
    })
  }
}

async function runNightStep(
  room: RoomState,
  patchRoom: (p: Partial<RoomState>) => Promise<void>,
) {
  const order: NightStep[] = ['doctor', 'detective', 'mafia', 'resolve']
  const idx = order.indexOf(room.nightStep)

  if (room.nightStep === 'resolve' || idx === order.length - 1) {
    const resolved = resolveNight({
      players: room.players,
      actions: room.nightActions,
      round: room.round,
      privateLogs: room.privateLogs,
    })

    if (resolved.winner) {
      await patchRoom({
        mode: 'summary',
        phase: 'morning',
        players: resolved.players,
        winner: resolved.winner,
        morningMessage: resolved.morningMessage,
        publicEvents: [...room.publicEvents, ...resolved.publicEvents],
        hostEvents: [...room.hostEvents, ...resolved.hostEvents],
        privateLogs: resolved.privateLogs,
        phaseEndsAt: null,
      })
      return
    }

    await patchRoom({
      phase: 'morning',
      nightStep: 'doctor',
      players: resolved.players,
      morningMessage: resolved.morningMessage,
      publicEvents: [...room.publicEvents, ...resolved.publicEvents],
      hostEvents: [...room.hostEvents, ...resolved.hostEvents],
      privateLogs: resolved.privateLogs,
      nightActions: { mafiaVotes: {} },
      phaseEndsAt: Date.now() + 4000,
    })
    return
  }

  const next = order[idx + 1]
  await patchRoom({
    nightStep: next,
    phaseEndsAt: Date.now() + phaseDurationMs('night', room.settings),
    hostEvents: [
      ...room.hostEvents,
      makeEvent(room.round, 'night', `Night step: ${next}`),
    ],
  })
}

export type { GameSettings, GamePhase }
export { ROLE_INFO, AVATARS, DEFAULT_SETTINGS, isMafiaTeam }
