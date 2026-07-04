'use client'

import {
  NARRATOR_LINES,
  NARRATOR_ROLE_LINES,
  narratorPitch,
  narratorRate,
} from '@/constants/narrator'
import type { NarratorStyle, Role, RoomStatus } from '@/types/game'
import { SoundManager } from './SoundManager'

class NarratorImpl {
  private enabled = true
  private style: NarratorStyle = 'classic'

  configure(enabled: boolean, style: NarratorStyle) {
    this.enabled = enabled
    this.style = style
  }

  speak(text: string) {
    if (!this.enabled || typeof window === 'undefined') return
    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = narratorRate(this.style)
    utter.pitch = narratorPitch(this.style)
    utter.volume = 0.9

    const voices = window.speechSynthesis.getVoices()
    if (voices.length) {
      if (this.style === 'female') {
        utter.voice =
          voices.find((v) => /female|samantha|victoria|zira/i.test(v.name)) ??
          voices[0]
      } else if (this.style === 'deep' || this.style === 'dark') {
        utter.voice =
          voices.find((v) => /male|daniel|david|alex/i.test(v.name)) ??
          voices[0]
      } else if (this.style === 'robotic') {
        utter.voice =
          voices.find((v) => /google|microsoft|sam/i.test(v.name)) ?? voices[0]
      }
    }

    SoundManager.play('phase')
    window.speechSynthesis.speak(utter)
  }

  announcePhase(status: RoomStatus, morningMessage?: string) {
    if (status === 'morning') {
      if (morningMessage?.includes('dead')) {
        this.speak(NARRATOR_LINES.body_found)
      } else if (morningMessage?.includes('No one')) {
        this.speak(NARRATOR_LINES.no_death)
      } else {
        this.speak(NARRATOR_LINES.morning ?? 'Morning has arrived.')
      }
      return
    }
    const line = NARRATOR_LINES[status]
    if (line) this.speak(line)
  }

  announceRole(role: Role) {
    const line = NARRATOR_ROLE_LINES[role]
    if (line) this.speak(line)
  }

  announceWinner(winner: 'mafia' | 'civilians' | 'jester' | null) {
    if (winner === 'mafia') this.speak(NARRATOR_LINES.mafia_win)
    else if (winner === 'civilians') this.speak(NARRATOR_LINES.town_win)
    else if (winner === 'jester') this.speak(NARRATOR_LINES.jester_win)
  }
}

export const Narrator = new NarratorImpl()
