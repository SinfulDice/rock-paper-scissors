// @vitest-environment node
// (This file needs no web page: plain Node is enough, and ONNX Runtime loads the model file there.)
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as ort from 'onnxruntime-web/wasm'
import { describe, expect, it } from 'vitest'
import { SIGNS, type Sign } from '../game/signs'
import { loadClassifier, toPrediction } from './classifier'
import { normalize, type Handedness, type Point } from './normalize'

// Tests run from the web/ folder (process.cwd()).
const MODEL = resolve(process.cwd(), 'public/models/rps_classifier.onnx')
const DATA_DIR = resolve(process.cwd(), '../training/data')

// In the browser, ONNX Runtime downloads its WebAssembly engine from our site. Node can't
// download it from a file path, so we read the engine ourselves and hand it over.
ort.env.wasm.wasmBinary = readFileSync('node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm')
ort.env.wasm.numThreads = 1

interface Sample {
  label: string
  handedness: Handedness
  points: Point[]
}

// All the recorded samples of the 3 signs ("none" is not used in v1, R22).
function loadSamples(): Sample[] {
  return readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => (JSON.parse(readFileSync(resolve(DATA_DIR, f), 'utf8')) as { samples: Sample[] }).samples)
    .filter((s) => (SIGNS as readonly string[]).includes(s.label))
}

describe('R12 + R22: reading the model output', () => {
  it('R22: the 3 numbers are rock, paper, scissors, in that order', () => {
    expect(toPrediction([0.7, 0.2, 0.1])).toEqual({ rock: 0.7, paper: 0.2, scissors: 0.1 })
  })

  it('R22: anything other than 3 numbers is an error', () => {
    expect(() => toPrediction([0.5, 0.5])).toThrow()
  })
})

describe('R23: my model runs with ONNX Runtime Web', () => {
  it('R23: gives 3 probabilities that add up to 1', async () => {
    const classifier = await loadClassifier(readFileSync(MODEL))
    const prediction = await classifier.predict(new Array(63).fill(0.1))
    const total = SIGNS.reduce((sum, s) => sum + prediction[s], 0)
    expect(total).toBeCloseTo(1, 5)
    for (const s of SIGNS) expect(prediction[s]).toBeGreaterThanOrEqual(0)
  })

  it('R23: refuses an input that is not 63 numbers', async () => {
    const classifier = await loadClassifier(readFileSync(MODEL))
    await expect(classifier.predict([1, 2, 3])).rejects.toThrow()
  })

  it('R20 + R23: the browser pipeline (normalize.ts + ONNX) recognizes my recorded signs', async () => {
    // Same path as in the game: raw MediaPipe points -> normalize (TS) -> model (ONNX Runtime Web).
    // Most of these samples were used for training, so this is not a fair accuracy (that's R25,
    // in Python): it checks that the browser side is wired correctly. A mistake (wrong class
    // order, missing normalization…) would drop this to ~33%, like random guessing.
    const classifier = await loadClassifier(readFileSync(MODEL))
    const samples = loadSamples()
    let correct = 0
    for (const s of samples) {
      const p = await classifier.predict(normalize(s.points, s.handedness))
      const best = SIGNS.reduce<Sign>((a, b) => (p[b] > p[a] ? b : a), 'rock')
      if (best === s.label) correct++
    }
    expect(samples.length).toBeGreaterThan(300)
    expect(correct / samples.length).toBeGreaterThan(0.95)
  })
})
