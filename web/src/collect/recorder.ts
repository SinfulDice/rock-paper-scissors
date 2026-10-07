// The rules of the collect page, without any camera or React, so they're easy to test.
import type { TrackedHand } from '../ai/handTracker'
import type { Handedness, Point } from '../ai/normalize'
import type { RecordLabel } from '../game/signs'

export const SAMPLE_INTERVAL_MS = 100 // R29: at most 1 sample every 100 ms = about 10 per second

// One training example: what you were showing (the label) + the raw hand points.
// R31: only numbers and labels, never an image.
export interface Sample {
  label: RecordLabel
  handedness: Handedness
  points: Point[]
}

export interface RecorderState {
  samples: Sample[]
  lastRecordTime: number | null // when the last sample was taken (ms), null = never
}

export const emptyRecorder: RecorderState = { samples: [], lastRecordTime: null }

// What happens on each video frame. Returns the same state if nothing is recorded.
export function onFrame(
  state: RecorderState,
  frame: { recording: boolean; label: RecordLabel; hand: TrackedHand | null; now: number },
): RecorderState {
  if (!frame.recording) return state // Space isn't held
  if (frame.hand === null) return state // R30: no hand, nothing to record
  if (state.lastRecordTime !== null && frame.now - state.lastRecordTime < SAMPLE_INTERVAL_MS) {
    return state // R29: too soon after the last sample
  }
  const sample: Sample = {
    label: frame.label,
    handedness: frame.hand.handedness,
    // 6 decimals = a thousandth of a millimeter: precise enough, and keeps the file small.
    points: frame.hand.worldPoints.map((p) => p.map((v) => Number(v.toFixed(6))) as Point),
  }
  return { samples: [...state.samples, sample], lastRecordTime: frame.now }
}

// How many samples of each label, e.g. { rock: 210, paper: 0, scissors: 0, none: 3 }.
export function countByClass(samples: Sample[]): Record<RecordLabel, number> {
  const counts = { rock: 0, paper: 0, scissors: 0, none: 0 }
  for (const s of samples) counts[s.label]++
  return counts
}

// R31: the downloaded file. `format` and `version` let the Python side check what it reads.
export function toDatasetJson(samples: Sample[], now: Date): string {
  return JSON.stringify({ format: 'rps-landmarks', version: 1, createdAt: now.toISOString(), samples })
}

// e.g. "rps-samples-2026-10-07T10-30-00.json" (":" isn't allowed in file names on Windows).
export function datasetFileName(now: Date): string {
  return `rps-samples-${now.toISOString().slice(0, 19).replaceAll(':', '-')}.json`
}

