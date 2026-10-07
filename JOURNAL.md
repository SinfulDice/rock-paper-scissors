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
