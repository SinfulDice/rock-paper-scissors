// Turns the model's predictions around "Shoot!" into a decision: a sign, or "redo the round".
import { CLASSES, type ModelClass, type Prediction, type Sign } from './signs'

export const AVERAGE_WINDOW_MS = 300 // R5
export const CONFIDENCE_THRESHOLD = 0.7 // R6

// One video frame: when it was seen (in ms) and the model's prediction,
// or null if MediaPipe found no hand in that frame.
export interface Frame {
  time: number
  prediction: Prediction | null
}

export type Decision =
  | { kind: 'sign'; sign: Sign }
  | { kind: 'redo'; reason: 'no-hand' | 'not-a-sign' | 'unsure' } // R7

// R5: averages the predictions of the frames in the last 300 ms before `shootTime`.
// Returns null ("no hand") if a hand was seen in fewer than half of those frames.
export function averagePrediction(frames: Frame[], shootTime: number): Prediction | null {
  const inWindow = frames.filter(
    (f) => f.time <= shootTime && f.time > shootTime - AVERAGE_WINDOW_MS,
  )
  const withHand = inWindow.filter((f) => f.prediction !== null)
  if (withHand.length === 0 || withHand.length < inWindow.length / 2) return null

  const average = { rock: 0, paper: 0, scissors: 0, none: 0 }
  for (const frame of withHand) {
    for (const c of CLASSES) average[c] += frame.prediction![c] / withHand.length
  }
  return average
}

// R6 + R7: accept the most likely class only if it's a real sign with at least 70% confidence.
export function decide(prediction: Prediction | null): Decision {
  if (prediction === null) return { kind: 'redo', reason: 'no-hand' }

  // Find the class with the highest confidence.
  let best: ModelClass = CLASSES[0]
  for (const c of CLASSES) if (prediction[c] > prediction[best]) best = c

  if (best === 'none') return { kind: 'redo', reason: 'not-a-sign' }
  if (prediction[best] < CONFIDENCE_THRESHOLD) return { kind: 'redo', reason: 'unsure' }
  return { kind: 'sign', sign: best }
}
