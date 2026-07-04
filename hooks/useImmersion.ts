'use client'

import { useEffect, useRef, useState } from 'react'
import { Narrator } from '@/services/audio/Narrator'
import { SoundManager } from '@/services/audio/SoundManager'
import type { GameSession, Role, RoomStatus } from '@/types/game'

export function useImmersion(session: GameSession | null) {
  const [showNightOverlay, setShowNightOverlay] = useState(false)
  const [showRoleReveal, setShowRoleReveal] = useState(false)
  const [showVoteOverlay, setShowVoteOverlay] = useState(false)
  const [countdownUrgent, setCountdownUrgent] = useState(false)
  const prevStatus = useRef<RoomStatus | null>(null)
  const revealedRef = useRef(false)

  useEffect(() => {
    if (!session) return
    const { room, state, mySecret, isHost } = session
    SoundManager.setEnabled(room.settings.soundEnabled, room.settings.musicEnabled)
    Narrator.configure(room.settings.soundEnabled, room.settings.narratorStyle)

    const status = state.status
    if (prevStatus.current === status) return

    // Music by phase
    if (status === 'waiting') SoundManager.setMusic('lobby')
    else if (status === 'discussion') SoundManager.setMusic('discussion')
    else if (status === 'voting') SoundManager.setMusic('voting')
    else if (status === 'night') SoundManager.setMusic('night')
    else if (status === 'finished') {
      if (state.winner === 'civilians') SoundManager.setMusic('victory')
      else SoundManager.setMusic('defeat')
    }

    // Narrator + overlays
    if (status === 'night') {
      setShowNightOverlay(true)
      SoundManager.play('heartbeat')
      Narrator.announcePhase('night')
      window.setTimeout(() => setShowNightOverlay(false), 2800)
    } else if (status === 'morning') {
      Narrator.announcePhase('morning', state.morningMessage)
      SoundManager.play('phase')
    } else if (status === 'discussion') {
      Narrator.announcePhase('discussion')
    } else if (status === 'voting') {
      setShowVoteOverlay(true)
      Narrator.announcePhase('voting')
      SoundManager.play('vote')
    } else if (status === 'role_reveal') {
      if (!isHost && mySecret?.role && !revealedRef.current) {
        setShowRoleReveal(true)
        SoundManager.play('reveal')
        Narrator.announceRole(mySecret.role)
      }
    } else if (status === 'finished') {
      Narrator.announceWinner(state.winner)
      SoundManager.play(state.winner === 'civilians' ? 'victory' : 'defeat')
    } else if (status === 'elimination') {
      SoundManager.play('death')
    }

    if (status !== 'voting') setShowVoteOverlay(false)
    prevStatus.current = status
  }, [session])

  // Urgent countdown
  useEffect(() => {
    if (!session) return
    const { state, room } = session
    if (!state.timerStartedAt || room.paused) {
      setCountdownUrgent(false)
      return
    }
    const id = window.setInterval(() => {
      const left = Math.ceil(
        (state.timerStartedAt! + state.timerDurationMs - Date.now()) / 1000,
      )
      setCountdownUrgent(left > 0 && left <= 10)
      if (left > 0 && left <= 10) SoundManager.play('tick')
      if (left > 0 && left <= 3) SoundManager.play('countdown')
    }, 1000)
    return () => window.clearInterval(id)
  }, [session?.state.timerStartedAt, session?.state.timerDurationMs, session?.room.paused])

  function dismissRoleReveal() {
    setShowRoleReveal(false)
    revealedRef.current = true
    SoundManager.play('flip')
  }

  return {
    showNightOverlay,
    showRoleReveal,
    showVoteOverlay,
    countdownUrgent,
    dismissRoleReveal,
    roleForReveal: session?.mySecret?.role as Role | undefined,
  }
}
