import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defaultClientConditions } from 'vite'
// `vitest/config` is Vite's defineConfig plus the `test` settings used by Vitest.
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The site will be served from https://sinfuldice.github.io/rock-paper-scissors/
  base: '/rock-paper-scissors/',
  resolve: {
    // onnxruntime-web has two versions. By default Vite takes the "bundle" one, which makes Vite
    // add a second 14 MB copy of the wasm engine to the site. This condition picks the version
    // that loads the engine from public/onnxruntime/ (our copy, see scripts/copy-wasm.mjs).
    conditions: ['onnxruntime-web-use-extern-wasm', ...defaultClientConditions],
  },
  build: {
    // Two separate pages: the game (index.html) and the data capture page (collect/index.html, R28).
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        collect: resolve(import.meta.dirname, 'collect/index.html'),
      },
    },
  },
  test: {
    // jsdom = a fake browser, so tests can render the page without opening Chrome.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
