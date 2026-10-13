# Rock Paper Scissors — webcam + my own AI model

Play rock-paper-scissors against the computer by showing your hand to the webcam.
The hand sign is recognized by a small neural network that **I trained myself** in Python,
then exported to ONNX and run **directly in the browser**.

**▶ Live demo: https://sinfuldice.github.io/rock-paper-scissors/**
(desktop Chrome or Firefox, with a webcam)

> 🔒 Your video never leaves your computer: everything runs in your browser, nothing is sent to a server.

## How it works

```
webcam ──► MediaPipe Hand Landmarker ──► 21 hand points ──► normalization ──► my model ──► rock / paper / scissors
           (Google's model, finds the     (x, y, z = 63       (same code in      (small neural
            hand and its joints)           numbers)            Python and TS)     network, ONNX)
```

1. **Collect data:** a hidden `/collect` page records my hand points (only numbers, never images)
   while I hold each sign, and downloads them as JSON files (`training/data/`).
2. **Normalize:** the points are centered on the wrist, scaled by the hand size, and a left hand is
   mirrored into a right hand. So the position in the image, the distance to the camera and the hand
   used don't matter. The same normalization is written in Python and TypeScript, and a shared test
   file checks that both give the same numbers.
3. **Train (Python):** a small MLP (63 → 64 → 32 → 3) trained with PyTorch, with data augmentation
   (small random rotations and noise). 20% of the data is kept aside as a test set, split in blocks of
   consecutive samples so near-identical frames don't leak between training and test.
4. **Export:** the trained model is saved as ONNX, a standard format for neural networks.
5. **Play (TypeScript):** the website runs MediaPipe and my ONNX model with ONNX Runtime Web
   (WebAssembly), shows live predictions, and reads your sign at "Shoot!". A sign counts only if the
   model is at least 70% sure; otherwise the round is redone.

### Results

- 660 samples (about 200 per sign), all recorded by me.
- **99.2% accuracy** on the test set (128 / 129 test samples right).
- Full numbers (confusion matrix, samples per class): `web/src/ai/modelInfo.json`, written by the training script.

### Limits

- The model only knows **3 signs**, so any hand is read as the closest one: a thumbs up is read as rock.
  Unclear poses (halfway between two signs) stay under the 70% threshold and the round is redone.
- It was trained on **my** hand only, so it may work less well for other people.

## Project structure

| Folder | What's inside |
|---|---|
| `training/` | Python: data loading, normalization, model, training, ONNX export (uv, PyTorch, pytest) |
| `web/` | Website: game, data collection page, model in the browser (React, TypeScript, Vite, Vitest) |
| `shared/` | Test cases shared by Python and TypeScript (normalization must match) |
| `SPEC.md` | All the rules of the project (R1, R2…). Every rule has automated tests named after it |
| `JOURNAL.md` | Dated log of what was done, including what didn't work |

## Run it locally

Needs [Node.js](https://nodejs.org/) 24+ and, for training, [uv](https://docs.astral.sh/uv/).

```bash
# Website
cd web
npm install        # also copies the WebAssembly files into web/public/
npm run dev        # → http://localhost:5173/rock-paper-scissors/
npm test           # tests
npm run lint

# Training (from the repo root)
cd training
uv run rps-train   # trains, then writes web/public/models/rps_classifier.onnx and web/src/ai/modelInfo.json
uv run pytest      # tests
```

Every push to `main` runs all tests on GitHub Actions, and the site is deployed to GitHub Pages only if they pass.

## How I built it

I built this project with an AI coding assistant (Claude Code), as a way to learn Python for AI and
TypeScript. I decided the features and rules (`SPEC.md`), recorded and labeled the data, tested
everything with my webcam and made the design choices (for example, dropping a 4th "none" class that
made the model worse, see `JOURNAL.md`). `CLAUDE.md` holds the instructions the assistant follows.

## Credits

- [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker)
  by Google (`web/public/models/hand_landmarker.task`), Apache License 2.0.
- [ONNX Runtime Web](https://onnxruntime.ai/) by Microsoft, MIT License.

## License

MIT — see [LICENSE](LICENSE).
