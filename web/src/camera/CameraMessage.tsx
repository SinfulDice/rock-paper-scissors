// R18: the box shown when the camera can't be used. Also used by the game screen later.
import { CAMERA_ERROR_MESSAGES, type CameraError } from './camera'

export function CameraMessage({ error }: { error: CameraError }) {
  const { title, help } = CAMERA_ERROR_MESSAGES[error]
  return (
    // role="alert" makes screen readers announce the message right away.
    <div className="camera-message" role="alert">
      <h2>{title}</h2>
      <p>{help}</p>
      <p>
        The camera is needed to see your hand. Your video never leaves your computer: it is only
        processed in this browser tab.
      </p>
    </div>
  )
}
