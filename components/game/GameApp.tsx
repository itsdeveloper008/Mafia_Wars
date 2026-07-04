'use client'

import { useEffect, useState } from 'react'
import { useGameSession } from '@/hooks/useGameSession'
import { EntryScreen } from './EntryScreen'
import { HostDashboard } from './HostDashboard'
import { LandingScreen } from './LandingScreen'
import { LobbyScreen } from './LobbyScreen'
import { PlayerGameView } from './PlayerGameView'
import { SummaryScreen } from './SummaryScreen'

type Screen = 'landing' | 'entry' | 'room'

export default function GameApp() {
  const [screen, setScreen] = useState<Screen>('landing')
  const { session, busy, error, setError, create, join, actions, isConfigured } =
    useGameSession()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('code')) setScreen('entry')
  }, [])

  useEffect(() => {
    if (session?.room) setScreen('room')
  }, [session])

  if (screen === 'landing') {
    return <LandingScreen onContinue={() => setScreen('entry')} />
  }

  if (screen === 'entry' || !session) {
    return (
      <EntryScreen
        busy={busy}
        error={
          error ||
          (!isConfigured
            ? 'Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* keys.'
            : '')
        }
        initialCode={
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('code') ?? ''
            : ''
        }
        onCreate={async (hostName, roomName) => {
          try {
            await create(hostName, roomName)
            setScreen('room')
          } catch {
            // error state set in hook
          }
        }}
        onJoin={async (name, code, avatar) => {
          try {
            await join(name, code, avatar)
            setScreen('room')
          } catch {
            // error state set in hook
          }
        }}
        onBack={() => {
          setError('')
          setScreen('landing')
        }}
      />
    )
  }

  const { room, state, isHost } = session

  if (room.status === 'waiting' || room.status === 'starting') {
    return (
      <LobbyScreen
        session={session}
        busy={busy}
        error={error}
        onUpdateSettings={(settings) => void actions?.updateSettings(settings)}
        onToggleReady={() => void actions?.toggleReady()}
        onToggleMic={() => void actions?.toggleMic()}
        onToggleCamera={() => void actions?.toggleCamera()}
        onKick={(id) => void actions?.kick(id)}
        onStart={() => void actions?.startGame().catch((e: Error) => setError(e.message))}
        onToggleAutoMode={(autoMode) =>
          void actions?.updateSettings({ ...room.settings, autoMode })
        }
      />
    )
  }

  if (room.status === 'finished' || state.status === 'finished') {
    return (
      <SummaryScreen
        session={session}
        onPlayAgain={() => void actions?.playAgain()}
      />
    )
  }

  if (isHost) {
    return (
      <HostDashboard
        session={session}
        onPause={(paused) => void actions?.pause(paused)}
        onSkip={() => void actions?.skipPhase()}
        onEnd={() => void actions?.playAgain()}
        onAddTime={(sec) => void actions?.addDiscussionTime(sec)}
        onMuteAll={(on) => void actions?.muteAll(on)}
        onAckHand={(id) => void actions?.acknowledgeHand(id)}
        onBreakTie={(id) => void actions?.breakTie(id)}
        onToggleVoice={(voiceEnabled) =>
          void actions?.updateSettings({ ...room.settings, voiceEnabled })
        }
        onToggleVideo={(videoEnabled) =>
          void actions?.updateSettings({ ...room.settings, videoEnabled })
        }
      />
    )
  }

  return (
    <PlayerGameView
      session={session}
      onToggleHand={() => void actions?.toggleHand()}
      onToggleMic={() => void actions?.toggleMic()}
      onToggleCamera={() => void actions?.toggleCamera()}
      onVote={(id) => void actions?.vote(id)}
      onNightAction={(id) => void actions?.nightAction(id)}
    />
  )
}
