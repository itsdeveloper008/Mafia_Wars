import type { Role } from './types'

function shuffle<T>(array: T[]): T[] {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Build a balanced role deck for the given player count.
 * Host is never included — only real players receive roles.
 */
export function buildRoleDeck(
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
      'Civilian',
    )
    if (options.includeGrandma) {
      roles[roles.length - 1] = 'Grandma'
    }
  } else if (playerCount <= 8) {
    roles.push('Mafia', 'Mafia', 'Doctor', 'Detective')
    if (options.includeGrandma) roles.push('Grandma')
    else roles.push('Civilian')
    if (options.includeJester) roles.push('Jester')
    else roles.push('Civilian')
    roles.push('Civilian', 'Civilian')
  } else if (playerCount <= 9) {
    roles.push('Mafia', 'Mafia', 'Doctor', 'Detective')
    if (options.includeGrandma) roles.push('Grandma')
    else roles.push('Civilian')
    if (options.includeJester) roles.push('Jester')
    else roles.push('Civilian')
    roles.push('Civilian', 'Civilian', 'Civilian')
  } else {
    // 10+
    const mafiaCount = Math.min(3, Math.floor(playerCount / 4))
    for (let i = 0; i < mafiaCount; i++) roles.push('Mafia')
    if (options.includeGodfather) {
      roles.push('Godfather')
    } else {
      roles.push('Mafia')
    }
    roles.push('Doctor', 'Detective')
    if (options.includeGrandma) roles.push('Grandma')
    if (options.includeJester) roles.push('Jester')
    while (roles.length < playerCount) roles.push('Civilian')
  }

  while (roles.length < playerCount) roles.push('Civilian')
  if (roles.length > playerCount) roles.length = playerCount

  return shuffle(roles)
}

export function isMafiaTeam(role?: Role): boolean {
  return role === 'Mafia' || role === 'Godfather'
}

export function isTownTeam(role?: Role): boolean {
  return (
    role === 'Civilian' ||
    role === 'Doctor' ||
    role === 'Detective' ||
    role === 'Grandma'
  )
}

export function detectiveResult(role?: Role): 'Suspicious' | 'Innocent' {
  if (role === 'Godfather') return 'Innocent'
  if (role === 'Mafia' || role === 'Jester') return 'Suspicious'
  return 'Innocent'
}
