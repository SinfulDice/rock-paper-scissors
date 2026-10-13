import { describe, expect, it } from 'vitest'
import { canPlay, COUNTDOWN, gameReducer, initialGame, type GameAction, type GameState } from './game'

// Helper: applies several actions in a row, starting from a new game.
function run(actions: GameAction[], start: GameState = initialGame): GameState {
  return actions.reduce(gameReducer, start)
}

const countdown: GameAction[] = [{ type: 'play' }, { type: 'tick' }, { type: 'tick' }]
const rockVsScissors: GameAction = {
  type: 'shoot',
  decision: { kind: 'sign', sign: 'rock' },
  computer: 'scissors',
}
const winRound = [...countdown, rockVsScissors]

describe('R4: the countdown', () => {
  it('R4: shows "3", "2", "1", "Shoot!"', () => {
    expect(COUNTDOWN).toEqual(['3', '2', '1', 'Shoot!'])
  })

  it('R4: "Play" starts the countdown at "3", each tick moves to the next step', () => {
    expect(run([{ type: 'play' }]).phase).toEqual({ kind: 'countdown', step: 0 })
    expect(run(countdown).phase).toEqual({ kind: 'countdown', step: 2 })
  })

  it('R4: pressing "Play" again during the countdown does not restart it', () => {
    expect(run([{ type: 'play' }, { type: 'tick' }, { type: 'play' }]).phase).toEqual({
      kind: 'countdown',
      step: 1,
    })
  })

  it('R4: nothing can start while the countdown runs', () => {
    expect(canPlay(run([{ type: 'play' }]))).toBe(false)
    expect(canPlay(initialGame)).toBe(true)
  })
})

describe('R1 + R2 + R14: a round is played at "Shoot!"', () => {
  it('R2 + R14: my sign and the computer sign give a result, added to the history', () => {
    const state = run(winRound)
    expect(state.phase).toEqual({
      kind: 'result',
      round: { player: 'rock', computer: 'scissors', result: 'win' },
    })
    expect(state.match.playerScore).toBe(1)
    expect(state.match.rounds).toHaveLength(1)
  })

  it('R4: after a result, the next round can start', () => {
    expect(canPlay(run(winRound))).toBe(true)
  })

  it('R1: once the match is over, no round can start', () => {
    const state = run([...winRound, ...winRound, ...winRound])
    expect(state.match.winner).toBe('player')
    expect(canPlay(state)).toBe(false)
    expect(gameReducer(state, { type: 'play' })).toBe(state)
  })

  it('a "Shoot!" outside a countdown changes nothing', () => {
    expect(gameReducer(initialGame, rockVsScissors)).toBe(initialGame)
  })
})

describe('R7: a round with no hand or an unsure sign is redone', () => {
  it('R7: no hand -> redo, nobody gets a point, nothing in the history', () => {
    const state = run([...countdown, { type: 'shoot', decision: { kind: 'redo', reason: 'no-hand' }, computer: 'rock' }])
    expect(state.phase).toEqual({ kind: 'redo', reason: 'no-hand' })
    expect(state.match).toEqual(initialGame.match)
  })

  it('R7: unsure -> redo with its own reason, and the round can be played again', () => {
    const state = run([...countdown, { type: 'shoot', decision: { kind: 'redo', reason: 'unsure' }, computer: 'rock' }])
    expect(state.phase).toEqual({ kind: 'redo', reason: 'unsure' })
    expect(canPlay(state)).toBe(true)
  })
})

describe('R9: play again', () => {
  it('R9: resets the score, the history and the winner', () => {
    const state = run([...winRound, ...winRound, ...winRound, { type: 'playAgain' }])
    expect(state).toEqual(initialGame)
  })
})
