// Copies MediaPipe's WebAssembly files from node_modules into public/mediapipe/,
// so the site serves them itself (no Google CDN, R17). Runs after every `npm install`
// (see "postinstall" in package.json). The copy is git-ignored: it can always be rebuilt.
import { copyFileSync, mkdirSync } from 'node:fs'

const FROM = 'node_modules/@mediapipe/tasks-vision/wasm'
// Only the files FilesetResolver.forVisionTasks() loads: the normal version (with SIMD, a CPU
// speed feature) and a fallback for browsers without SIMD. The "module" variants aren't used.
const FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]

mkdirSync('public/mediapipe', { recursive: true })
for (const file of FILES) copyFileSync(`${FROM}/${file}`, `public/mediapipe/${file}`)
console.log('copied MediaPipe wasm files to public/mediapipe/')
