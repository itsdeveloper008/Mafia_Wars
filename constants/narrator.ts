import type { NarratorStyle, RoomStatus } from '@/types/game'

export const NARRATOR_LINES: Partial<Record<RoomStatus, string>> & {
  role_reveal_done: string
  body_found: string
  no_death: string
  mafia_win: string
  town_win: string
  jester_win: string
} = {
  role_reveal: 'The cards are dealt. Your fate is sealed.',
  role_reveal_done: 'Remember your role. Trust no one.',
  night: 'Night has fallen. The town falls silent.',
  morning: 'Morning has arrived.',
  body_found: 'A body has been discovered.',
  no_death: 'No one died last night. The town breathes again.',
  discussion: 'The town gathers to discuss.',
  voting: 'The voting begins. Choose carefully.',
  elimination: 'Judgment has been passed.',
  finished: 'The game is over.',
  mafia_win: 'The Mafia has won.',
  town_win: 'The Town has prevailed.',
  jester_win: 'The Jester claims victory.',
}

export const NARRATOR_ROLE_LINES = {
  Doctor: 'The Doctor awakens. You may protect one player.',
  Detective: 'The Detective awakens. You may investigate one player.',
  Mafia: 'The Mafia begins their hunt. Choose your victim.',
  Godfather: 'The Godfather awakens. Lead the family.',
  Grandma: 'Grandma rests… but her curse does not.',
  Jester: 'The Jester smiles in the dark.',
  Civilian: 'You are a Civilian. Survive the night.',
} as const

export function narratorPitch(style: NarratorStyle): number {
  switch (style) {
    case 'dark':
      return 0.75
    case 'female':
      return 1.15
    case 'deep':
      return 0.55
    case 'robotic':
      return 0.9
    default:
      return 1
  }
}

export function narratorRate(style: NarratorStyle): number {
  switch (style) {
    case 'dark':
      return 0.85
    case 'robotic':
      return 0.95
    case 'deep':
      return 0.8
    default:
      return 0.95
  }
}
