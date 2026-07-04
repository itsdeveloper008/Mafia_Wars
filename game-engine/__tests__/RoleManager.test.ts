import { describe, expect, it } from 'vitest'
import { RoleManager } from '../RoleManager'

describe('RoleManager', () => {
  it('requires at least 4 players', () => {
    expect(() =>
      RoleManager.generateRoles(3, {
        includeGodfather: false,
        includeGrandma: false,
        includeJester: false,
      }),
    ).toThrow(/4 players/)
  })

  it('returns exact player count', () => {
    for (const n of [4, 6, 8, 10, 12]) {
      const roles = RoleManager.generateRoles(n, {
        includeGodfather: true,
        includeGrandma: true,
        includeJester: true,
      })
      expect(roles).toHaveLength(n)
    }
  })

  it('includes mafia and detective for 4 players', () => {
    const roles = RoleManager.generateRoles(4, {
      includeGodfather: false,
      includeGrandma: false,
      includeJester: false,
    })
    expect(roles).toContain('Mafia')
    expect(roles).toContain('Detective')
  })

  it('marks godfather innocent to detective', () => {
    expect(RoleManager.detectiveResult('Godfather')).toBe('Innocent')
    expect(RoleManager.detectiveResult('Mafia')).toBe('Suspicious')
    expect(RoleManager.detectiveResult('Civilian')).toBe('Innocent')
  })
})
