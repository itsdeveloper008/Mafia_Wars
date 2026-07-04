export type Role =
  | 'Civilian'
  | 'Mafia'
  | 'Doctor'
  | 'Detective'
  | 'Grandma'
  | 'Godfather'
  | 'Jester'

export type RoomMode = 'lobby' | 'game' | 'summary'

export type GamePhase =
  | 'night'
  | 'morning'
  | 'discussion'
  | 'voting'
  | 'result'

export type NightStep = 'doctor' | 'detective' | 'mafia' | 'resolve'

export type Winner =
  | 'civilians'
  | 'mafia'
  | 'jester'
  | null

export type ConnectionQuality = 'good' | 'ok' | 'poor' | 'offline'

export interface Player {
  id: string
  name: string
  avatar: string
  ready: boolean
  connected: boolean
  connectionQuality: ConnectionQuality
  micOn: boolean
  cameraOn: boolean
  handRaised: boolean
  alive: boolean
  role?: Role
  lastWill: string
  missedVotes: number
}

export interface GameSettings {
  discussionSec: number
  votingSec: number
  nightSec: number
  voiceEnabled: boolean
  videoEnabled: boolean
  includeGodfather: boolean
  includeGrandma: boolean
  includeJester: boolean
  theme: 'dark' | 'light'
}

export interface PublicEvent {
  id: string
  round: number
  phase: GamePhase | 'system'
  message: string
  at: number
}

export interface PrivateLogEntry {
  id: string
  round: number
  kind: 'doctor' | 'detective' | 'system'
  message: string
  at: number
}

export interface NightActions {
  doctorSaveId?: string
  detectiveTargetId?: string
  /** mafia playerId -> target playerId */
  mafiaVotes: Record<string, string>
}

export interface RoomState {
  code: string
  hostId: string
  hostName: string
  roomName: string
  mode: RoomMode
  phase: GamePhase
  nightStep: NightStep
  round: number
  paused: boolean
  settings: GameSettings
  players: Player[]
  publicEvents: PublicEvent[]
  hostEvents: PublicEvent[]
  /** playerId -> private log entries */
  privateLogs: Record<string, PrivateLogEntry[]>
  nightActions: NightActions
  /** playerId -> targetId | abstain */
  votes: Record<string, string>
  phaseEndsAt: number | null
  winner: Winner
  morningMessage: string
  eliminatedThisRound: string | null
  createdAt: number
  updatedAt: number
}

export const DEFAULT_SETTINGS: GameSettings = {
  discussionSec: 90,
  votingSec: 45,
  nightSec: 60,
  voiceEnabled: true,
  videoEnabled: false,
  includeGodfather: true,
  includeGrandma: true,
  includeJester: true,
  theme: 'dark',
}

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

export const AVATARS = [
  '🕵️',
  '🧔',
  '👩',
  '👴',
  '👮',
  '🎩',
  '🧙',
  '🦹',
  '🦊',
  '🐺',
  '🦅',
  '🐉',
]
