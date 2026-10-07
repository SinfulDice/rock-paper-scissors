"""Loading the recorded samples (R31) and splitting them into training and test sets (R25)."""

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from rps.normalize import NUM_POINTS, normalize

# R22: the 3 classes, in the SAME order as SIGNS in web/src/game/signs.ts.
# The model answers with 3 numbers; this order says which number is which class.
CLASSES = ["rock", "paper", "scissors"]
# Labels the /collect page can record. "none" samples are kept in the files for later (L7),
# but skipped when loading in v1.
RECORD_LABELS = [*CLASSES, "none"]

BLOCK_SIZE = 20  # R25: ~2 seconds of recording (10 samples/s) stay together, train OR test


# @dataclass writes the boring parts of a class for us (__init__, printing, ==).
# frozen=True: a Sample can't be changed after it's created.
@dataclass(frozen=True)
class Sample:
    label: str
    handedness: str
    points: list[list[float]]
    block: str  # which recording block it comes from, e.g. "file.json#3" (for the split)


def load_samples(data_dir: Path) -> list[Sample]:
    """Reads every .json file of `data_dir` (R31: several sessions are combined).

    Only samples of the model's CLASSES are returned ("none" is skipped in v1, R22).
    """
    files = sorted(data_dir.glob("*.json"))
    if not files:
        raise ValueError(f"no .json files in {data_dir}")
    samples: list[Sample] = []
    for file in files:
        samples += _load_file(file)
    return [s for s in samples if s.label in CLASSES]


def _load_file(file: Path) -> list[Sample]:
    data = json.loads(file.read_text())
    if data.get("format") != "rps-landmarks" or data.get("version") != 1:
        raise ValueError(f"{file.name}: not an rps-landmarks v1 file")

    samples = []
    # Samples are in recording order. A new block starts every BLOCK_SIZE samples, and also
    # whenever the label changes (you switched class), so a block holds only one class.
    block, count_in_block, previous_label = 0, 0, None
    for i, s in enumerate(data["samples"]):
        if s["label"] not in RECORD_LABELS:
            raise ValueError(f"{file.name}, sample {i}: unknown label {s['label']!r}")
        if len(s["points"]) != NUM_POINTS or any(len(p) != 3 for p in s["points"]):
            raise ValueError(f"{file.name}, sample {i}: expected {NUM_POINTS} points of 3 numbers")
        if s["label"] != previous_label or count_in_block == BLOCK_SIZE:
            block, count_in_block = block + 1, 0
        count_in_block += 1
        previous_label = s["label"]
        samples.append(Sample(s["label"], s["handedness"], s["points"], f"{file.name}#{block}"))
    return samples


def to_arrays(samples: list[Sample]) -> tuple[np.ndarray, np.ndarray]:
    """Turns samples into what the model eats: X = normalized points (R20), y = class numbers.

    X has one row of 63 numbers per sample. y has one class number per sample (0 = rock...).
    """
    X = np.array([normalize(s.points, s.handedness) for s in samples], dtype=np.float32)
    y = np.array([CLASSES.index(s.label) for s in samples], dtype=np.int64)
    return X, y


def split(samples: list[Sample], test_fraction: float = 0.2, seed: int = 0) -> tuple[list[Sample], list[Sample]]:
    """R25: keeps about `test_fraction` of each class aside for testing, by whole blocks.

    Whole blocks, because samples recorded 0.1 s apart are near-copies: if one were in training and
    its twin in the test, the test would be too easy ("data leakage").
    Per class ("stratified"), so the test has every class in the same proportion as the data.
    """
    rng = np.random.default_rng(seed)
    test_blocks: set[str] = set()
    for label in CLASSES:
        blocks = sorted({s.block for s in samples if s.label == label})
        rng.shuffle(blocks)  # random order, but always the same for the same seed
        target = round(sum(s.label == label for s in samples) * test_fraction)
        taken = 0
        for b in blocks:  # take blocks while it brings us closer to test_fraction of this class
            size = sum(s.block == b for s in samples)
            if abs(taken + size - target) >= abs(taken - target):
                continue  # this block would overshoot more than it helps: try a smaller one
            test_blocks.add(b)
            taken += size

    train = [s for s in samples if s.block not in test_blocks]
    test = [s for s in samples if s.block in test_blocks]
    return train, test
