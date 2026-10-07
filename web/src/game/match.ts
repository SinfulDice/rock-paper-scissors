// Match rules: who wins a round, the score, and when the match ends.
import type { Sign } from './signs'

export type RoundResult = 'win' | 'loss' | 'tie' // always from the player's point of view

// R2: each sign beats exactly one other sign.
const BEATS: Record<Sign, Sign> = {
  rock: 'scissors',
  scissors: 'paper',
  paper: 'rock',
}

export function roundResult(player: Sign, computer: Sign): RoundResult {
  if (player === computer) return 'tie'
  return BEATS[player] === computer ? 'win' : 'loss'
}

// R1: best of 5 = the first to win 3 rounds.
export const WINS_NEEDED = 3

export interface Round {
  player: Sign
  computer: Sign
  result: RoundResult
}

export interface Match {
  rounds: Round[] // R14: the round history, oldest first
  playerScore: number
  computerScore: number
  winner: 'player' | 'computer' | null // null while the match is still going
}

// R9: a fresh match (also used by "Play again").
export function newMatch(): Match {
  return { rounds: [], playerScore: 0, computerScore: 0, winner: null }
}

// Plays one round and returns a NEW match object instead of changing the old one.
// React needs this: it notices a change when it gets a new object.
export function playRound(match: Match, player: Sign, computer: Sign): Match {
  if (match.winner !== null) throw new Error('The match is already over')

  const result = roundResult(player, computer)
  // R3: a tie adds no point to anyone.
  const playerScore = match.playerScore + (result === 'win' ? 1 : 0)
  const computerScore = match.computerScore + (result === 'loss' ? 1 : 0)

  let winner: Match['winner'] = null
  if (playerScore === WINS_NEEDED) winner = 'player'
  if (computerScore === WINS_NEEDED) winner = 'computer'

  return {
    rounds: [...match.rounds, { player, computer, result }],
    playerScore,
    computerScore,
    winner,
  }
}
