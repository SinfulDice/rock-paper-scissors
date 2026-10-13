import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Prediction } from '../game/signs'
import { GamePage } from './GamePage'

// vi.hoisted: values the fake modules below can use (vi.mock runs before the imports).
// `fake` decides what the fake AI "sees": change it in a test to show a hand or not.
const fake = vi.hoisted(() => ({
  modelsLoad: true, // false = the models never finish loading
  hand: true, // is a hand in front of the camera?
  prediction: { rock: 0.9, paper: 0.06, scissors: 0.04 } as Prediction,
}))

// The real MediaPipe and ONNX Runtime can't run in jsdom: replace them with fakes.
vi.mock('../ai/handTracker', () => ({
  createHandTracker: () =>
    fake.modelsLoad ? Promise.resolve({ detectForVideo: () => ({}), close: () => {} }) : new Promise(() => {}),
  pickHand: () =>
    fake.hand
      ? { handedness: 'Right', worldPoints: Array.from({ length: 21 }, (_, i) => [i, i, i]), imagePoints: [] }
      : null,
}))
vi.mock('../ai/classifier', () => ({
  createClassifier: () => Promise.resolve({ predict: () => Promise.resolve(fake.prediction) }),
}))
vi.mock('../ai/drawHand', () => ({ drawHand: () => {} })) // jsdom can't draw on a canvas

function fakeCamera(errorName?: string) {
  const getUserMedia = errorName
    ? vi.fn().mockRejectedValue(new DOMException('', errorName))
    : vi.fn().mockResolvedValue({ getTracks: () => [] })
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
}

// Moves the fake clock forward and lets React update the page.
async function wait(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms))
}

// The whole countdown: 3 steps of 1 second. React applies each step at the end of an act(),
// and only then starts the timer of the next step, so we wait one second at a time.
async function waitForShoot() {
  for (let i = 0; i < 3; i++) await wait(1000)
}

function pressSpace() {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))
  })
}

// Starts the page with a working camera and waits until the models are "loaded".
async function startGame() {
  fakeCamera()
  render(<GamePage />)
  await wait(50)
}

beforeEach(() => {
  // Fake timers: setTimeout, requestAnimationFrame and performance.now follow a fake clock
  // that only moves when the test says so. A 3-second countdown takes no real time.
  vi.useFakeTimers()
  fake.modelsLoad = true
  fake.hand = true
  fake.prediction = { rock: 0.9, paper: 0.06, scissors: 0.04 }
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  // jsdom's <video> never plays, so its time stays at 0. Make it follow the fake clock,
  // so the game sees a new video frame each time.
  vi.spyOn(HTMLMediaElement.prototype, 'currentTime', 'get').mockImplementation(() => performance.now())
})

afterEach(() => {
  vi.useRealTimers()
})

describe('R16: loading', () => {
  it('R16: while the models load, a message is shown and "Play" is disabled', async () => {
    fake.modelsLoad = false
    await startGame()
    expect(screen.getByText(/Loading the camera and the AI models/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Play/ })).toBeDisabled()
  })

  it('R16: once loaded, "Play" is enabled', async () => {
    await startGame()
    expect(screen.getByRole('button', { name: /Play/ })).toBeEnabled()
    expect(screen.queryByText(/Loading/)).not.toBeInTheDocument()
  })
})

describe('R17 + R18: camera and privacy', () => {
  it('R17: the page says the video never leaves the computer', async () => {
    await startGame()
    expect(screen.getByText(/Your video never leaves your computer/)).toBeInTheDocument()
  })

  it('R18: a refused camera shows a clear message instead of the game', async () => {
    fakeCamera('NotAllowedError')
    render(<GamePage />)
    await wait(50)
    expect(screen.getByRole('alert')).toHaveTextContent('Camera access was refused')
    expect(screen.queryByRole('button', { name: /Play/ })).not.toBeInTheDocument()
  })
})

describe('R12 + R13: live bars and score', () => {
  it('R12: the bars show the live confidence of each sign in %', async () => {
    await startGame()
    expect(screen.getByRole('meter', { name: /Rock/ })).toHaveAttribute('aria-valuenow', '90')
    expect(screen.getByRole('meter', { name: /Paper/ })).toHaveAttribute('aria-valuenow', '6')
    expect(screen.getByText('90%')).toBeInTheDocument()
  })

  it('R12: with no hand, the bars go to 0 and say so', async () => {
    fake.hand = false
    await startGame()
    expect(screen.getByRole('meter', { name: /Rock/ })).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByText('No hand detected')).toBeInTheDocument()
  })

  it('R13: the score is visible from the start', async () => {
    await startGame()
    const score = screen.getByRole('region', { name: 'Score' })
    expect(score).toHaveTextContent('You0–0Computer')
  })
})

describe('R4–R8 + R14: playing a round', () => {
  it('R4: Space starts the countdown "3", "2", "1", then "Shoot!", one step per second', async () => {
    await startGame()
    pressSpace()
    expect(screen.getByText('3')).toBeInTheDocument()
    await wait(1000)
    expect(screen.getByText('2')).toBeInTheDocument()
    await wait(1000)
    expect(screen.getByText('1')).toBeInTheDocument()
    await wait(1000)
    expect(screen.getByText('Shoot!')).toBeInTheDocument()
  })

  it('R5 + R6 + R8 + R14: at "Shoot!" my sign is read and the round is scored and listed', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // the computer plays scissors (R8)
    await startGame()
    pressSpace()
    await waitForShoot()
    expect(screen.getByText('You win this round!')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Score' })).toHaveTextContent('You1–0Computer')
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(2) // header + 1 round
    expect(rows[1]).toHaveTextContent('✊ Rock✌️ ScissorsWin')
  })

  it('R7: no hand at "Shoot!" -> the round is redone with a message, no point, not listed', async () => {
    fake.hand = false
    await startGame()
    pressSpace()
    await waitForShoot()
    expect(screen.getByText(/couldn't see your hand/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Score' })).toHaveTextContent('You0–0Computer')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Play/ })).toBeEnabled() // try again
  })

  it('R6 + R7: a sign under 70% -> the round is redone ("not sure")', async () => {
    fake.prediction = { rock: 0.6, paper: 0.3, scissors: 0.1 }
    await startGame()
    pressSpace()
    await waitForShoot()
    expect(screen.getByText(/wasn't sure about your sign/)).toBeInTheDocument()
  })

  it('R4: "Play" is disabled during the countdown', async () => {
    await startGame()
    pressSpace()
    expect(screen.getByRole('button', { name: /Play/ })).toBeDisabled()
  })
})

describe('R1 + R9: end of the match', () => {
  it('R9: after 3 wins the winner is announced, and "Play again" resets everything', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // scissors every time: rock wins
    await startGame()
    for (let i = 0; i < 3; i++) {
      pressSpace()
      await waitForShoot()
    }
    expect(screen.getByText('You win the match! 🎉')).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'Play again' }).click())
    expect(screen.getByRole('region', { name: 'Score' })).toHaveTextContent('You0–0Computer')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Play/ })).toBeEnabled()
  })
})
