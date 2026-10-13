// R12: live bars showing what my model thinks of the current video frame.
import { CONFIDENCE_THRESHOLD } from '../game/readSign'
import { SIGNS, SIGN_LABELS, type Prediction } from '../game/signs'

// `prediction` is null when no hand is seen: the bars then go to 0.
export function PredictionBars({ prediction }: { prediction: Prediction | null }) {
  return (
    <section className="bars" aria-label="What the AI sees">
      <h2>What the AI sees</h2>
      {SIGNS.map((sign) => {
        const percent = Math.round((prediction?.[sign] ?? 0) * 100)
        // Highlight a sign that would be accepted at "Shoot!" (R6: at least 70%).
        const sure = prediction !== null && prediction[sign] >= CONFIDENCE_THRESHOLD
        return (
          <div key={sign} className="bar-row">
            <span>{SIGN_LABELS[sign]}</span>
            <span className="bar-percent">{percent}%</span>
            {/* role="meter" tells screen readers this is a value in a range (here 0–100). */}
            <div
              className="bar"
              role="meter"
              aria-label={SIGN_LABELS[sign]}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className={sure ? 'bar-fill sure' : 'bar-fill'} style={{ width: `${percent}%` }} />
            </div>
          </div>
        )
      })}
      {prediction === null && <p className="muted">No hand detected</p>}
    </section>
  )
}
