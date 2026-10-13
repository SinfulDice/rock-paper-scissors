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

## Status (2026-10-13, after webcam test)
- **SPEC.md approved** (R1–R42 + L1–L7). 2026-10-13: small additions to R4, R7, R12, R15 written by Claude,
  **confirmed by him on 2026-10-13** (redo needs "Play" again, not automatic; Play disabled during countdown;
  bar color at ≥ 70%; no animations with reduced motion).
- **Git:** 5 commits (game screen committed 2026-10-13 after his webcam test: works great).
  Not pushed, no GitHub repo yet.
- **Done before:** `web/` (Vite + React 19 + TS, Vitest, oxlint), game logic `web/src/game/`, `/collect` page,
  `training/` (uv package `rps`, `uv run rps-train` → `web/public/models/rps_classifier.onnx` + `web/src/ai/modelInfo.json`),
  660 samples, model 99.2% test accuracy. See JOURNAL.md.
- **Done 2026-10-13 (game screen, R4–R18):** `web/src/ai/classifier.ts` (onnxruntime-web, wasm copied to
  `public/onnxruntime/` by `scripts/copy-wasm.mjs`; Vite condition `onnxruntime-web-use-extern-wasm`),
  `web/src/game/game.ts` (reducer), `web/src/play/` (GamePage, PredictionBars, Score/History, play.css).
  Tests: web 83, Python 36, all passing; lint + build OK. Tried with his webcam: works great; non-signs read as nearest sign (expected), no L7 for now.
- **Next:** "About the model" (R33, reads modelInfo.json; mention the 3-class limits), LICENSE + README (R42),
  GitHub Actions + Pages (R41), then create the GitHub repo and push (only with his OK).
  If wrong signs show up while playing → L7: give him an exact list of "none" poses, NOT the fist with thumb out.
- Useful facts: uv is in `~/.local/bin` (may need `export PATH="$HOME/.local/bin:$PATH"`); dev server:
  `cd web && npm run dev` → http://localhost:5173/rock-paper-scissors/ (collect: …/collect/);
  wasm files are copied to `web/public/` by `npm install` (postinstall, git-ignored).
  Tests: `cd web && npm test`, `cd training && uv run pytest`. Web tests read `../shared/` and `../training/data/`.

## Working with him
- He is learning (Python for AI, TypeScript). **Explain the code**, not only the result: what each file
  and function does, how the parts connect, why it's done that way, and every new tool / library / concept
  (e.g. what a model, training, ONNX, a tensor are). He got no code explanation on the portfolio: do better here.
- Follow ~/my-projects/CLAUDE.md: questions → `SPEC.md` → tests per rule (named after the rule) → code.
  Never change an agreed rule without asking him.
- Ask before big changes. Never push to GitHub or publish without asking.
- Keep a dated log of what was done in `JOURNAL.md` (append at the end of each session).
- Never read `.env` files or secrets.
