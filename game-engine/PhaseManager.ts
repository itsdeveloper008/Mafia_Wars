import type { RoomStatus } from '@/types/game'

export class PhaseManager {
  static next(current: RoomStatus): RoomStatus | 'win_check' {
    switch (current) {
      case 'waiting':
      case 'starting':
        return 'role_reveal'
      case 'role_reveal':
        return 'night'
      case 'night':
        return 'morning'
      case 'morning':
        return 'discussion'
      case 'discussion':
        return 'voting'
      case 'voting':
        return 'elimination'
      case 'elimination':
        return 'win_check'
      case 'finished':
        return 'finished'
      default:
        return 'night'
    }
  }

  static afterWinCheck(hasWinner: boolean, currentRound: number): {
    status: RoomStatus
    currentRound: number
  } {
    if (hasWinner) return { status: 'finished', currentRound }
    return { status: 'night', currentRound: currentRound + 1 }
  }
}
