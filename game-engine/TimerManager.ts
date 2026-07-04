import type { RoomSettings, RoomStatus } from '@/types/game'

export class TimerManager {
  static durationMs(phase: RoomStatus, settings: RoomSettings): number {
    if (phase === 'discussion') return settings.discussionTime * 1000
    if (phase === 'voting') return settings.votingTime * 1000
    if (phase === 'night') return settings.nightTime * 1000
    if (phase === 'morning' || phase === 'role_reveal' || phase === 'elimination') {
      return 4000
    }
    return 0
  }

  static remainingMs(
    timerStartedAt: number | null,
    timerDurationMs: number,
    paused: boolean,
    now = Date.now(),
  ): number {
    if (!timerStartedAt || timerDurationMs <= 0) return 0
    if (paused) return timerDurationMs
    return Math.max(0, timerStartedAt + timerDurationMs - now)
  }

  static isExpired(
    timerStartedAt: number | null,
    timerDurationMs: number,
    paused: boolean,
    now = Date.now(),
  ): boolean {
    if (!timerStartedAt || timerDurationMs <= 0) return false
    if (paused) return false
    return now >= timerStartedAt + timerDurationMs
  }

  static start(phase: RoomStatus, settings: RoomSettings) {
    const timerDurationMs = this.durationMs(phase, settings)
    return {
      timerStartedAt: timerDurationMs > 0 ? Date.now() : null,
      timerDurationMs,
    }
  }
}
