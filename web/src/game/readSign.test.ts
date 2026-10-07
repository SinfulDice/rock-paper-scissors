import { describe, expect, it } from 'vitest'
import { averagePrediction, decide, type Frame } from './readSign'
import type { Prediction } from './signs'

const ROCK: Prediction = { rock: 0.9, paper: 0.06, scissors: 0.04 }
const PAPER: Prediction = { rock: 0.06, paper: 0.9, scissors: 0.04 }

describe('R5: average over the last 0.3 s before "Shoot!"', () => {
  it('R5: averages all frames with a hand inside the window', () => {
    const frames: Frame[] = [
      { time: 800, prediction: ROCK },
      { time: 900, prediction: PAPER },
    ]
    const avg = averagePrediction(frames, 1000)!
    expect(avg.rock).toBeCloseTo(0.48)
    expect(avg.paper).toBeCloseTo(0.48)
  })

  it('R5: ignores frames older than 0.3 s or after "Shoot!"', () => {
    const frames: Frame[] = [
      { time: 600, prediction: PAPER }, // too old
      { time: 900, prediction: ROCK },
      { time: 1100, prediction: PAPER }, // after Shoot!
    ]
    expect(averagePrediction(frames, 1000)).toEqual(ROCK)
  })

  it('R5 + R7: no frame with a hand in the window means "no hand"', () => {
    expect(averagePrediction([], 1000)).toBeNull()
    expect(averagePrediction([{ time: 900, prediction: null }], 1000)).toBeNull()
  })

  it('R5 + R7: a hand seen in fewer than half of the frames means "no hand"', () => {
    const frames: Frame[] = [
      { time: 800, prediction: null },
      { time: 900, prediction: null },
      { time: 1000, prediction: ROCK },
    ]
    expect(averagePrediction(frames, 1000)).toBeNull()
  })
})

describe('R6 + R7: accept the sign or redo the round', () => {
  it('R6: a sign with at least 70% confidence is accepted', () => {
    expect(decide(ROCK)).toEqual({ kind: 'sign', sign: 'rock' })
    expect(decide({ rock: 0.15, paper: 0.15, scissors: 0.7 })).toEqual({
      kind: 'sign',
      sign: 'scissors',
    })
  })

  it('R7: below 70% the round is redone (unsure)', () => {
    expect(decide({ rock: 0.69, paper: 0.21, scissors: 0.1 })).toEqual({
      kind: 'redo',
      reason: 'unsure',
    })
  })

  it('R7: no hand means the round is redone (no hand)', () => {
    expect(decide(null)).toEqual({ kind: 'redo', reason: 'no-hand' })
  })
})
