import type { Role } from '@/types/game'

export const ROLE_INFO: Record<
  Role,
  { team: string; ability: string; active: boolean }
> = {
  Civilian: {
    team: 'Town',
    ability: 'Find and vote out the Mafia during the day.',
    active: false,
  },
  Mafia: {
    team: 'Mafia',
    ability: 'Each night, vote with your crew to eliminate one player.',
    active: true,
  },
  Doctor: {
    team: 'Town',
    ability: 'Protect one player each night. Success is private.',
    active: true,
  },
  Detective: {
    team: 'Town',
    ability: 'Investigate one player each night: Suspicious or Innocent.',
    active: true,
  },
  Grandma: {
    team: 'Town',
    ability: 'If killed by Mafia, one Mafia dies automatically.',
    active: false,
  },
  Godfather: {
    team: 'Mafia',
    ability: 'Leads the Mafia. Appears Innocent to the Detective.',
    active: true,
  },
  Jester: {
    team: 'Neutral',
    ability: 'Win immediately if the town votes you out.',
    active: false,
  },
}

export function isMafiaTeam(role?: Role | null): boolean {
  return role === 'Mafia' || role === 'Godfather'
}
