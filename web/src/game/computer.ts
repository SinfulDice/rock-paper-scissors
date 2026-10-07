// R8: the computer's move.
import { SIGNS, type Sign } from './signs'

// Picks a random sign, each with a 1/3 chance. It takes no player sign as input, so it
// *can't* look at your move: the rule is guaranteed by the function's shape.
//
// `random` is a parameter (default: Math.random, which returns a number in [0, 1)) so tests
// can pass a fake one and know exactly what comes out. This trick is called "dependency injection".
export function computerSign(random: () => number = Math.random): Sign {
  // random() * 3 is in [0, 3); Math.floor turns it into 0, 1 or 2.
  return SIGNS[Math.floor(random() * SIGNS.length)]
}
