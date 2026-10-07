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

## Status (2026-10-06)
- Folder created, `git init` done (branch `main`), no code yet. No GitHub repo yet.
- **Next step: the questions phase** (see ~/my-projects/CLAUDE.md): ask him questions a few at a time,
  then write `SPEC.md` (numbered rules R1, R2…, v1 vs later) and get his approval **before any code**.
- Topics to cover in the questions (non-exhaustive): game rules (best of 3? score? how a round starts:
  countdown?), what the computer plays (random? smarter later?), how photos are collected (in-browser
  capture tool vs his own photos, how many, privacy: webcam images stay on his computer / are never
  uploaded?), model choice (small CNN from scratch vs transfer learning e.g. MobileNet; or hand landmarks
  with MediaPipe + small classifier — explain the trade-offs), what happens when no hand / unsure
  prediction, FR/EN, design (match the portfolio's style?), phone support, tests for the Python part
  (pytest) and the TS part (Vitest), how the dataset is stored (git? size? public repo → his hand photos public?).

## Working with him
- He is learning (Python for AI, TypeScript). **Explain the code**, not only the result: what each file
  and function does, how the parts connect, why it's done that way, and every new tool / library / concept
  (e.g. what a model, training, ONNX, a tensor are). He got no code explanation on the portfolio: do better here.
- Follow ~/my-projects/CLAUDE.md: questions → `SPEC.md` → tests per rule (named after the rule) → code.
  Never change an agreed rule without asking him.
- Ask before big changes. Never push to GitHub or publish without asking.
- Keep a dated log of what was done in `JOURNAL.md` (append at the end of each session).
- Never read `.env` files or secrets.
