// The names used everywhere in the game.

// The 3 signs you can play. `as const` makes TypeScript remember the exact strings,
// so `Sign` below means "only 'rock', 'paper' or 'scissors'", not any string.
export const SIGNS = ['rock', 'paper', 'scissors'] as const
export type Sign = (typeof SIGNS)[number]

// The 4 classes the AI model can answer (R22): the 3 signs + "none" (a hand that isn't a sign).
export const CLASSES = ['rock', 'paper', 'scissors', 'none'] as const
export type ModelClass = (typeof CLASSES)[number]

// What the model says for one video frame: a confidence between 0 and 1 for each class
// (the 4 numbers add up to 1). Example: { rock: 0.9, paper: 0.05, scissors: 0.03, none: 0.02 }.
export type Prediction = Record<ModelClass, number>
