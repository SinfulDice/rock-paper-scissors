import json

import numpy as np
import pytest

from rps.dataset import BLOCK_SIZE, CLASSES, load_samples, split, to_arrays


def test_r31_all_files_of_the_folder_are_combined(data_dir):
    samples = load_samples(data_dir)
    assert len(samples) == 300  # 400 recorded - 100 "none" (skipped, R22)
    assert sum(s.label == "scissors" for s in samples) == 100  # 60 from session 1 + 40 from session 2


def test_r22_none_samples_are_skipped_in_v1(data_dir):
    assert all(s.label != "none" for s in load_samples(data_dir))


def test_r31_an_unknown_label_is_refused(data_dir):
    data = json.loads((data_dir / "session2.json").read_text())
    data["samples"][0]["label"] = "lizard"
    (data_dir / "session2.json").write_text(json.dumps(data))
    with pytest.raises(ValueError, match="lizard"):
        load_samples(data_dir)


def test_r31_a_file_with_the_wrong_format_is_refused(data_dir):
    (data_dir / "bad.json").write_text(json.dumps({"format": "something-else", "samples": []}))
    with pytest.raises(ValueError, match="bad.json"):
        load_samples(data_dir)


def test_r31_a_sample_with_a_wrong_shape_is_refused(data_dir):
    good = json.loads((data_dir / "session2.json").read_text())
    good["samples"][0]["points"] = good["samples"][0]["points"][:20]
    (data_dir / "session2.json").write_text(json.dumps(good))
    with pytest.raises(ValueError, match="21 points"):
        load_samples(data_dir)


def test_r31_an_empty_folder_is_refused(tmp_path):
    with pytest.raises(ValueError):
        load_samples(tmp_path)


def test_r22_classes_are_the_3_signs_in_order():
    assert CLASSES == ["rock", "paper", "scissors"]


def test_r20_arrays_hold_63_normalized_numbers_and_class_numbers(data_dir):
    X, y = to_arrays(load_samples(data_dir))
    assert X.shape == (300, 63)
    assert X[:, 0:3] == pytest.approx(0)  # R20: the wrist is at 0 in every sample
    assert set(y.tolist()) == {0, 1, 2}


def test_r25_blocks_hold_consecutive_samples_of_one_class(data_dir):
    samples = load_samples(data_dir)
    for block in {s.block for s in samples}:
        in_block = [s for s in samples if s.block == block]
        assert len(in_block) <= BLOCK_SIZE
        assert len({s.label for s in in_block}) == 1


def test_r25_about_20_percent_of_each_class_goes_to_the_test(data_dir):
    samples = load_samples(data_dir)
    train, test = split(samples)
    assert len(train) + len(test) == len(samples)
    for label in CLASSES:
        total = sum(s.label == label for s in samples)
        in_test = sum(s.label == label for s in test)
        assert in_test == pytest.approx(total * 0.2, abs=BLOCK_SIZE)  # whole blocks: not exact


def test_r25_no_block_is_both_in_training_and_test(data_dir):
    train, test = split(load_samples(data_dir))
    assert {s.block for s in train}.isdisjoint({s.block for s in test})


def test_r25_the_split_is_the_same_every_time(data_dir):
    samples = load_samples(data_dir)
    assert split(samples) == split(samples)
    assert split(samples, seed=1) != split(samples, seed=2)
