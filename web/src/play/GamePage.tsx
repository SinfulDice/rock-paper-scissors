// The game screen (R4–R18): webcam + hand skeleton, live predictions, countdown, score, history.
//
// How the parts connect, once per video frame:
//   webcam -> MediaPipe (handTracker.ts): 21 points -> normalize.ts: 63 numbers
//   -> my model (classifier.ts): { rock, paper, scissors } -> live bars + saved in `frames`.
// At "Shoot!", readSign.ts averages the last 0.3 s of `frames` and decides (R5–R7),
// then game.ts (the reducer) updates the score and the history.
import type { HandLandmarker } from '@mediapipe/tasks-vision'
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { createClassifier, type Classifier } from '../ai/classifier'
import { drawHand } from '../ai/drawHand'
import { createHandTracker, pickHand } from '../ai/handTracker'
import { normalize } from '../ai/normalize'
import { cameraErrorKind, openCamera, type CameraError } from '../camera/camera'
import { CameraMessage } from '../camera/CameraMessage'
import { computerSign } from '../game/computer'
import { canPlay, COUNTDOWN, gameReducer, initialGame, STEP_MS, type GameState } from '../game/game'
import type { RoundResult } from '../game/match'
import { averagePrediction, decide, type Frame } from '../game/readSign'
import { SIGN_LABELS, type Prediction } from '../game/signs'
import { PredictionBars } from './PredictionBars'
import { History, Score } from './Score'

// Frames older than this are dropped: "Shoot!" only needs the last 0.3 s (R5).
const KEEP_FRAMES_MS = 1000

export function GamePage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // The recent predictions (one per video frame), read at "Shoot!". A ref, not state: it changes
  // ~30 times per second and nothing on screen shows it directly.
  const framesRef = useRef<Frame[]>([])

  const [status, setStatus] = useState<'loading' | 'ready' | 'model-error'>('loading')
  const [cameraError, setCameraError] = useState<CameraError | null>(null)
  const [live, setLive] = useState<Prediction | null>(null) // R12: the current frame's prediction
  // useReducer = useState for state that changes through "actions" (see game.ts).
  // `game` is the current state, `dispatch` sends an action to gameReducer.
  const [game, dispatch] = useReducer(gameReducer, initialGame)

  const ready = status === 'ready'
  const playable = ready && canPlay(game) // R16: "Play" is disabled while the models load

  // Start the camera and both AI models once; stop everything when the page goes away.
  // Same structure as CollectPage, plus my model.
  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let tracker: HandLandmarker | null = null
    let classifier: Classifier | null = null
    let frameId = 0
    let lastVideoTime = -1
    let predicting = false // true while the model works on a frame

    async function start() {
      try {
        stream = await openCamera()
      } catch (error) {
        if (!cancelled) setCameraError(cameraErrorKind(error)) // R18
        return
      }
      const video = videoRef.current
      if (cancelled || !video) return
      video.srcObject = stream
      await video.play()

      try {
        // Promise.all loads both models at the same time instead of one after the other.
        const [t, c] = await Promise.all([createHandTracker(), createClassifier()])
        tracker = t
        classifier = c
      } catch {
        if (!cancelled) setStatus('model-error')
        return
      }
      if (cancelled) return
      setStatus('ready')
      loop()
    }

    function loop() {
      frameId = requestAnimationFrame(loop)
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || !tracker || !classifier) return
      if (video.currentTime === lastVideoTime) return // no new video frame yet
      lastVideoTime = video.currentTime

      const now = performance.now()
      const hand = pickHand(tracker.detectForVideo(video, now))

      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
      drawHand(canvas, hand) // R11

      if (!hand) {
        addFrame({ time: now, prediction: null })
        setLive(null)
        return
      }
      // The model answers asynchronously (a Promise). If it is still busy with the previous
      // frame, skip this one rather than piling up work.
      if (predicting) return
      predicting = true
      classifier
        .predict(normalize(hand.worldPoints, hand.handedness)) // R20 then my model
        .then((prediction) => {
          if (cancelled) return
          addFrame({ time: now, prediction })
          setLive(prediction)
        })
        .catch(() => {}) // a rare bad frame (e.g. a hand size of 0): just ignore it
        .finally(() => {
          predicting = false
        })
    }

    function addFrame(frame: Frame) {
      // Keep only the last second: enough for R5, and the list never grows forever.
      framesRef.current = [...framesRef.current, frame].filter(
        (f) => f.time > frame.time - KEEP_FRAMES_MS,
      )
    }

    start()
    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      stream?.getTracks().forEach((t) => t.stop())
      tracker?.close()
    }
  }, [])

  // R4: the countdown. Each time the phase changes, wait 1 second, then go to the next step.
  // At the end, it's "Shoot!": read my sign (R5–R7) and pick the computer's sign (R8).
  useEffect(() => {
    if (game.phase.kind !== 'countdown') return
    const step = game.phase.step
    const timer = setTimeout(() => {
      if (step < COUNTDOWN.length - 2) {
        dispatch({ type: 'tick' })
      } else {
        const decision = decide(averagePrediction(framesRef.current, performance.now()))
        dispatch({ type: 'shoot', decision, computer: computerSign() })
      }
    }, STEP_MS)
    // If the phase changes before the second is over (or the page closes), cancel the timer.
    return () => clearTimeout(timer)
  }, [game.phase])

  // R4: Space starts a round, like the "Play" button.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      // Without this, Space would also scroll the page or click the focused button.
      e.preventDefault()
      if (e.type === 'keydown' && !e.repeat && ready) dispatch({ type: 'play' })
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [ready])

  return (
    <main className="game">
      <header>
        <h1>Rock Paper Scissors</h1>
        <p className="muted">
          Play against the computer with your webcam. An AI model I trained myself reads your hand
          sign. <strong>Your video never leaves your computer</strong>: everything runs in this
          browser tab.
        </p>
      </header>

      {cameraError ? (
        <CameraMessage error={cameraError} />
      ) : (
        <div className="game-layout">
          <div className="stage">
            <video ref={videoRef} muted playsInline />
            <canvas ref={canvasRef} />
            <Overlay game={game} />
            {status !== 'ready' && (
              <div className="stage-status" aria-live="polite">
                {status === 'loading' && 'Loading the camera and the AI models…'}
                {status === 'model-error' && 'The AI models could not be loaded. Reload the page.'}
              </div>
            )}
          </div>

          <div className="panel">
            <Score match={game.match} />
            <RoundMessage game={game} ready={ready} />
            {game.match.winner ? (
              <button type="button" className="primary" onClick={() => dispatch({ type: 'playAgain' })}>
                Play again
              </button>
            ) : (
              <button
                type="button"
                className="primary"
                disabled={!playable}
                onClick={() => dispatch({ type: 'play' })}
              >
                Play <kbd>Space</kbd>
              </button>
            )}
            <PredictionBars prediction={live} />
            <History match={game.match} />
          </div>
        </div>
      )}
    </main>
  )
}

// The big text on top of the video: "3", "2", "1", then "Shoot!" (R4, R15).
function Overlay({ game }: { game: GameState }) {
  const { phase } = game
  let text: string | null = null
  if (phase.kind === 'countdown') text = COUNTDOWN[phase.step]
  if (phase.kind === 'result' || phase.kind === 'redo') text = COUNTDOWN[COUNTDOWN.length - 1]
  if (text === null) return null
  // `key={text}`: a new key makes React create a new element, so the CSS animation restarts
  // for each step instead of playing only once.
  return (
    <div key={text} className={phase.kind === 'countdown' ? 'countdown' : 'countdown shoot'} aria-live="assertive">
      {text}
    </div>
  )
}

const ROUND_TEXT: Record<RoundResult, string> = {
  win: 'You win this round!',
  loss: 'The computer wins this round.',
  tie: "It's a tie: nobody scores.",
}

// The message under the score: instructions, the round result, a redo reason (R7), the winner (R9).
function RoundMessage({ game, ready }: { game: GameState; ready: boolean }) {
  const { phase, match } = game
  let content: ReactNode = null

  if (phase.kind === 'result') {
    content = (
      // `key` again restarts the reveal animation (R15) for every new round.
      <div key={match.rounds.length} className="reveal">
        <p className="signs">
          <span>You: {SIGN_LABELS[phase.round.player]}</span>
          <span>Computer: {SIGN_LABELS[phase.round.computer]}</span>
        </p>
        <p className={`result-${phase.round.result}`}>{ROUND_TEXT[phase.round.result]}</p>
        {match.winner && (
          <p className="winner">
            {match.winner === 'player' ? 'You win the match! 🎉' : 'The computer wins the match.'}
          </p>
        )}
      </div>
    )
  } else if (phase.kind === 'redo') {
    content = (
      <p className="redo">
        {phase.reason === 'no-hand'
          ? "I couldn't see your hand. Keep it in the camera view and try again."
          : "I wasn't sure about your sign. Hold it clearly and try again."}{' '}
        No point this time.
      </p>
    )
  } else if (phase.kind === 'countdown') {
    content = <p>Get your sign ready…</p>
  } else if (ready) {
    content = <p>Show your hand to the camera, then press Play.</p>
  }
  // aria-live: screen readers read the new message aloud when it changes.
  return (
    <div className="round-message" aria-live="polite">
      {content}
    </div>
  )
}
