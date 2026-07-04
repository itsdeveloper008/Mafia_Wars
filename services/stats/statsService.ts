import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getDb } from '@/services/firebase/client'
import type { Role, UserStatsDoc, Winner } from '@/types/game'
import { logger } from '@/lib/logger'

function emptyStats(uid: string): UserStatsDoc {
  return {
    uid,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    mafiaWins: 0,
    civilianWins: 0,
    longestWinStreak: 0,
    currentWinStreak: 0,
    totalPlayTimeMs: 0,
    favoriteRole: null,
    updatedAt: Date.now(),
  }
}

export async function getUserStats(uid: string): Promise<UserStatsDoc> {
  const snap = await getDoc(doc(getDb(), 'statistics', uid))
  if (!snap.exists()) return emptyStats(uid)
  return snap.data() as UserStatsDoc
}

export async function recordMatchResult(input: {
  uid: string
  won: boolean
  winner: Winner
  role: Role
  durationMs: number
}): Promise<void> {
  const current = await getUserStats(input.uid)
  const currentWinStreak = input.won ? current.currentWinStreak + 1 : 0
  const next: UserStatsDoc = {
    ...current,
    gamesPlayed: current.gamesPlayed + 1,
    gamesWon: current.gamesWon + (input.won ? 1 : 0),
    gamesLost: current.gamesLost + (input.won ? 0 : 1),
    mafiaWins:
      current.mafiaWins + (input.won && input.winner === 'mafia' ? 1 : 0),
    civilianWins:
      current.civilianWins +
      (input.won && input.winner === 'civilians' ? 1 : 0),
    currentWinStreak,
    longestWinStreak: Math.max(current.longestWinStreak, currentWinStreak),
    totalPlayTimeMs: current.totalPlayTimeMs + input.durationMs,
    favoriteRole: input.role,
    updatedAt: Date.now(),
  }
  await setDoc(doc(getDb(), 'statistics', input.uid), next)
  logger.info('stats.recorded', { uid: input.uid, won: input.won })
}

/** Achievement ids — extend without schema changes. */
export const ACHIEVEMENTS = [
  'first_victory',
  'wins_10',
  'wins_100',
  'perfect_detective',
  'master_doctor',
  'silent_killer',
  'survivor',
  'jester_victory',
] as const

export type AchievementId = (typeof ACHIEVEMENTS)[number]
