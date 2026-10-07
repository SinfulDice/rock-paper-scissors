"""Shared test helpers. pytest automatically loads conftest.py before the tests.

A pytest "fixture" is a function marked @pytest.fixture: a test that has a parameter with the
same name receives what the fixture returns. pytest prepares it fresh for each test.
"""

import json
from pathlib import Path

import numpy as np
import pytest

from rps.dataset import RECORD_LABELS


def fake_hand(label: str, rng: np.random.Generator) -> list[list[float]]:
    """A fake hand of class `label`: a fixed shape per class + a little noise, moved and resized.

    The shapes are clearly different, so a working model must learn to separate them easily.
    """
    shape = np.random.default_rng(RECORD_LABELS.index(label)).uniform(-0.08, 0.08, size=(21, 3))
    shape[0] = 0  # wrist
    shape[9] = [0, -0.06, 0]  # middle knuckle: gives every hand a non-zero size
    noisy = shape + rng.normal(0, 0.004, size=(21, 3))
    return (noisy * rng.uniform(0.8, 1.2) + rng.uniform(-0.2, 0.2, size=3)).round(6).tolist()


def write_session(path: Path, counts: dict[str, int], seed: int) -> None:
    """Writes a file like the /collect page does, with `counts[label]` samples per class in a row."""
    rng = np.random.default_rng(seed)
    samples = [
        {"label": label, "handedness": "Right" if i % 2 else "Left", "points": fake_hand(label, rng)}
        for label, n in counts.items()
        for i in range(n)
    ]
    path.write_text(json.dumps({"format": "rps-landmarks", "version": 1, "createdAt": "x", "samples": samples}))


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    """A folder with 2 recording sessions (tmp_path = a new empty temporary folder from pytest)."""
    write_session(tmp_path / "session1.json", {"rock": 100, "paper": 100, "scissors": 60, "none": 40}, seed=1)
    write_session(tmp_path / "session2.json", {"scissors": 40, "none": 60}, seed=2)
    return tmp_path
