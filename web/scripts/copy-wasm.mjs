// Copies the WebAssembly files of MediaPipe and ONNX Runtime from node_modules into public/,
// so the site serves them itself (no CDN, R17). Runs after every `npm install`
// (see "postinstall" in package.json). The copies are git-ignored: they can always be rebuilt.
import { copyFileSync, mkdirSync } from 'node:fs'

const COPIES = [
  {
    // MediaPipe: only the files FilesetResolver.forVisionTasks() loads: the normal version (with
    // SIMD, a CPU speed feature) and a fallback for browsers without SIMD.
    from: 'node_modules/@mediapipe/tasks-vision/wasm',
    to: 'public/mediapipe',
    files: [
      'vision_wasm_internal.js',
      'vision_wasm_internal.wasm',
      'vision_wasm_nosimd_internal.js',
      'vision_wasm_nosimd_internal.wasm',
    ],
  },
  {
    // ONNX Runtime Web: the plain WebAssembly (CPU) version, the only one the game uses
    // (the jsep / jspi / asyncify variants are for WebGPU and other special cases).
    from: 'node_modules/onnxruntime-web/dist',
    to: 'public/onnxruntime',
    files: ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'],
  },
]

for (const { from, to, files } of COPIES) {
  mkdirSync(to, { recursive: true })
  for (const file of files) copyFileSync(`${from}/${file}`, `${to}/${file}`)
  console.log(`copied ${files.length} wasm files to ${to}/`)
}
