// R13: the score, and R14: the round history.
import { WINS_NEEDED, type Match, type RoundResult } from '../game/match'
import { SIGN_LABELS } from '../game/signs'

export function Score({ match }: { match: Match }) {
  return (
    <section className="score" aria-label="Score">
      <div>
        <span className="score-name">You</span>
        <span className="score-value">{match.playerScore}</span>
      </div>
      <span className="score-sep">–</span>
      <div>
        <span className="score-value">{match.computerScore}</span>
        <span className="score-name">Computer</span>
      </div>
      <p className="muted score-goal">First to {WINS_NEEDED} wins</p>
    </section>
  )
}

const RESULT_TEXT: Record<RoundResult, string> = { win: 'Win', loss: 'Loss', tie: 'Tie' }

export function History({ match }: { match: Match }) {
  if (match.rounds.length === 0) return null
  return (
    <section className="history">
      <h2>Rounds</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">You</th>
            <th scope="col">Computer</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {match.rounds.map((round, i) => (
            // The round number is a good `key`: rounds are only ever added at the end.
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{SIGN_LABELS[round.player]}</td>
              <td>{SIGN_LABELS[round.computer]}</td>
              <td className={`result-${round.result}`}>{RESULT_TEXT[round.result]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
