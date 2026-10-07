import json
from pathlib import Path

import numpy as np
import pytest

from rps.normalize import MIDDLE_KNUCKLE, WRIST, normalize

CASES = json.loads((Path(__file__).resolve().parents[2] / "shared" / "normalize_cases.json").read_text())["cases"]


def hand(seed: int = 0) -> list[list[float]]:
    """A fake hand: 21 random points (fixed seed, so always the same)."""
    return np.random.default_rng(seed).uniform(-0.1, 0.1, size=(21, 3)).tolist()


def as_points(flat: list[float]) -> np.ndarray:
    """63 numbers back into 21 rows of (x, y, z), to check single points."""
    return np.array(flat).reshape(21, 3)


def test_r20_output_is_63_numbers():
    assert len(normalize(hand(), "Right")) == 63


def test_r20_wrist_is_moved_to_zero():
    assert as_points(normalize(hand(), "Right"))[WRIST] == pytest.approx([0, 0, 0])


def test_r20_wrist_to_middle_knuckle_length_becomes_1():
    assert np.linalg.norm(as_points(normalize(hand(), "Right"))[MIDDLE_KNUCKLE]) == pytest.approx(1)


def test_r20_position_in_the_image_does_not_matter():
    moved = (np.array(hand()) + [0.3, -0.2, 0.05]).tolist()  # same hand, somewhere else
    assert normalize(moved, "Right") == pytest.approx(normalize(hand(), "Right"))


def test_r20_hand_size_does_not_matter():
    bigger = (np.array(hand()) * 1.7).tolist()  # same shape, 1.7 times bigger
    assert normalize(bigger, "Right") == pytest.approx(normalize(hand(), "Right"))


def test_r20_left_hand_is_the_mirror_of_the_right_hand():
    right = as_points(normalize(hand(), "Right"))
    left = as_points(normalize(hand(), "Left"))
    assert left[:, 0] == pytest.approx(-right[:, 0])  # x flipped
    assert left[:, 1:] == pytest.approx(right[:, 1:])  # y and z unchanged


def test_r20_rejects_wrong_input():
    with pytest.raises(ValueError):
        normalize(hand()[:20], "Right")  # only 20 points
    with pytest.raises(ValueError):
        normalize(hand(), "left")  # must be "Left" or "Right"
    with pytest.raises(ValueError):
        normalize([[0.0, 0.0, 0.0]] * 21, "Right")  # every point at the same place: size 0


@pytest.mark.parametrize("case", CASES)
def test_r21_python_matches_the_shared_cases(case):
    assert normalize(case["points"], case["handedness"]) == pytest.approx(case["expected"])
