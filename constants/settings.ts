import type { RoomSettings } from '@/types/game'

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  voiceEnabled: true,
  videoEnabled: false,
  discussionTime: 90,
  votingTime: 45,
  nightTime: 60,
  maxPlayers: 12,
  autoMode: true,
  includeGodfather: true,
  includeGrandma: true,
  includeJester: true,
  tieBreakMode: 'host',
  theme: 'dark',
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
