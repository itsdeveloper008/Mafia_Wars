import { describe, expect, it } from 'vitest'
import type { PlayerDoc, Role } from '@/types/game'
import { WinManager } from '../WinManager'

function player(id: string, alive = true): PlayerDoc {
  return {
    playerId: id,
    uid: id,
    displayName: id,
    avatar: 'default',
    joinedAt: 0,
    isAlive: alive,
    isConnected: true,
    isReady: true,
    hasVoted: false,
    raisedHand: false,
    raisedHandAt: null,
    micEnabled: false,
    cameraEnabled: false,
    isHost: false,
    isSpectator: !alive,
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

describe('WinManager', () => {
  it('civilians win when no mafia remain', () => {
    const players = [player('a'), player('b')]
    const roles = new Map<string, Role>([
      ['a', 'Civilian'],
      ['b', 'Detective'],
    ])
    expect(WinManager.evaluate(players, roles)).toBe('civilians')
  })

  it('mafia win when they equal or outnumber town', () => {
    const players = [player('a'), player('b')]
    const roles = new Map<string, Role>([
      ['a', 'Mafia'],
      ['b', 'Civilian'],
    ])
    expect(WinManager.evaluate(players, roles)).toBe('mafia')
  })

  it('detects jester elimination', () => {
    expect(WinManager.jesterWin('Jester')).toBe(true)
    expect(WinManager.jesterWin('Mafia')).toBe(false)
  })
})
