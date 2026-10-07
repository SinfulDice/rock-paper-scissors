import { describe, expect, it } from 'vitest'
import { newMatch, playRound, roundResult, type Match } from './match'
import type { Sign } from './signs'

// Helper: plays several rounds in a row, e.g. play([['rock', 'scissors'], ...]).
function play(rounds: [Sign, Sign][]): Match {
  return rounds.reduce((m, [player, computer]) => playRound(m, player, computer), newMatch())
}

describe('R2: who wins a round', () => {
  it('R2: rock beats scissors, scissors beats paper, paper beats rock', () => {
    expect(roundResult('rock', 'scissors')).toBe('win')
    expect(roundResult('scissors', 'paper')).toBe('win')
    expect(roundResult('paper', 'rock')).toBe('win')
  })

  it('R2: the opposite pairs are losses', () => {
    expect(roundResult('scissors', 'rock')).toBe('loss')
    expect(roundResult('paper', 'scissors')).toBe('loss')
    expect(roundResult('rock', 'paper')).toBe('loss')
  })

  it('R2: the same sign is a tie', () => {
    expect(roundResult('rock', 'rock')).toBe('tie')
    expect(roundResult('paper', 'paper')).toBe('tie')
    expect(roundResult('scissors', 'scissors')).toBe('tie')
  })
})

describe('R1: best of 5', () => {
  it('R1: the match is not over after 2 wins', () => {
    const m = play([['rock', 'scissors'], ['rock', 'scissors']])
    expect(m.playerScore).toBe(2)
    expect(m.winner).toBeNull()
  })

  it('R1: the player wins the match at 3 round wins', () => {
    const m = play([['rock', 'scissors'], ['rock', 'paper'], ['rock', 'scissors'], ['rock', 'scissors']])
    expect(m.playerScore).toBe(3)
    expect(m.computerScore).toBe(1)
    expect(m.winner).toBe('player')
  })

  it('R1: the computer wins the match at 3 round wins', () => {
    const m = play([['rock', 'paper'], ['rock', 'paper'], ['rock', 'paper']])
    expect(m.winner).toBe('computer')
  })

  it('R1: no round can be played once the match is over', () => {
    const m = play([['rock', 'paper'], ['rock', 'paper'], ['rock', 'paper']])
    expect(() => playRound(m, 'rock', 'paper')).toThrow()
  })
})

describe('R3: ties', () => {
  it('R3: a tie gives no point but is still a round of the match', () => {
    const m = play([['rock', 'rock']])
    expect(m.playerScore).toBe(0)
    expect(m.computerScore).toBe(0)
    expect(m.rounds).toHaveLength(1)
  })

  it('R3: ties do not count toward the 3 wins, so a match can last more than 5 rounds', () => {
    const m = play([
      ['rock', 'rock'], ['rock', 'rock'], ['rock', 'rock'],
      ['rock', 'scissors'], ['rock', 'scissors'],
    ])
    expect(m.rounds).toHaveLength(5)
    expect(m.winner).toBeNull()
  })
})

describe('R14: round history', () => {
  it('R14: each round keeps my sign, the computer sign and the result, oldest first', () => {
    const m = play([['rock', 'scissors'], ['paper', 'scissors']])
    expect(m.rounds).toEqual([
      { player: 'rock', computer: 'scissors', result: 'win' },
      { player: 'paper', computer: 'scissors', result: 'loss' },
    ])
  })
})

describe('R9: play again', () => {
  it('R9: a new match starts with no score, no history and no winner', () => {
    expect(newMatch()).toEqual({ rounds: [], playerScore: 0, computerScore: 0, winner: null })
  })

  it('R9: playing a round does not change the previous match object', () => {
    const before = newMatch()
    playRound(before, 'rock', 'scissors')
    expect(before.playerScore).toBe(0)
  })
})
