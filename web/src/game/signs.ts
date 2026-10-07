// The names used everywhere in the game.

// The 3 signs you can play. `as const` makes TypeScript remember the exact strings,
// so `Sign` below means "only 'rock', 'paper' or 'scissors'", not any string.
// R22: these are also the model's 3 classes, in the same order as CLASSES in training/src/rps/dataset.py.
export const SIGNS = ['rock', 'paper', 'scissors'] as const
export type Sign = (typeof SIGNS)[number]

// What the model says for one video frame: a confidence between 0 and 1 for each sign
// (the 3 numbers add up to 1). Example: { rock: 0.9, paper: 0.06, scissors: 0.04 }.
export type Prediction = Record<Sign, number>

// Labels the /collect page can record: the 3 signs + "none" (kept for later, L7; not trained in v1).
export const RECORD_LABELS = [...SIGNS, 'none'] as const
export type RecordLabel = (typeof RECORD_LABELS)[number]
