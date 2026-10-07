import { describe, expect, it } from 'vitest'
import { computerSign } from './computer'
import { SIGNS } from './signs'

describe('R8: the computer plays randomly', () => {
  it('R8: each third of the random range gives a different sign', () => {
    expect(computerSign(() => 0)).toBe('rock')
    expect(computerSign(() => 0.4)).toBe('paper')
    expect(computerSign(() => 0.99)).toBe('scissors')
  })

  it('R8: over many games, each sign comes out about 1/3 of the time', () => {
    const counts = { rock: 0, paper: 0, scissors: 0 }
    const games = 30_000
    for (let i = 0; i < games; i++) counts[computerSign()]++
    for (const sign of SIGNS) {
      // 1/3 = 0.333; allow ±0.02 because randomness is never perfectly even.
      expect(counts[sign] / games).toBeGreaterThan(0.313)
      expect(counts[sign] / games).toBeLessThan(0.353)
    }
  })

  it('R8: the choice does not take the player sign as input', () => {
    // computerSign has only one optional parameter (the random source), so it can't see your move.
    expect(computerSign.length).toBe(0)
  })
})
