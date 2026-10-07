// The data capture page (R28–R31): webcam + hand skeleton, choose a class, hold Space to record,
// download the samples as a file.
import type { HandLandmarker } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState } from 'react'
import { drawHand } from '../ai/drawHand'
import { createHandTracker, pickHand } from '../ai/handTracker'
import { cameraErrorKind, openCamera, type CameraError } from '../camera/camera'
import { CameraMessage } from '../camera/CameraMessage'
import { CLASSES, type ModelClass } from '../game/signs'
import { downloadText } from './download'
import {
  countByClass,
  datasetFileName,
  emptyRecorder,
  onFrame,
  toDatasetJson,
  type RecorderState,
} from './recorder'

const GOAL_PER_CLASS = 200 // R26: a target to aim for, not a hard rule
const LABELS: Record<ModelClass, string> = {
  rock: '✊ Rock',
  paper: '✋ Paper',
  scissors: '✌️ Scissors',
  none: '🤷 None',
}
const CLASS_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4'] // keys 1–4 choose a class

export function CollectPage() {
  // useRef = a box that keeps a value between renders, WITHOUT re-rendering when it changes.
  // The video loop runs ~60 times per second, so it reads/writes refs, not state.
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const recorder = useRef<RecorderState>(emptyRecorder)
  const recordingRef = useRef(false)
  const labelRef = useRef<ModelClass>('rock')

  // useState = values shown on screen: changing them re-renders the page.
  const [status, setStatus] = useState<'loading' | 'ready' | 'model-error'>('loading')
  const [cameraError, setCameraError] = useState<CameraError | null>(null)
  const [label, setLabelState] = useState<ModelClass>('rock')
  const [recording, setRecordingState] = useState(false)
  const [handVisible, setHandVisible] = useState(false)
  const [counts, setCounts] = useState(countByClass([]))
  const [savedCount, setSavedCount] = useState(0) // how many samples were in the last download

  // Each of these updates both the ref (for the video loop) and the state (for the screen).
  function setLabel(l: ModelClass) {
    labelRef.current = l
    setLabelState(l)
  }
  function setRecording(r: boolean) {
    recordingRef.current = r
    setRecordingState(r)
  }

  // Start the camera and MediaPipe once, when the page appears; stop them when it goes away.
  useEffect(() => {
    let cancelled = false // set to true by the cleanup below, in case it runs while we're still loading
    let stream: MediaStream | null = null
    let tracker: HandLandmarker | null = null
    let frameId = 0
    let lastVideoTime = -1

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
        tracker = await createHandTracker()
      } catch {
        if (!cancelled) setStatus('model-error')
        return
      }
      if (cancelled) return
      setStatus('ready')
      loop()
    }

    // Runs once per screen refresh (requestAnimationFrame), about 60 times per second.
    function loop() {
      frameId = requestAnimationFrame(loop)
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || !tracker) return
      if (video.currentTime === lastVideoTime) return // no new video frame yet
      lastVideoTime = video.currentTime

      const now = performance.now()
      const hand = pickHand(tracker.detectForVideo(video, now))

      // The canvas must have the same size in pixels as the video, so the skeleton fits the hand.
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight
      drawHand(canvas, hand)
      setHandVisible(hand !== null) // React skips the re-render if the value didn't change

      const next = onFrame(recorder.current, {
        recording: recordingRef.current,
        label: labelRef.current,
        hand,
        now,
      })
      if (next !== recorder.current) {
        recorder.current = next
        setCounts(countByClass(next.samples))
      }
    }

    start()
    // The "cleanup" function: React calls it when the page goes away.
    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      stream?.getTracks().forEach((t) => t.stop()) // turns the webcam light off
      tracker?.close()
    }
  }, [])

  // Keyboard: hold Space to record (R29), keys 1–4 to choose a class.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space') {
        e.preventDefault() // otherwise Space scrolls the page or clicks the focused button
        setRecording(true)
      }
      const i = CLASS_KEYS.indexOf(e.code)
      if (i !== -1) setLabel(CLASSES[i])
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        e.preventDefault()
        setRecording(false)
      }
    }
    // If you switch window while holding Space, the browser never sends "key up": stop anyway.
    const onBlur = () => setRecording(false)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  // Computed from `counts` (state), not from the ref: React only re-renders on state changes.
  const total = counts.rock + counts.paper + counts.scissors + counts.none
  const unsaved = total - savedCount

  // Warn before closing the tab if some samples were never downloaded.
  useEffect(() => {
    if (unsaved === 0) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved])

  function download() {
    const now = new Date()
    downloadText(datasetFileName(now), toDatasetJson(recorder.current.samples, now))
    setSavedCount(total)
  }

  function clearAll() {
    if (!window.confirm(`Delete all ${total} samples recorded on this page?`)) return
    recorder.current = emptyRecorder
    setCounts(countByClass([]))
    setSavedCount(0)
  }

  return (
    <main className="collect">
      <h1>Collect training data</h1>
      <p className="privacy">
        Only the 21 hand points (numbers) are saved, never images. Your video never leaves your
        computer, and the file is downloaded, not uploaded.
      </p>

      {cameraError ? (
        <CameraMessage error={cameraError} />
      ) : (
        <div className="collect-layout">
          <div className="stage">
            {/* The video and the canvas are stacked; CSS mirrors both (R10). */}
            <video ref={videoRef} muted playsInline />
            <canvas ref={canvasRef} />
            <div className="stage-status" aria-live="polite">
              {status === 'loading' && 'Loading the camera and the hand model…'}
              {status === 'model-error' && 'The hand model could not be loaded. Reload the page.'}
              {status === 'ready' && (handVisible ? 'Hand detected' : 'No hand detected')}
            </div>
            {recording && <div className="rec">● REC</div>}
          </div>

          <div className="panel">
            <ol className="steps">
              <li>Choose a class (click, or keys 1–4).</li>
              <li>
                Show the sign and <strong>hold Space</strong> to record. Move your hand a bit: angles,
                distances, both hands.
              </li>
              <li>
                Download the file and put it in <code>training/data/</code>.
              </li>
            </ol>

            <div className="classes">
              {CLASSES.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  className="class-button"
                  aria-pressed={label === c}
                  onClick={() => setLabel(c)}
                >
                  <span>
                    <kbd>{i + 1}</kbd> {LABELS[c]}
                  </span>
                  <span className="count">
                    {counts[c]} / {GOAL_PER_CLASS}
                  </span>
                  <progress max={GOAL_PER_CLASS} value={Math.min(counts[c], GOAL_PER_CLASS)} />
                </button>
              ))}
            </div>

            <div className="actions">
              <button type="button" onClick={download} disabled={total === 0}>
                Download {total} samples
              </button>
              <button type="button" className="secondary" onClick={clearAll} disabled={total === 0}>
                Clear all
              </button>
            </div>
            {unsaved > 0 && <p className="unsaved">{unsaved} samples not downloaded yet.</p>}
          </div>
        </div>
      )}
    </main>
  )
}
