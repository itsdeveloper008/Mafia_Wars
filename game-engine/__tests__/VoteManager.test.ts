import { describe, expect, it } from 'vitest'
import type { PlayerDoc, VoteDoc } from '@/types/game'
import { VoteManager } from '../VoteManager'

function player(id: string): PlayerDoc {
  return {
    playerId: id,
    uid: id,
    displayName: id,
    avatar: 'default',
    joinedAt: 0,
    isAlive: true,
    isConnected: true,
    isReady: true,
    hasVoted: false,
    raisedHand: false,
    raisedHandAt: null,
    micEnabled: false,
    cameraEnabled: false,
    isHost: false,
    isSpectator: false,
    voteTarget: null,
    notes: '',
    connectionQuality: 'good',
    missedVotes: 0,
    isSpeaking: false,
    canSpeak: true,
    hostMuted: false,
    pushToTalkHeld: false,
  }
}

describe('VoteManager', () => {
  it('fills abstain for missing votes', () => {
    const players = [player('a'), player('b')]
    const votes: Record<string, VoteDoc> = {
      a: {
        playerId: 'a',
        uid: 'a',
        targetId: 'b',
        confirmed: true,
        at: 1,
      },
    }
    const finalized = VoteManager.finalizeVotes(players, votes)
    expect(finalized.b.targetId).toBe('abstain')
    expect(finalized.a.targetId).toBe('b')
  })

  it('detects ties', () => {
    const votes: Record<string, VoteDoc> = {
      a: { playerId: 'a', uid: 'a', targetId: 'c', confirmed: true, at: 1 },
      b: { playerId: 'b', uid: 'b', targetId: 'd', confirmed: true, at: 1 },
    }
    const { isTie, topIds } = VoteManager.tally(votes)
    expect(isTie).toBe(true)
    expect(topIds).toHaveLength(2)
  })
})
