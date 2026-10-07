# rock-paper-scissors

Pierre-Antoine's rock-paper-scissors game against the computer, played with the **webcam**: an AI model
that **he trains himself** recognizes his hand sign (rock / paper / scissors).

## The idea (from ~/my-projects/IDEAS.md, 2026-10-05)
- Take photos of his hand signs → train a small model in **Python** → export it (**ONNX**) →
  run it **in the browser** (**TypeScript**).
- **Live demo on GitHub Pages** (like the portfolio), and the project gets added to his portfolio
  (`~/my-projects/portfolio`, "Projects to show" #3).
- Good practice for a later idea (a Just Dance-like game: training + webcam).

## Why this project
He is looking for an alternance as **Full Stack** or **Data & AI** developer. This project shows AI
(training his own model in Python) + web (TS frontend) on his portfolio and GitHub (`SinfulDice`).

## Status (end of 2026-10-07 session)
- **SPEC.md approved** (R1–R42 + L1–L7). Read it first. Changed today with his OK: 3 classes, no "none"
  (R6, R7, R12, R22), augmentation (R23), block split against data leakage (R25).
- **Git:** 2 commits (setup, /collect page). **The training work is NOT committed yet**: I asked, he hadn't
  answered when the session ended → ask him first thing next session (it includes `training/data/`, R32).
- **Done:**
  - `web/` (Vite + React 19 + TS, Vitest + Testing Library + jsdom, oxlint; portfolio dark colors).
    Game logic in `web/src/game/` (match rules, computer move, `readSign` = average + 70% threshold).
    `/collect` page (works, tested by him with his webcam): MediaPipe hand landmarker served from the site,
    hold Space → ~10 samples/s, download JSON.
  - `training/` (uv package `rps`, Python 3.12, CPU PyTorch 2.14, onnx, onnxruntime, pytest):
    `uv run rps-train` loads `training/data/*.json`, normalizes (R20), block split, trains the MLP
    (63→64→32→3) with augmentation, exports `web/public/models/rps_classifier.onnx` and
    `web/src/ai/modelInfo.json` (accuracy, confusion matrix, counts for the "About the model" section).
  - Data: 3 sessions, 660 samples used (rock 206, paper 239, scissors 215). Session 3 = 232 "none"
    (only a pointing finger), kept for L7 but skipped. Model: **99.2%** test accuracy (93–100% over 4 splits).
  - Tests: web 54, Python 36, all passing.
- **Next step: the game screen** (R4–R16, R33): run the ONNX model in the browser with `onnxruntime-web`
  (serve its wasm from the site like MediaPipe, R17), normalize live landmarks with `web/src/ai/normalize.ts`,
  live bars, countdown + averaging at "Shoot!", score, history, play again, camera errors (reuse
  `CameraMessage`), loading state. Then "About the model" (R33), README (R42), GitHub Actions + Pages (R41).
- After playing: if non-signs are often read as signs → L7 (give him an exact list of "none" poses to record;
  NOT the fist with thumb out, too close to rock — my earlier bad suggestion).
- Useful facts: uv is in `~/.local/bin` (may need `export PATH="$HOME/.local/bin:$PATH"`); dev server:
  `cd web && npm run dev` → http://localhost:5173/rock-paper-scissors/ (collect: …/collect/);
  MediaPipe wasm is copied to `web/public/mediapipe/` by `npm install` (postinstall, git-ignored).
  Tests: `cd web && npm test`, `cd training && uv run pytest`. A test file reads `../shared/normalize_cases.json`.

## Working with him
- He is learning (Python for AI, TypeScript). **Explain the code**, not only the result: what each file
  and function does, how the parts connect, why it's done that way, and every new tool / library / concept
  (e.g. what a model, training, ONNX, a tensor are). He got no code explanation on the portfolio: do better here.
- Follow ~/my-projects/CLAUDE.md: questions → `SPEC.md` → tests per rule (named after the rule) → code.
  Never change an agreed rule without asking him.
- Ask before big changes. Never push to GitHub or publish without asking.
- Keep a dated log of what was done in `JOURNAL.md` (append at the end of each session).
- Never read `.env` files or secrets.
