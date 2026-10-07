import { describe, expect, it } from 'vitest'
import { CAMERA_ERROR_MESSAGES, cameraErrorKind } from './camera'

describe('R18: camera errors', () => {
  it('R18: refused permission is recognized', () => {
    expect(cameraErrorKind(new DOMException('', 'NotAllowedError'))).toBe('denied')
  })

  it('R18: a missing camera is recognized', () => {
    expect(cameraErrorKind(new DOMException('', 'NotFoundError'))).toBe('not-found')
  })

  it('R18: a camera used by another app is recognized', () => {
    expect(cameraErrorKind(new DOMException('', 'NotReadableError'))).toBe('in-use')
  })

  it('R18: anything else is "unknown"', () => {
    expect(cameraErrorKind(new Error('boom'))).toBe('unknown')
    expect(cameraErrorKind('not even an error')).toBe('unknown')
  })

  it('R18: every error has a title and a "how to fix it" help text', () => {
    for (const { title, help } of Object.values(CAMERA_ERROR_MESSAGES)) {
      expect(title).not.toBe('')
      expect(help).not.toBe('')
    }
  })
})
