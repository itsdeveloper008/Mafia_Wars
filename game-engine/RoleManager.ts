import type { Role } from '@/types/game'

function shuffle<T>(array: T[]): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export class RoleManager {
  /** Generate a balanced role deck for player count (host excluded). */
  static generateRoles(
    playerCount: number,
    options: {
      includeGodfather: boolean
      includeGrandma: boolean
      includeJester: boolean
    },
  ): Role[] {
    if (playerCount < 4) {
      throw new Error('Need at least 4 players to start.')
    }

    const roles: Role[] = []

    if (playerCount <= 4) {
      roles.push('Mafia', 'Detective', 'Civilian', 'Civilian')
    } else if (playerCount <= 5) {
      roles.push('Mafia', 'Doctor', 'Detective', 'Civilian', 'Civilian')
    } else if (playerCount <= 6) {
      roles.push('Mafia', 'Mafia', 'Doctor', 'Detective', 'Civilian', 'Civilian')
    } else if (playerCount <= 7) {
      roles.push(
        'Mafia',
        'Mafia',
        'Doctor',
        'Detective',
        'Civilian',
        'Civilian',
        options.includeGrandma ? 'Grandma' : 'Civilian',
      )
    } else if (playerCount <= 8) {
      roles.push('Mafia', 'Mafia', 'Doctor', 'Detective')
      roles.push(options.includeGrandma ? 'Grandma' : 'Civilian')
      roles.push(options.includeJester ? 'Jester' : 'Civilian')
      roles.push('Civilian', 'Civilian')
    } else if (playerCount <= 9) {
      roles.push('Mafia', 'Mafia', 'Doctor', 'Detective')
      roles.push(options.includeGrandma ? 'Grandma' : 'Civilian')
      roles.push(options.includeJester ? 'Jester' : 'Civilian')
      roles.push('Civilian', 'Civilian', 'Civilian')
    } else {
      const mafiaCount = Math.min(3, Math.floor(playerCount / 4))
      for (let i = 0; i < mafiaCount; i++) roles.push('Mafia')
      roles.push(options.includeGodfather ? 'Godfather' : 'Mafia')
      roles.push('Doctor', 'Detective')
      if (options.includeGrandma) roles.push('Grandma')
      if (options.includeJester) roles.push('Jester')
      while (roles.length < playerCount) roles.push('Civilian')
    }

    while (roles.length < playerCount) roles.push('Civilian')
    if (roles.length > playerCount) roles.length = playerCount
    return shuffle(roles)
  }

  static detectiveResult(role?: Role | null): 'Suspicious' | 'Innocent' {
    if (role === 'Godfather') return 'Innocent'
    if (role === 'Mafia' || role === 'Jester') return 'Suspicious'
    return 'Innocent'
  }
}
