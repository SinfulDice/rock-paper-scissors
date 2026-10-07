# SPEC — Rock Paper Scissors (webcam + my own AI model)

Status: **approved** (2026-10-07).
Each rule has a number (`R1`, `R2`…). Every v1 rule gets automated tests that mention its number.
"Later" ideas (L1, L2…) are not built in v1.

---

## 1. Game rules

- **R1** A match is **best of 5**: the first to win **3 rounds** wins the match.
- **R2** Who wins a round: rock beats scissors, scissors beats paper, paper beats rock. Same sign = **tie**.
- **R3** A tie gives no point to anyone. It doesn't count toward the 3 wins, and the match continues.
- **R4** A round starts when I click **"Play"** (or press **Space**). A countdown shows **"3", "2", "1", "Shoot!"**,
  about **1 second per step**.
- **R5** At "Shoot!" my sign is read. To avoid one bad video frame, the app averages the model's predictions
  over the last ~0.3 seconds before "Shoot!".
  If a hand was seen in fewer than half of those frames, it counts as "no hand" (R7).
- **R6** A sign is accepted only if the top class has a confidence of **≥ 70%**.
- **R7** If no hand is seen, or confidence is < 70%, the round is **redone**:
  a message says why (e.g. "I couldn't see your hand, try again"), and nobody gets a point.
- **R8** The computer's move is **random** (each sign has a 1/3 chance), and it is chosen **without looking at my sign**.
- **R9** When the match ends, the winner is announced. **"Play again"** resets the score and the round history.

## 2. Game screen

- **R10** The webcam preview is shown **mirrored**, like a mirror.
- **R11** The detected hand **skeleton** (21 points + lines) is drawn on top of the video, live.
- **R12** **Live prediction bars** show the 3 classes (rock / paper / scissors) with their confidence in %.
- **R13** The **score** (me vs computer) is always visible.
- **R14** A **round history** lists each round: my sign, the computer's sign, the result (win / loss / tie).
  Redone rounds (R7) are not listed.
- **R15** Light animations for the countdown and the result reveal. **No sound** in v1.
- **R16** While the AI models load, a loading message is shown and "Play" is disabled.

## 3. Camera and privacy

- **R17** The video is processed **only in my browser**. No image, video or landmark is ever sent to a server.
  The site says so clearly ("Your video never leaves your computer").
- **R18** If the camera is **refused, missing, or used by another app**, a clear message explains why the camera
  is needed, that the video stays on the computer, and how to allow it. The game can't start without a camera.

## 4. Hand recognition (the AI)

- **R19** The **MediaPipe Hand Landmarker** (a ready-made Google model) finds the hand and gives **21 points**
  (x, y, z), which is **63 numbers**.
  The app uses MediaPipe's **world landmarks** (in meters, not pixels), so the hand's shape doesn't depend on
  the camera's image size. The dataset stores these raw points + the hand side (normalization happens after).
  Only one hand is used. If two are seen, the one MediaPipe is most sure about is used.
- **R20** Before reaching my model, the points are **normalized** in the same way in Python and in TypeScript:
  - a **left hand is mirrored** so it looks like a right hand (one model works for both hands);
  - points are **centered on the wrist** and **scaled by the hand size** (wrist → middle-finger knuckle = 1),
    so the position in the image and the distance to the camera don't matter.
- **R21** The Python and TypeScript normalizations give **the same numbers** for the same input (a shared test file checks this).
- **R22** My model has **3 classes**: rock, paper, scissors. Any hand is read as the nearest sign; the 70% threshold
  (R6) is the only guard against unclear poses. (Changed 2026-10-07: a 4th class "none" was tried, but with too
  little variety in its samples it confused the real signs. It may come back later, see L7.)
  The `/collect` page can still record "none" samples; training ignores them in v1.
- **R23** My model is a small neural network (an **MLP**) trained with **PyTorch**, exported to **ONNX**, and run in the
  browser with **ONNX Runtime Web**.
  Training uses **data augmentation**: each epoch, the training samples are slightly rotated (up to ±15°) and get
  a little random noise, so the model sees new variations of my poses and overfits less.
- **R24** The ONNX model gives the same predictions as the PyTorch model on the same inputs (small tolerance).
- **R25** Part of the data (about 20%) is kept aside as a **test set** that the model never trains on.
  A test **fails if accuracy on it is below 90%**. This is a safety alarm, not the goal.
  The split keeps **blocks of ~20 consecutive samples** (~2 s) together, in training *or* test: samples
  recorded 0.1 s apart are near-copies, and splitting them would make the test too easy ("data leakage").
  About 20% of **each class** goes to the test ("stratified").
- **R26** Dataset size: start with about **200 samples per class**. Record more if playing doesn't feel good,
  or stop earlier if it already does. The final call is how it feels while playing.
- **R27** Training saves its results (accuracy, confusion matrix, samples per class) to a file that the website reads
  (see R33), so the numbers shown are always the real ones.

## 5. Data collection page

- **R28** A `/collect` page exists on the live site but is **not linked** from the game
  (and asks search engines not to list it).
- **R29** On it, I choose a class, then **hold Space** to record samples (about 10 per second).
  Keys **1–4** also choose the class. The number of samples per class is shown (with the ~200 goal).
  "Clear all" deletes the recorded samples (after a confirmation), and the page warns before closing
  if some samples were not downloaded.
- **R30** A sample is recorded only if a hand is detected.
- **R31** **Only landmark numbers are saved, never images.** The data is downloaded as a file (JSON) on my computer.
  Nothing is uploaded. Files go in `training/data/`; several files (several sessions) can be combined.
- **R32** The dataset files contain no images, so they can go in the public repo.

## 6. "About the model" section

- **R33** The site has an **"About the model"** section explaining the pipeline
  (capture → landmarks → PyTorch → ONNX → browser), with real numbers from R27: test accuracy, confusion matrix,
  samples per class.

## 7. Design

- **R34** English only.
- **R35** Uses the **portfolio's dark theme colors**. Text keeps a contrast of at least **4.5:1** with backgrounds.
- **R36** Made for **desktop**. On a phone-width screen (360 px) the layout doesn't break (no horizontal scrolling),
  but playing on a phone isn't polished in v1.
- **R37** Works on recent desktop **Chrome and Firefox**.

## 8. Project and tools

- **R38** One public GitHub repo (`rock-paper-scissors`) with two folders:
  `training/` (Python) and `web/` (website).
- **R39** `training/`: Python managed with **uv**, tests with **pytest**.
- **R40** `web/`: **React + TypeScript + Vite** (same stack as the portfolio), tests with **Vitest** + Testing Library,
  lint with **oxlint**.
- **R41** **GitHub Actions** runs the tests and deploys `web/` to **GitHub Pages**. If tests fail, nothing is deployed.
- **R42** **MIT license** (`LICENSE`, "2026 Pierre-Antoine SUT") and a `README.md` explaining the project and pipeline.

---

## Later (not v1)

- **L1** "Smart" computer mode that learns my habits to predict my next move.
- **L2** Polished phone support (front camera, performance).
- **L3** Train with other people's samples (with their consent) so it works better for visitors.
- **L4** Sounds, with a mute button.
- **L5** Light theme (and maybe the other portfolio themes).
- **L6** Add the project to the portfolio ("Projects to show" #3).
- **L7** Bring back a 4th class "none" if non-signs are too often read as signs while playing. Claude gives an
  exact list of poses to record (clearly not signs, varied), then R6, R7, R12 and R22 are updated.
