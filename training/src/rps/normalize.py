"""R20: turns the 21 raw hand points from MediaPipe into the 63 numbers the model sees.

The exact same steps exist in TypeScript (web/src/ai/normalize.ts). R21 checks that both
give the same numbers, using the shared file shared/normalize_cases.json.
"""

import numpy as np

NUM_POINTS = 21  # MediaPipe gives 21 points per hand
WRIST = 0  # point 0 = the wrist
MIDDLE_KNUCKLE = 9  # point 9 = where the middle finger meets the palm


def normalize(points: list[list[float]], handedness: str) -> list[float]:
    """Returns 63 numbers: x, y, z of each point, after these 3 steps:

    1. center: move the hand so the wrist is at (0, 0, 0) -> the position doesn't matter;
    2. scale: divide by the wrist-to-middle-knuckle length -> the hand size doesn't matter;
    3. mirror: flip x for a "Left" hand -> it looks like a right hand, one model for both.

    `points` are MediaPipe's "world landmarks" (in meters, not pixels), so the shape
    doesn't depend on the camera's image size.
    """
    # np.array turns the list of lists into a 21 x 3 table of numbers (a "matrix").
    p = np.array(points, dtype=np.float64)
    if p.shape != (NUM_POINTS, 3):
        raise ValueError(f"expected {NUM_POINTS} points of 3 numbers, got shape {p.shape}")
    if handedness not in ("Left", "Right"):
        raise ValueError(f"handedness must be 'Left' or 'Right', got {handedness!r}")

    # 1. Center. numpy subtracts the wrist row from EVERY row at once (called "broadcasting").
    p = p - p[WRIST]

    # 2. Scale. np.linalg.norm = the length of a vector: sqrt(x² + y² + z²).
    size = np.linalg.norm(p[MIDDLE_KNUCKLE])
    if size == 0:
        raise ValueError("hand size is 0: wrist and middle knuckle are at the same place")
    p = p / size

    # 3. Mirror. p[:, 0] means "column 0 (x) of every row".
    if handedness == "Left":
        p[:, 0] = -p[:, 0]

    # .flatten() turns 21 rows x 3 columns into one list of 63 numbers.
    return p.flatten().tolist()
