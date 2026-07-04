export type Role =
  | 'Civilian'
  | 'Mafia'
  | 'Doctor'
  | 'Detective'
  | 'Grandma'
  | 'Godfather'
  | 'Jester'

export type RoomStatus =
  | 'waiting'
  | 'starting'
  | 'role_reveal'
  | 'night'
  | 'morning'
  | 'discussion'
  | 'voting'
  | 'elimination'
  | 'finished'

export type NightStep = 'actions' | 'resolve'

export type Winner = 'civilians' | 'mafia' | 'jester' | null

export type ConnectionQuality = 'good' | 'ok' | 'poor' | 'offline'

export type TieBreakMode = 'host' | 'revote' | 'none'

export type DiscussionMode = 'free' | 'moderated' | 'push_to_talk'

export type NarratorStyle =
  | 'classic'
  | 'dark'
  | 'female'
  | 'deep'
  | 'robotic'

export type MediaMode = 'voice_only' | 'voice_video' | 'none'

export type GamePreset =
  | 'beginner'
  | 'competitive'
  | 'fast'
  | 'chaos'
  | 'custom'

export interface RoomSettings {
  voiceEnabled: boolean
  videoEnabled: boolean
  mediaMode: MediaMode
  discussionMode: DiscussionMode
  discussionTime: number
  votingTime: number
  nightTime: number
  maxPlayers: number
  autoMode: boolean
  includeGodfather: boolean
  includeGrandma: boolean
  includeJester: boolean
  tieBreakMode: TieBreakMode
  theme: 'dark' | 'light'
  anonymousMode: boolean
  spectatorVoiceEnabled: boolean
  forcePushToTalk: boolean
  voiceLocked: boolean
  narratorStyle: NarratorStyle
  soundEnabled: boolean
  musicEnabled: boolean
  reducedMotion: boolean
  preset: GamePreset
}

export interface RoomDoc {
  roomId: string
  roomCode: string
  hostId: string
  hostName: string
  roomName: string
  status: RoomStatus
  createdAt: number
  updatedAt: number
  currentRound: number
  currentPhase: RoomStatus
  playerCount: number
  settings: RoomSettings
  paused: boolean
  /** Moderated speaking queue (playerIds). */
  speakingQueue: string[]
  currentSpeakerId: string | null
}

export interface PlayerDoc {
  playerId: string
  uid: string
  displayName: string
  avatar: string
  joinedAt: number
  isAlive: boolean
  isConnected: boolean
  isReady: boolean
  hasVoted: boolean
  raisedHand: boolean
  raisedHandAt: number | null
  micEnabled: boolean
  cameraEnabled: boolean
  isHost: boolean
  isSpectator: boolean
  voteTarget: string | null
  notes: string
  connectionQuality: ConnectionQuality
  missedVotes: number
  isSpeaking: boolean
  canSpeak: boolean
  hostMuted: boolean
  pushToTalkHeld: boolean
}

/** Private — only host + owning player may read. */
export interface SecretDoc {
  playerId: string
  uid: string
  role: Role
  privateLogs: PrivateLogEntry[]
}

export interface GameStateDoc {
  roomId: string
  status: RoomStatus
  nightStep: NightStep
  currentRound: number
  timerStartedAt: number | null
  timerDurationMs: number
  winner: Winner
  morningMessage: string
  eliminatedPlayerId: string | null
  pendingTiePlayerIds: string[]
  updatedAt: number
}

export interface VoteDoc {
  playerId: string
  uid: string
  targetId: string | 'abstain'
  confirmed: boolean
  at: number
}

export interface NightActionDoc {
  playerId: string
  uid: string
  role: Role
  targetId: string
  at: number
}

export interface LogDoc {
  id: string
  round: number
  phase: RoomStatus | 'system'
  message: string
  at: number
  public: boolean
}

export interface PrivateLogEntry {
  id: string
  round: number
  kind: 'doctor' | 'detective' | 'system'
  message: string
  at: number
}

export interface MatchHistoryDoc {
  matchId: string
  roomId: string
  roomCode: string
  winner: Winner
  durationMs: number
  rounds: number
  players: Array<{
    uid: string
    displayName: string
    role: Role
    survived: boolean
  }>
  createdAt: number
}

export interface UserStatsDoc {
  uid: string
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  mafiaWins: number
  civilianWins: number
  longestWinStreak: number
  currentWinStreak: number
  totalPlayTimeMs: number
  favoriteRole: Role | null
  updatedAt: number
}

/** Composed client view — assembled from listeners, not stored as one doc. */
export interface GameSession {
  room: RoomDoc
  state: GameStateDoc
  players: PlayerDoc[]
  me?: PlayerDoc
  mySecret?: SecretDoc
  /** Host only */
  secrets: SecretDoc[]
  votes: Record<string, VoteDoc>
  nightActions: Record<string, NightActionDoc>
  publicLogs: LogDoc[]
  hostLogs: LogDoc[]
  isHost: boolean
  uid: string
}
