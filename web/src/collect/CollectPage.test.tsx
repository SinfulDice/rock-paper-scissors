import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { CollectPage } from './CollectPage'

// vi.mock replaces a module in tests. The real MediaPipe can't run in jsdom (no GPU, no
// WebAssembly model), so createHandTracker returns a promise that never finishes: "still loading".
vi.mock('../ai/handTracker', () => ({
  createHandTracker: () => new Promise(() => {}),
  pickHand: () => null,
}))

// A fake webcam: getUserMedia either gives a fake stream or fails with the given error name.
function fakeCamera(errorName?: string) {
  const getUserMedia = errorName
    ? vi.fn().mockRejectedValue(new DOMException('', errorName))
    : vi.fn().mockResolvedValue({ getTracks: () => [] })
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
}

beforeEach(() => {
  // jsdom has no real <video>: make play() do nothing instead of crashing.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
})

describe('R18: camera problems on the collect page', () => {
  it('R18: refused permission shows what happened and how to fix it', async () => {
    fakeCamera('NotAllowedError')
    render(<CollectPage />)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Camera access was refused')
    expect(alert).toHaveTextContent('Allow')
    expect(alert).toHaveTextContent('never leaves your computer')
  })

  it('R18: a browser without camera support gets its own message', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
    render(<CollectPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot use the camera')
  })
})

describe('R29: choosing a class', () => {
  it('R29: keys 1–4 choose the class to record', async () => {
    fakeCamera()
    const user = userEvent.setup()
    render(<CollectPage />)
    expect(screen.getByRole('button', { name: /Rock/ })).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('3')
    expect(screen.getByRole('button', { name: /Scissors/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Rock/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('R29: each class shows its sample count', () => {
    fakeCamera()
    render(<CollectPage />)
    expect(screen.getByRole('button', { name: /Paper/ })).toHaveTextContent('0 / 200')
  })

  it('R31: with no samples, there is nothing to download', () => {
    fakeCamera()
    render(<CollectPage />)
    expect(screen.getByRole('button', { name: /Download/ })).toBeDisabled()
  })
})

describe('R17 + R31: privacy', () => {
  it('R17 + R31: the page says only numbers are saved and the video stays on the computer', () => {
    fakeCamera()
    render(<CollectPage />)
    expect(screen.getByText(/never images/)).toBeInTheDocument()
    expect(screen.getByText(/never leaves your/)).toBeInTheDocument()
  })
})

describe('R28: the collect page is not linked', () => {
  it('R28: the game page has no link to /collect', () => {
    render(<App />)
    for (const link of screen.queryAllByRole('link')) {
      expect(link.getAttribute('href') ?? '').not.toContain('collect')
    }
  })
})
