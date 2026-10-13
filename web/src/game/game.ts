// The state of the game screen and how it changes (R4, R7, R9), as a "reducer":
// a pure function (state, action) -> new state. React's useReducer calls it for every action.
// It has no timers and no randomness, so tests can check every step without waiting.
import { newMatch, playRound, type Match, type Round } from './match'
import type { Decision } from './readSign'
import type { Sign } from './signs'

// R4: the countdown steps, about 1 second each. "Shoot!" is the moment the sign is read.
export const COUNTDOWN = ['3', '2', '1', 'Shoot!'] as const
export const STEP_MS = 1000

export type Phase =
  | { kind: 'idle' } // waiting for "Play"
  | { kind: 'countdown'; step: number } // showing COUNTDOWN[step]: 0 = "3", 1 = "2", 2 = "1"
  | { kind: 'result'; round: Round } // a round was played: show both signs and who won
  | { kind: 'redo'; reason: 'no-hand' | 'unsure' } // R7: the round must be redone

export interface GameState {
  match: Match
  phase: Phase
}

export type GameAction =
  | { type: 'play' } // the "Play" button or Space (R4)
  | { type: 'tick' } // one countdown step has passed
  | { type: 'shoot'; decision: Decision; computer: Sign } // "Shoot!": my sign was read
  | { type: 'playAgain' } // R9

export const initialGame: GameState = { match: newMatch(), phase: { kind: 'idle' } }

// A round can start when no countdown is running and the match is not over.
export function canPlay(state: GameState): boolean {
  return state.phase.kind !== 'countdown' && state.match.winner === null
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'play':
      if (!canPlay(state)) return state // e.g. Space pressed again during the countdown
      return { ...state, phase: { kind: 'countdown', step: 0 } }

    case 'tick':
      if (state.phase.kind !== 'countdown') return state
      // The last tick is replaced by 'shoot', so the step stops at "1".
      return { ...state, phase: { kind: 'countdown', step: Math.min(state.phase.step + 1, 2) } }

    case 'shoot': {
      if (state.phase.kind !== 'countdown') return state
      // R7: no hand or unsure -> redo the round. The match doesn't change: no point, no history.
      if (action.decision.kind === 'redo') {
        return { ...state, phase: { kind: 'redo', reason: action.decision.reason } }
      }
      const match = playRound(state.match, action.decision.sign, action.computer)
      // The round just played is the last one of the history.
      return { match, phase: { kind: 'result', round: match.rounds[match.rounds.length - 1] } }
    }

    case 'playAgain':
      return initialGame // R9: score and history reset
  }
}
