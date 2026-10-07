// MediaPipe Hand Landmarker: finds hands in the video and gives their 21 points (R19).
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision'
import type { Handedness, Point } from './normalize'

export interface TrackedHand {
  handedness: Handedness
  worldPoints: Point[] // in meters: what the model uses (R19, R20)
  imagePoints: { x: number; y: number }[] // 0..1 across the image: only to draw the skeleton
}

// Loads MediaPipe from our own site (public/mediapipe + public/models, R17).
// BASE_URL is Vite's `base` ("/rock-paper-scissors/"), so the paths also work on GitHub Pages.
export async function createHandTracker(): Promise<HandLandmarker> {
  const base = import.meta.env.BASE_URL
  const wasm = await FilesetResolver.forVisionTasks(`${base}mediapipe`)
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: `${base}models/hand_landmarker.task`, delegate },
    runningMode: 'VIDEO' as const, // we give it frames one by one, from a video
    numHands: 2, // look for 2 so that pickHand can choose the clearest one (R19)
  })
  try {
    return await HandLandmarker.createFromOptions(wasm, options('GPU')) // faster, using the graphics card
  } catch {
    return await HandLandmarker.createFromOptions(wasm, options('CPU')) // fallback if no usable GPU
  }
}

// R19: keeps only one hand, the one MediaPipe is most sure about. Returns null if there is no hand.
export function pickHand(result: HandLandmarkerResult): TrackedHand | null {
  let best = -1
  for (let i = 0; i < result.worldLandmarks.length; i++) {
    const score = result.handedness[i]?.[0]?.score ?? 0
    if (best === -1 || score > (result.handedness[best]?.[0]?.score ?? 0)) best = i
  }
  if (best === -1) return null

  return {
    // MediaPipe's label is "Left" or "Right". It assumes a mirrored image, so it may name the
    // other hand than you'd expect. That's fine: the collect page and the game both use the same
    // label, and the normalization (R20) only needs it to be consistent.
    handedness: result.handedness[best][0].categoryName === 'Left' ? 'Left' : 'Right',
    worldPoints: result.worldLandmarks[best].map((p) => [p.x, p.y, p.z] as Point),
    imagePoints: result.landmarks[best].map((p) => ({ x: p.x, y: p.y })),
  }
}
