import { describe, expect, it } from 'vitest'
import { SIGNS } from '../game/signs'
import info from './modelInfo.json'

describe('R22: class order', () => {
  it('R22: the model classes are the 3 signs, in the same order as SIGNS in the game', () => {
    // The model answers 3 numbers; if the order differed, "rock" could be read as "paper".
    expect(info.classes).toEqual([...SIGNS])
  })
})
