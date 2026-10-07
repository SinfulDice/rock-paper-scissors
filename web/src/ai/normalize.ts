// R20: turns the 21 raw hand points from MediaPipe into the 63 numbers the model sees.
// The exact same steps exist in Python (training/src/rps/normalize.py); R21 checks that both
// give the same numbers, using the shared file shared/normalize_cases.json.

export const NUM_POINTS = 21 // MediaPipe gives 21 points per hand
export const WRIST = 0 // point 0 = the wrist
export const MIDDLE_KNUCKLE = 9 // point 9 = where the middle finger meets the palm

export type Point = [x: number, y: number, z: number]
export type Handedness = 'Left' | 'Right'

// Returns 63 numbers: x, y, z of each point, after these 3 steps:
// 1. center: move the hand so the wrist is at (0, 0, 0) -> the position doesn't matter;
// 2. scale: divide by the wrist-to-middle-knuckle length -> the hand size doesn't matter;
// 3. mirror: flip x for a "Left" hand -> it looks like a right hand, one model for both.
// `points` are MediaPipe's "world landmarks" (in meters, not pixels).
export function normalize(points: Point[], handedness: Handedness): number[] {
  if (points.length !== NUM_POINTS) {
    throw new Error(`expected ${NUM_POINTS} points, got ${points.length}`)
  }

  // 1. Center: subtract the wrist from every point.
  const [wx, wy, wz] = points[WRIST]
  const centered = points.map(([x, y, z]) => [x - wx, y - wy, z - wz])

  // 2. Scale: Math.hypot(x, y, z) = the length of a vector, sqrt(x² + y² + z²).
  const size = Math.hypot(...centered[MIDDLE_KNUCKLE])
  if (size === 0) throw new Error('hand size is 0: wrist and middle knuckle are at the same place')

  // 3. Mirror x for a left hand. flatMap = map, then glue the small arrays into one list of 63.
  const flip = handedness === 'Left' ? -1 : 1
  return centered.flatMap(([x, y, z]) => [(flip * x) / size, y / size, z / size])
}
