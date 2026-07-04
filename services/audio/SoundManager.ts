'use client'

type Sfx =
  | 'click'
  | 'hover'
  | 'tick'
  | 'countdown'
  | 'vote'
  | 'reveal'
  | 'flip'
  | 'heartbeat'
  | 'death'
  | 'victory'
  | 'defeat'
  | 'phase'

type MusicMood = 'lobby' | 'discussion' | 'voting' | 'night' | 'victory' | 'defeat' | 'off'

/**
 * Procedural audio — no external assets required.
 * Ready to swap in real files under /public/audio later.
 */
class SoundManagerImpl {
  private ctx: AudioContext | null = null
  private master = 0.35
  private musicGain: GainNode | null = null
  private musicOsc: OscillatorNode[] = []
  private soundEnabled = true
  private musicEnabled = true
  private mood: MusicMood = 'off'

  private ensure() {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.04
      this.musicGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  setEnabled(sound: boolean, music: boolean) {
    this.soundEnabled = sound
    this.musicEnabled = music
    if (!music) this.stopMusic()
  }

  play(sfx: Sfx) {
    if (!this.soundEnabled) return
    const ctx = this.ensure()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    const map: Record<Sfx, { f: number; d: number; type: OscillatorType }> = {
      click: { f: 520, d: 0.06, type: 'triangle' },
      hover: { f: 380, d: 0.04, type: 'sine' },
      tick: { f: 880, d: 0.05, type: 'square' },
      countdown: { f: 660, d: 0.12, type: 'sawtooth' },
      vote: { f: 440, d: 0.15, type: 'triangle' },
      reveal: { f: 300, d: 0.35, type: 'sine' },
      flip: { f: 240, d: 0.2, type: 'triangle' },
      heartbeat: { f: 90, d: 0.18, type: 'sine' },
      death: { f: 70, d: 0.45, type: 'sawtooth' },
      victory: { f: 523, d: 0.4, type: 'triangle' },
      defeat: { f: 110, d: 0.5, type: 'sine' },
      phase: { f: 200, d: 0.3, type: 'sine' },
    }

    const conf = map[sfx]
    osc.type = conf.type
    osc.frequency.setValueAtTime(conf.f, now)
    if (sfx === 'victory') {
      osc.frequency.exponentialRampToValueAtTime(784, now + 0.25)
    }
    if (sfx === 'defeat' || sfx === 'death') {
      osc.frequency.exponentialRampToValueAtTime(40, now + conf.d)
    }

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(this.master * 0.5, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + conf.d)
    osc.start(now)
    osc.stop(now + conf.d + 0.02)
  }

  setMusic(mood: MusicMood) {
    if (mood === this.mood) return
    this.mood = mood
    this.stopMusic()
    if (!this.musicEnabled || mood === 'off') return
    const ctx = this.ensure()
    if (!ctx || !this.musicGain) return

    const chords: Record<Exclude<MusicMood, 'off'>, number[]> = {
      lobby: [196, 247, 294],
      discussion: [220, 277, 330],
      voting: [110, 130, 165],
      night: [98, 123, 147],
      victory: [262, 330, 392],
      defeat: [82, 98, 123],
    }

    const freqs = chords[mood]
    this.musicOsc = freqs.map((f, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = mood === 'night' || mood === 'voting' ? 'sine' : 'triangle'
      osc.frequency.value = f
      g.gain.value = 0.25 / freqs.length
      osc.connect(g)
      g.connect(this.musicGain!)
      osc.start()
      // subtle LFO feel via detune
      osc.detune.value = i * 3
      return osc
    })
  }

  stopMusic() {
    for (const o of this.musicOsc) {
      try {
        o.stop()
      } catch {
        // ignore
      }
    }
    this.musicOsc = []
  }
}

export const SoundManager = new SoundManagerImpl()
