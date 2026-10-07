"""Writes shared/normalize_cases.json: example hands + the normalized numbers Python gives.

The TypeScript tests read the same file and check they get the same numbers (R21).
Run it again only if the normalization rules (R20) change:  uv run scripts/make_normalize_cases.py
"""

import json
from pathlib import Path

import numpy as np

from rps.normalize import normalize

OUT = Path(__file__).resolve().parents[2] / "shared" / "normalize_cases.json"

# A fixed "seed" makes the random numbers the same every time, so the file never changes by itself.
rng = np.random.default_rng(seed=42)

cases = []
for handedness in ["Right", "Left", "Right"]:
    # Fake hand: 21 points spread over about 10 cm (world landmarks are in meters).
    points = rng.uniform(-0.1, 0.1, size=(21, 3)).round(6).tolist()
    cases.append({"handedness": handedness, "points": points, "expected": normalize(points, handedness)})

OUT.write_text(json.dumps({"cases": cases}, indent=1) + "\n")
print(f"wrote {len(cases)} cases to {OUT}")
