import numpy as np
import onnxruntime as ort
import pytest
import torch

from rps.dataset import load_samples, split, to_arrays
from rps.model import HandSignClassifier, WithProbabilities
from rps.train import augment, confusion_matrix, export_onnx, predict, train_model


@pytest.fixture
def trained(data_dir):
    """A model trained on the fake data (few epochs: fast), with its test data."""
    train, test = split(load_samples(data_dir))
    X_train, y_train = to_arrays(train)
    X_test, y_test = to_arrays(test)
    return train_model(X_train, y_train, epochs=30), X_test, y_test


def test_r23_the_model_takes_63_numbers_and_gives_3_scores():
    out = HandSignClassifier()(torch.zeros(5, 63))
    assert out.shape == (5, 3)


def test_r23_exported_outputs_are_probabilities_that_add_up_to_1():
    probs = WithProbabilities(HandSignClassifier()).eval()(torch.randn(5, 63))
    assert probs.sum(dim=1).tolist() == pytest.approx([1.0] * 5)
    assert (probs >= 0).all()


def test_r23_training_learns_to_separate_the_classes(trained):
    model, X_test, y_test = trained
    assert (predict(model, X_test) == y_test).mean() > 0.95


def test_r23_training_gives_the_same_model_with_the_same_seed(data_dir):
    X, y = to_arrays(load_samples(data_dir))
    a, b = train_model(X, y, epochs=2), train_model(X, y, epochs=2)
    for pa, pb in zip(a.parameters(), b.parameters()):
        assert torch.equal(pa, pb)


def test_r27_confusion_matrix_counts_true_vs_predicted():
    m = confusion_matrix(np.array([0, 0, 1, 2]), np.array([0, 1, 1, 2]))
    assert m[0] == [1, 1, 0]  # one rock right, one rock taken for paper
    assert m[1] == [0, 1, 0]
    assert m[2] == [0, 0, 1]
    assert sum(map(sum, m)) == 4


def lengths(X: np.ndarray) -> np.ndarray:
    """Distance of each point to the wrist, for each sample."""
    return np.linalg.norm(X.reshape(-1, 21, 3), axis=2)


def test_r23_augmentation_changes_the_samples_but_not_their_shape(data_dir):
    X, _ = to_arrays(load_samples(data_dir))
    out = augment(X, np.random.default_rng(0))
    assert out.shape == X.shape
    assert out.dtype == np.float32
    assert not np.allclose(out, X)  # every epoch sees new variations


def test_r23_augmentation_keeps_the_wrist_at_zero(data_dir):
    X, _ = to_arrays(load_samples(data_dir))
    assert augment(X, np.random.default_rng(0))[:, 0:3] == pytest.approx(0)


def test_r23_rotation_turns_the_hand_without_deforming_it(data_dir):
    # Without noise, a rotation keeps every distance to the wrist: same hand shape, turned.
    X, _ = to_arrays(load_samples(data_dir))
    rotated = augment(X, np.random.default_rng(0), noise=0)
    assert lengths(rotated) == pytest.approx(lengths(X), abs=1e-5)


def test_r23_rotation_stays_small(data_dir):
    # Up to ±15° per axis: the middle knuckle (point 9) moves, but not much.
    X, _ = to_arrays(load_samples(data_dir))
    rotated = augment(X, np.random.default_rng(0), noise=0)
    before, after = X.reshape(-1, 21, 3)[:, 9], rotated.reshape(-1, 21, 3)[:, 9]
    cos_angle = (before * after).sum(axis=1)  # both have length 1 (R20), so this is cos(angle)
    assert np.degrees(np.arccos(np.clip(cos_angle, -1, 1))).max() < 27  # ≤ 15° on each of 3 axes


def test_r24_onnx_model_gives_the_same_probabilities_as_pytorch(trained, tmp_path):
    model, X_test, _ = trained
    path = tmp_path / "model.onnx"
    export_onnx(model, path)

    session = ort.InferenceSession(str(path))  # onnxruntime = the same engine as in the browser
    onnx_probs = session.run(["probabilities"], {"landmarks": X_test})[0]
    with torch.no_grad():
        torch_probs = WithProbabilities(model)(torch.from_numpy(X_test)).numpy()
    assert onnx_probs == pytest.approx(torch_probs, abs=1e-5)


def test_r24_onnx_model_works_with_one_hand_at_a_time(trained, tmp_path):
    model, X_test, _ = trained
    export_onnx(model, tmp_path / "model.onnx")
    session = ort.InferenceSession(str(tmp_path / "model.onnx"))
    out = session.run(["probabilities"], {"landmarks": X_test[:1]})[0]
    assert out.shape == (1, 3)
