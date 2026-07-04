import type { PlayerDoc, VoteDoc } from '@/types/game'

export class VoteManager {
  /** Fill abstain for alive players who did not confirm a vote. */
  static finalizeVotes(
    players: PlayerDoc[],
    votes: Record<string, VoteDoc>,
  ): Record<string, VoteDoc> {
    const now = Date.now()
    const next = { ...votes }
    for (const p of players.filter((x) => x.isAlive && !x.isSpectator)) {
      if (!next[p.playerId]?.confirmed) {
        next[p.playerId] = {
          playerId: p.playerId,
          uid: p.uid,
          targetId: 'abstain',
          confirmed: true,
          at: now,
        }
      }
    }
    return next
  }

  static tally(votes: Record<string, VoteDoc>): {
    counts: Record<string, number>
    topIds: string[]
    isTie: boolean
  } {
    const counts: Record<string, number> = {}
    for (const v of Object.values(votes)) {
      if (v.targetId === 'abstain') continue
      counts[v.targetId] = (counts[v.targetId] ?? 0) + 1
    }
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (ranked.length === 0) {
      return { counts, topIds: [], isTie: false }
    }
    const topScore = ranked[0][1]
    const topIds = ranked.filter(([, n]) => n === topScore).map(([id]) => id)
    return { counts, topIds, isTie: topIds.length > 1 }
  }
}
