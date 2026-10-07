// Opening the webcam, and turning its errors into clear messages (R18).

export type CameraError = 'denied' | 'not-found' | 'in-use' | 'unsupported' | 'unknown'

// Asks the browser for the webcam. The browser shows its "Allow camera?" popup the first time.
// The video stays in the browser: it's only shown on the page and given to MediaPipe (R17).
export async function openCamera(): Promise<MediaStream> {
  // `?.` = "only continue if it exists". Very old browsers, or pages not served over https,
  // have no navigator.mediaDevices at all.
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException('Camera API not available', 'NotSupportedError')
  }
  return navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
    audio: false,
  })
}

// The browser reports problems as errors with a `name`. This maps them to our 5 cases.
export function cameraErrorKind(error: unknown): CameraError {
  const name = error instanceof DOMException || error instanceof Error ? error.name : ''
  switch (name) {
    case 'NotAllowedError': // the user (or the browser settings) said no
    case 'SecurityError':
      return 'denied'
    case 'NotFoundError': // no webcam plugged in
    case 'OverconstrainedError':
      return 'not-found'
    case 'NotReadableError': // another app (Zoom, Discord…) is using it
    case 'AbortError':
      return 'in-use'
    case 'NotSupportedError':
      return 'unsupported'
    default:
      return 'unknown'
  }
}

// R18: what is wrong, and how to fix it.
export const CAMERA_ERROR_MESSAGES: Record<CameraError, { title: string; help: string }> = {
  denied: {
    title: 'Camera access was refused',
    help: 'Click the camera icon in the address bar, choose "Allow", then reload the page.',
  },
  'not-found': {
    title: 'No camera found',
    help: 'Plug in a webcam (or check that it is enabled), then reload the page.',
  },
  'in-use': {
    title: 'The camera is used by another app',
    help: 'Close the other app or tab using the camera (video call, another game…), then reload the page.',
  },
  unsupported: {
    title: 'This browser cannot use the camera',
    help: 'Use a recent version of Chrome or Firefox.',
  },
  unknown: {
    title: 'The camera could not be started',
    help: 'Check your camera, then reload the page.',
  },
}
