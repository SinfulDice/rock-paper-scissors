import { describe, expect, it } from 'vitest'
import type { TrackedHand } from '../ai/handTracker'
import type { Point } from '../ai/normalize'
import {
  countByClass,
  datasetFileName,
  emptyRecorder,
  onFrame,
  toDatasetJson,
  type RecorderState,
} from './recorder'

const HAND: TrackedHand = {
  handedness: 'Right',
  worldPoints: Array.from({ length: 21 }, (_, i) => [i * 0.01, 0.123456789, 0] as Point),
  imagePoints: Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 })),
}

// Simulates frames every `stepMs` ms for `durationMs` ms, with Space held and a hand visible.
function hold(durationMs: number, stepMs: number, hand: TrackedHand | null = HAND): RecorderState {
  let state = emptyRecorder
  for (let now = 0; now < durationMs; now += stepMs) {
    state = onFrame(state, { recording: true, label: 'rock', hand, now })
  }
  return state
}

describe('R29: recording while Space is held', () => {
  it('R29: about 10 samples per second, even with a fast camera (60 frames/s)', () => {
    expect(hold(1000, 1000 / 60).samples).toHaveLength(10)
  })

  it('R29: nothing is recorded when Space is not held', () => {
    const state = onFrame(emptyRecorder, { recording: false, label: 'rock', hand: HAND, now: 0 })
    expect(state.samples).toHaveLength(0)
  })

  it('R29: each sample gets the chosen class, and counts are per class', () => {
    let state = onFrame(emptyRecorder, { recording: true, label: 'paper', hand: HAND, now: 0 })
    state = onFrame(state, { recording: true, label: 'none', hand: HAND, now: 200 })
    expect(state.samples.map((s) => s.label)).toEqual(['paper', 'none'])
    expect(countByClass(state.samples)).toEqual({ rock: 0, paper: 1, scissors: 0, none: 1 })
  })
})

describe('R30: only with a hand', () => {
  it('R30: frames without a hand are not recorded', () => {
    expect(hold(1000, 1000 / 60, null).samples).toHaveLength(0)
  })
})

describe('R31: only numbers, saved as a file', () => {
  it('R31: a sample holds only the label, the hand side and 21 points of 3 numbers', () => {
    const [sample] = hold(50, 10).samples
    expect(Object.keys(sample).sort()).toEqual(['handedness', 'label', 'points'])
    expect(sample.points).toHaveLength(21)
    for (const p of sample.points) {
      expect(p).toHaveLength(3)
      for (const v of p) expect(typeof v).toBe('number')
    }
  })

  it('R31: numbers are rounded to 6 decimals to keep the file small', () => {
    expect(hold(50, 10).samples[0].points[0][1]).toBe(0.123457)
  })

  it('R31: the file has a format name, a version, a date and the samples', () => {
    const json = JSON.parse(toDatasetJson(hold(50, 10).samples, new Date('2026-10-07T10:30:00Z')))
    expect(json.format).toBe('rps-landmarks')
    expect(json.version).toBe(1)
    expect(json.createdAt).toBe('2026-10-07T10:30:00.000Z')
    expect(json.samples).toHaveLength(1)
  })

  it('R31: the file name contains the date and no ":"', () => {
    expect(datasetFileName(new Date('2026-10-07T10:30:00Z'))).toBe('rps-samples-2026-10-07T10-30-00.json')
  })
})
