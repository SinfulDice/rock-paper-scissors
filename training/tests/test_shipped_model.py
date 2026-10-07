"""Checks on the model that is actually shipped to the website (made by `uv run rps-train`)."""

import json

import numpy as np
import onnxruntime as ort

from rps.dataset import CLASSES
from rps.train import INFO_PATH, ONNX_PATH


def test_r25_shipped_model_reaches_90_percent_on_the_test_set():
    # The safety alarm: if this fails, the model must not go on the website.
    info = json.loads(INFO_PATH.read_text())
    assert info["testAccuracy"] >= 0.90, f"test accuracy {info['testAccuracy']:.1%} is below 90%"


def test_r27_shipped_info_has_classes_counts_and_confusion_matrix():
    info = json.loads(INFO_PATH.read_text())
    assert info["classes"] == CLASSES
    assert set(info["samples"]["test"]) == set(CLASSES)
    matrix = np.array(info["confusionMatrix"])
    assert matrix.shape == (len(CLASSES), len(CLASSES))
    assert matrix.sum() == sum(info["samples"]["test"].values())


def test_r24_shipped_onnx_model_gives_3_probabilities():
    session = ort.InferenceSession(str(ONNX_PATH))
    out = session.run(["probabilities"], {"landmarks": np.zeros((1, 63), dtype=np.float32)})[0]
    assert out.shape == (1, len(CLASSES))
    assert abs(out.sum() - 1) < 1e-5
