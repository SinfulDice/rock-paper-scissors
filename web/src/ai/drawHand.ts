// R11: draws the hand skeleton (21 points + the lines between them) on a <canvas>.
import { HandLandmarker } from '@mediapipe/tasks-vision'
import type { TrackedHand } from './handTracker'

export function drawHand(canvas: HTMLCanvasElement, hand: TrackedHand | null) {
  const ctx = canvas.getContext('2d') // the "pen" used to draw on the canvas
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height) // erase the previous frame's drawing
  if (!hand) return

  // Points are between 0 and 1, so multiply by the canvas size to get pixels.
  const px = (i: number) => hand.imagePoints[i].x * canvas.width
  const py = (i: number) => hand.imagePoints[i].y * canvas.height

  // Lines: HAND_CONNECTIONS lists which points are joined (wrist→thumb, thumb joints…).
  ctx.strokeStyle = '#7ee0c3' // --accent-2
  ctx.lineWidth = 3
  for (const { start, end } of HandLandmarker.HAND_CONNECTIONS) {
    ctx.beginPath()
    ctx.moveTo(px(start), py(start))
    ctx.lineTo(px(end), py(end))
    ctx.stroke()
  }

  // Points: a small circle on each of the 21 points.
  ctx.fillStyle = '#ff8a65' // --accent
  for (let i = 0; i < hand.imagePoints.length; i++) {
    ctx.beginPath()
    ctx.arc(px(i), py(i), 4, 0, 2 * Math.PI)
    ctx.fill()
  }
}
