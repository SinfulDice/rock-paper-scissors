// My own model (R22, R23): runs rps_classifier.onnx in the browser with ONNX Runtime Web.
// It takes the 63 normalized numbers of one hand (R20) and gives a confidence for each sign.
import * as ort from 'onnxruntime-web/wasm'
import { SIGNS, type Prediction } from '../game/signs'
import { NUM_POINTS } from './normalize'

const INPUT_SIZE = NUM_POINTS * 3 // 63
// The names given to the model's input and output in training/src/rps/train.py (export_onnx).
const INPUT_NAME = 'landmarks'
const OUTPUT_NAME = 'probabilities'

export interface Classifier {
  predict(features: number[]): Promise<Prediction>
}

// Loads the model from our own site (R17), like MediaPipe in handTracker.ts.
export async function createClassifier(): Promise<Classifier> {
  const base = import.meta.env.BASE_URL
  // Where ONNX Runtime finds its WebAssembly engine (copied there by scripts/copy-wasm.mjs).
  // A full URL (http://…), not just a path (/rock-paper-scissors/…): in dev, Vite adds "?import"
  // to paths that code loads with import(), then refuses to serve files of public/ that way.
  // Vite leaves full URLs alone.
  ort.env.wasm.wasmPaths = new URL(`${base}onnxruntime/`, location.origin).href
  // Several threads need special server headers that GitHub Pages can't send.
  // Our model is tiny (~9,000 numbers), so one thread is plenty.
  ort.env.wasm.numThreads = 1
  return loadClassifier(`${base}models/rps_classifier.onnx`)
}

// `model` is a URL (in the browser) or the file's bytes (in the tests).
export async function loadClassifier(model: string | Uint8Array): Promise<Classifier> {
  // A "session" = the model loaded in memory, ready to run.
  // (TypeScript wants to know which of create()'s two versions is used: URL or bytes.)
  const session =
    typeof model === 'string'
      ? await ort.InferenceSession.create(model) // the URL version
      : await ort.InferenceSession.create(model) // the bytes version

  return {
    async predict(features) {
      if (features.length !== INPUT_SIZE) {
        throw new Error(`expected ${INPUT_SIZE} numbers, got ${features.length}`)
      }
      // A tensor = a block of numbers with a shape. Here the shape is [1, 63]:
      // 1 hand ("batch" of 1), 63 numbers. float32 = the number type the model was trained with.
      const input = new ort.Tensor('float32', Float32Array.from(features), [1, INPUT_SIZE])
      // run() is async: the work happens in WebAssembly, and we get a Promise back.
      const outputs = await session.run({ [INPUT_NAME]: input })
      return toPrediction(outputs[OUTPUT_NAME].data as Float32Array)
    },
  }
}

// The model answers 3 numbers in the order of SIGNS (checked by modelInfo.test.ts, R22).
// This turns [0.9, 0.06, 0.04] into { rock: 0.9, paper: 0.06, scissors: 0.04 }.
export function toPrediction(probabilities: ArrayLike<number>): Prediction {
  if (probabilities.length !== SIGNS.length) {
    throw new Error(`expected ${SIGNS.length} probabilities, got ${probabilities.length}`)
  }
  return { rock: probabilities[0], paper: probabilities[1], scissors: probabilities[2] }
}
