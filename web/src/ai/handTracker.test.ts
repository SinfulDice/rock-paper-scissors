import type { HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import { pickHand } from './handTracker'

// Builds a fake MediaPipe result: one entry per hand, with its label, score and a point value.
function result(hands: { label: string; score: number; value: number }[]): HandLandmarkerResult {
  const points = (v: number) => Array.from({ length: 21 }, () => ({ x: v, y: v, z: v, visibility: 1 }))
  const handedness = hands.map((h) => [
    { categoryName: h.label, score: h.score, index: 0, displayName: '' },
  ])
  return {
    landmarks: hands.map((h) => points(h.value)),
    worldLandmarks: hands.map((h) => points(h.value)),
    handedness,
    handednesses: handedness,
  }
}

describe('R19: one hand is used', () => {
  it('R19: no hand gives null', () => {
    expect(pickHand(result([]))).toBeNull()
  })

  it('R19: one hand gives its label and its 21 world points', () => {
    const hand = pickHand(result([{ label: 'Left', score: 0.9, value: 0.5 }]))!
    expect(hand.handedness).toBe('Left')
    expect(hand.worldPoints).toHaveLength(21)
    expect(hand.worldPoints[0]).toEqual([0.5, 0.5, 0.5])
  })

  it('R19: with two hands, the one MediaPipe is most sure about is used', () => {
    const hand = pickHand(
      result([
        { label: 'Left', score: 0.6, value: 1 },
        { label: 'Right', score: 0.95, value: 2 },
      ]),
    )!
    expect(hand.handedness).toBe('Right')
    expect(hand.worldPoints[0]).toEqual([2, 2, 2])
  })
})
