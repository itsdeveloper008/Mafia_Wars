import { isMafiaTeam } from '@/constants/roles'
import type { PlayerDoc, Role, Winner } from '@/types/game'

export class WinManager {
  static evaluate(
    players: PlayerDoc[],
    secrets: Map<string, Role>,
  ): Winner {
    const alive = players.filter((p) => p.isAlive && !p.isSpectator)
    const mafiaAlive = alive.filter((p) =>
      isMafiaTeam(secrets.get(p.playerId)),
    ).length
    const nonMafia = alive.length - mafiaAlive

    if (mafiaAlive === 0) return 'civilians'
    if (mafiaAlive >= nonMafia) return 'mafia'
    return null
  }

  static jesterWin(eliminatedRole?: Role | null): boolean {
    return eliminatedRole === 'Jester'
  }
}
