# Journal

## 2026-10-06
- Project folder created with `git init`, `CLAUDE.md` (the idea + how to work with him), `.claude/settings.json`
  (blocks reading `.env` files), this journal and a `.gitignore`.
- Next: questions phase, then `SPEC.md`.

## 2026-10-07
- Questions phase done (game rules, model approach, data collection, privacy, design, tools, hosting).
- Main choices: MediaPipe hand landmarks + own PyTorch MLP (4 classes incl. "none") → ONNX → browser;
  best of 5 with countdown; React + TS + Vite like the portfolio (dark theme); uv + pytest; one repo
  (training/ + web/); 90% test-accuracy safety floor; MIT license.
- `SPEC.md` written (R1–R42, L1–L6). Waiting for approval; some details marked "(proposed)".
- SPEC approved. Set up `web/` (Vite + React + TS, Vitest + Testing Library + jsdom, oxlint), portfolio dark colors.
- Game logic in `web/src/game/` (signs, match rules, computer move, reading the sign) with 23 tests
  (R1, R2, R3, R5–R9, R14). Added to R5: hand seen in < half the frames = "no hand". Added `LICENSE` (MIT).
- Next: install uv, set up `training/` (pytest), then the landmark normalization (R20–R21) in both languages.
- Installed uv (by Pierre-Antoine). Set up `training/` (uv package `rps`, numpy, pytest).
- Normalization (R20) written in Python (`training/src/rps/normalize.py`) and TS (`web/src/ai/normalize.ts`);
  `shared/normalize_cases.json` (made by `training/scripts/make_normalize_cases.py`) proves both match (R21).
  Decision added to SPEC R19: use MediaPipe world landmarks. Tests: web 31, Python 10, all passing.
- Next: the `/collect` page (MediaPipe in the browser + recording, R28–R31).
- `/collect` page (tested by Pierre-Antoine with his webcam: works): MediaPipe (`@mediapipe/tasks-vision` 1.1.0) served from our own site (model in
  `web/public/models/`, wasm copied by `web/scripts/copy-mediapipe-wasm.mjs` on `npm install`).
  Camera + errors (R18), hand choice (R19), skeleton, recorder (R29–R31), download. Web tests: 54 passing.
  SPEC R28–R31 updated (keys 1–4, clear all, unsaved warning, noindex, files go to training/data/).
- Data: 2 sessions copied from Downloads to `training/data/` (814 samples, no duplicates).
- Training code: `training/src/rps/` dataset.py (load, block split R25), model.py (MLP 63→64→32→4),
  train.py (`uv run rps-train`: train, confusion matrix, ONNX export to web/public/models/, modelInfo.json).
  PyTorch CPU 2.14, onnxruntime 1.30. SPEC R25 clarified (block split against data leakage).
- First result: 85.9% test accuracy (< 90% floor, R25 test fails as intended). Rock/paper/scissors 98%;
  "none" only 13/34 (taken for scissors/paper). Score varies 80–92% with the split: too little "none" variety.
- Not committed yet (R25 test failing). Next: more varied "none" data and/or augmentation (his choice).
- Session 3 (232 "none", only a pointing finger) added. With 4 classes: still 77–91% depending on split.
  Experiments (scratch): old "none" (sessions 1–2) conflicted with real signs; augmentation +2–3 points.
- **Decision (Pierre-Antoine's idea): drop "none" in v1, 3 classes.** SPEC R6, R7, R12, R22 changed, R23 adds
  augmentation (±15° rotations + 2% noise), L7 added (bring "none" back with an exact list of poses).
  Old "none" removed from the copies of sessions 1–2 (originals still in Downloads); session 3 kept for L7.
- Result: **99.2%** test accuracy (93–100% over 4 splits). Python 36 tests, web 54 tests, all passing.
- Next: the game screen (live predictions in the browser with onnxruntime-web, countdown, score…).
- End of session. Training work not committed yet (ask him next time). Status for next time in CLAUDE.md.
