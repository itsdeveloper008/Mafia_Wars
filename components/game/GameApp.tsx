'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Mic } from 'lucide-react'
import { useGameSession } from '@/hooks/useGameSession'
import { useImmersion } from '@/hooks/useImmersion'
import { useVoiceRoom } from '@/hooks/useVoiceRoom'
import { SoundManager } from '@/services/audio/SoundManager'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { ToastHost } from '@/components/ui/ToastHost'
import { EntryScreen } from './EntryScreen'
import { HostDashboard } from './HostDashboard'
import { ImmersionLayer } from './immersive/ImmersionLayer'
import { LandingScreen } from './LandingScreen'
import { LobbyScreen } from './LobbyScreen'
import { PlayerGameView } from './PlayerGameView'
import { SummaryScreen } from './SummaryScreen'

type Screen = 'landing' | 'entry' | 'room'

export default function GameApp() {
  const [screen, setScreen] = useState<Screen>('landing')
  const {
    session,
    busy,
    restoring,
    error,
    setError,
    create,
    join,
    actions,
    isConfigured,
  } = useGameSession()
  const immersion = useImmersion(session)
  const voice = useVoiceRoom(session)

  const secondsLeft = useMemo(() => {
    if (!session?.state.timerStartedAt) return 0
    return Math.max(
      0,
      Math.ceil(
        (session.state.timerStartedAt +
          session.state.timerDurationMs -
          Date.now()) /
          1000,
      ),
    )
  }, [session?.state.timerStartedAt, session?.state.timerDurationMs])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('code')) setScreen('entry')
  }, [])

  useEffect(() => {
    if (session?.room) setScreen('room')
  }, [session])

  // Unlock audio on first gesture
  useEffect(() => {
    const unlock = () => {
      SoundManager.setEnabled(true, true)
      SoundManager.play('click')
      window.removeEventListener('pointerdown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    return () => window.removeEventListener('pointerdown', unlock)
  }, [])

  const pttVisible =
    session &&
    !session.isHost &&
    session.me?.isAlive &&
    (session.room.settings.discussionMode === 'push_to_talk' ||
      session.room.settings.forcePushToTalk) &&
    session.state.status === 'discussion'

  if (restoring) {
    return (
      <div className="mw-shell flex min-h-screen items-center justify-center">
        <div className="mw-shell-bg" aria-hidden="true" />
        <div className="relative z-10 flex items-center gap-3 text-mw-muted">
          <Loader2 className="h-5 w-5 animate-spin text-mw-primary" />
          Reconnecting…
        </div>
      </div>
    )
  }

  return (
    <>
      <ToastHost />
      <OfflineBanner />

      {screen === 'landing' && (
        <LandingScreen
          onContinue={() => {
            SoundManager.play('click')
            setScreen('entry')
          }}
        />
      )}

      {(screen === 'entry' || !session) && screen !== 'landing' && (
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
              SoundManager.play('click')
              await create(hostName, roomName)
              setScreen('room')
            } catch {
              // error in hook
            }
          }}
          onJoin={async (name, code, avatar) => {
            try {
              SoundManager.play('click')
              await join(name, code, avatar)
              setScreen('room')
            } catch {
              // error in hook
            }
          }}
          onBack={() => {
            setError('')
            setScreen('landing')
          }}
        />
      )}

      {session &&
        (session.room.status === 'waiting' ||
          session.room.status === 'starting') && (
          <LobbyScreen
            session={session}
            busy={busy}
            error={error}
            onUpdateSettings={(settings) =>
              void actions?.updateSettings(settings)
            }
            onToggleReady={() => {
              SoundManager.play('click')
              void actions?.toggleReady()
            }}
            onToggleMic={() => void actions?.toggleMic()}
            onToggleCamera={() => void actions?.toggleCamera()}
            onKick={(id) => void actions?.kick(id)}
            onStart={() => {
              SoundManager.play('reveal')
              void actions?.startGame().catch((e: Error) => setError(e.message))
            }}
            onToggleAutoMode={(autoMode) =>
              void actions?.updateSettings({
                ...session.room.settings,
                autoMode,
              })
            }
          />
        )}

      {session &&
        (session.room.status === 'finished' ||
          session.state.status === 'finished') && (
          <SummaryScreen
            session={session}
            onPlayAgain={() => void actions?.playAgain()}
          />
        )}

      {session &&
        session.isHost &&
        session.room.status !== 'waiting' &&
        session.room.status !== 'starting' &&
        session.room.status !== 'finished' &&
        session.state.status !== 'finished' && (
          <HostDashboard
            session={session}
            voiceConnection={voice.connection}
            onPause={(paused) => void actions?.pause(paused)}
            onSkip={() => void actions?.skipPhase()}
            onEnd={() => void actions?.playAgain()}
            onAddTime={(sec) => void actions?.addDiscussionTime(sec)}
            onMuteAll={(on) => void actions?.muteAll(on)}
            onAckHand={(id) => void actions?.acknowledgeHand(id)}
            onGrantSpeak={(id) => void actions?.grantSpeak(id)}
            onClearSpeaker={() => void actions?.clearSpeaker()}
            onHostMute={(id, muted) => void actions?.hostMutePlayer(id, muted)}
            onLockVoice={(locked) => void actions?.lockVoice(locked)}
            onBreakTie={(id) => void actions?.breakTie(id)}
            onToggleVoice={(voiceEnabled) =>
              void actions?.updateSettings({
                ...session.room.settings,
                voiceEnabled,
              })
            }
            onToggleVideo={(videoEnabled) =>
              void actions?.updateSettings({
                ...session.room.settings,
                videoEnabled,
                mediaMode: videoEnabled ? 'voice_video' : 'voice_only',
              })
            }
          />
        )}

      {session &&
        !session.isHost &&
        session.room.status !== 'waiting' &&
        session.room.status !== 'starting' &&
        session.room.status !== 'finished' &&
        session.state.status !== 'finished' && (
          <PlayerGameView
            session={session}
            onToggleHand={() => void actions?.toggleHand()}
            onToggleMic={() => void actions?.toggleMic()}
            onToggleCamera={() => void actions?.toggleCamera()}
            onVote={(id) => {
              SoundManager.play('vote')
              void actions?.vote(id)
            }}
            onNightAction={(id) => void actions?.nightAction(id)}
          />
        )}

      <ImmersionLayer
        showNight={immersion.showNightOverlay}
        showRoleReveal={immersion.showRoleReveal}
        showVoteBanner={immersion.showVoteOverlay}
        countdownUrgent={immersion.countdownUrgent}
        secondsLeft={secondsLeft}
        role={immersion.roleForReveal}
        reducedMotion={session?.room.settings.reducedMotion}
        onDismissRole={immersion.dismissRoleReveal}
      />

      {pttVisible && (
        <button
          type="button"
          className={`fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full px-8 py-4 text-sm font-bold shadow-mw-blue transition ${
            voice.pushToTalk
              ? 'bg-mw-primary text-mw-bg'
              : 'bg-mw-secondary/90 text-mw-text ring-1 ring-white/20'
          }`}
          onPointerDown={() => voice.holdPushToTalk(true)}
          onPointerUp={() => voice.holdPushToTalk(false)}
          onPointerLeave={() => voice.holdPushToTalk(false)}
        >
          <Mic className="h-5 w-5" />
          Hold to Talk
        </button>
      )}
    </>
  )
}
