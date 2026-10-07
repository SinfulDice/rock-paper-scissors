// Runs before the tests: adds matchers like toBeInTheDocument(), and resets the page
// after each test so tests don't affect each other.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
