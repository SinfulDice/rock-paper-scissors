"""Training with augmentation (R23), evaluation (R25, R27) and ONNX export (R24).

Run everything with:  uv run rps-train
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from torch import nn

from rps.dataset import CLASSES, load_samples, split, to_arrays
from rps.model import INPUT_SIZE, HandSignClassifier, WithProbabilities

ROOT = Path(__file__).resolve().parents[3]  # the rock-paper-scissors/ folder
DATA_DIR = ROOT / "training" / "data"
ONNX_PATH = ROOT / "web" / "public" / "models" / "rps_classifier.onnx"
INFO_PATH = ROOT / "web" / "src" / "ai" / "modelInfo.json"


MAX_ROTATION_DEG = 15  # R23 augmentation: random rotation of up to ±15° around each axis
NOISE = 0.02  # R23 augmentation: random noise, 2% of the wrist-to-knuckle length


def random_rotations(n: int, rng: np.random.Generator) -> np.ndarray:
    """n random 3D rotation matrices, each up to ±MAX_ROTATION_DEG around the x, y and z axes.

    A rotation matrix R turns a point p into R @ p: the same point, turned around (0, 0, 0).
    """
    ax, ay, az = np.radians(rng.uniform(-MAX_ROTATION_DEG, MAX_ROTATION_DEG, size=(3, n)))
    c, s = np.cos, np.sin
    one, zero = np.ones(n), np.zeros(n)
    # One matrix per axis (the standard formulas), for all n rotations at once: shape (n, 3, 3).
    Rx = np.stack([one, zero, zero, zero, c(ax), -s(ax), zero, s(ax), c(ax)], axis=1).reshape(n, 3, 3)
    Ry = np.stack([c(ay), zero, s(ay), zero, one, zero, -s(ay), zero, c(ay)], axis=1).reshape(n, 3, 3)
    Rz = np.stack([c(az), -s(az), zero, s(az), c(az), zero, zero, zero, one], axis=1).reshape(n, 3, 3)
    return Rz @ Ry @ Rx  # "@" = matrix product: first turn around x, then y, then z


def augment(X: np.ndarray, rng: np.random.Generator, noise: float = NOISE) -> np.ndarray:
    """R23: a slightly different copy of each sample: rotated a bit, plus a little noise.

    The model then sees new variations of the same poses at each epoch, so it can't just memorize
    them ("overfitting"). Done on normalized samples: the wrist stays at (0, 0, 0).
    """
    points = X.reshape(-1, 21, 3)  # back to 21 points of (x, y, z) per sample
    R = random_rotations(len(points), rng)
    # Rotate every point of every sample: for sample n, point k -> R[n] @ point[n, k].
    rotated = np.einsum("nij,nkj->nki", R, points)
    jitter = rng.normal(0, noise, size=rotated.shape)
    jitter[:, 0] = 0  # keep the wrist exactly at (0, 0, 0), like after normalization (R20)
    return (rotated + jitter).reshape(-1, 63).astype(np.float32)


def train_model(X: np.ndarray, y: np.ndarray, epochs: int = 150, seed: int = 0) -> HandSignClassifier:
    """R23: trains the network on X (n x 63 numbers) and y (n class numbers).

    Training = repeat many times: guess, measure how wrong (the "loss"), adjust the weights a bit.
    One "epoch" = one pass over all the training samples.
    """
    torch.manual_seed(seed)  # same seed -> same starting weights -> same result every run
    model = HandSignClassifier()
    # CrossEntropyLoss: big when the model gives a low probability to the right class.
    loss_fn = nn.CrossEntropyLoss()
    # Adam: the "optimizer", the algorithm that adjusts the weights to lower the loss.
    # lr = learning rate = the size of each adjustment step.
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

    # torch.from_numpy: numpy table -> PyTorch "tensor" (the same idea, but PyTorch can learn with it).
    y_t = torch.from_numpy(y)
    generator = torch.Generator().manual_seed(seed)
    rng = np.random.default_rng(seed)

    model.train()  # "training mode": dropout is on
    for _ in range(epochs):
        X_t = torch.from_numpy(augment(X, rng))  # R23: new random variations at every epoch
        # Shuffle, then go through the data in small groups ("mini-batches") of 32 samples.
        order = torch.randperm(len(X_t), generator=generator)
        for start in range(0, len(order), 32):
            batch = order[start : start + 32]
            optimizer.zero_grad()  # forget the previous step's adjustments
            loss = loss_fn(model(X_t[batch]), y_t[batch])  # 1. guess and measure the error
            loss.backward()  # 2. compute which way to move each weight ("gradients")
            optimizer.step()  # 3. move the weights a little in that direction
    model.eval()  # "evaluation mode": dropout off, for real predictions
    return model


def predict(model: HandSignClassifier, X: np.ndarray) -> np.ndarray:
    """Returns the most likely class number for each row of X."""
    with torch.no_grad():  # no learning here, so PyTorch doesn't need to track gradients
        return model(torch.from_numpy(X)).argmax(dim=1).numpy()


def confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray) -> list[list[int]]:
    """R27: matrix[true][predicted] = how many samples of class `true` were predicted as `predicted`.

    The diagonal (true == predicted) is the correct answers; everything else shows the mix-ups.
    """
    matrix = np.zeros((len(CLASSES), len(CLASSES)), dtype=int)
    for t, p in zip(y_true, y_pred):
        matrix[t, p] += 1
    return matrix.tolist()


def export_onnx(model: HandSignClassifier, path: Path) -> None:
    """R23 + R24: saves the model (with softmax) as an ONNX file the browser can run.

    The batch size (how many hands at once) is "dynamic": the browser sends 1, tests send many.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    example = torch.zeros(1, INPUT_SIZE)  # an example input: PyTorch follows it to record the model
    torch.onnx.export(
        WithProbabilities(model).eval(),
        (example,),
        str(path),
        input_names=["landmarks"],
        output_names=["probabilities"],
        dynamic_shapes={"x": {0: torch.export.Dim("batch")}},
        external_data=False,  # keep everything in one single .onnx file
    )


def main() -> None:
    samples = load_samples(DATA_DIR)
    train_samples, test_samples = split(samples)
    X_train, y_train = to_arrays(train_samples)
    X_test, y_test = to_arrays(test_samples)
    print(f"{len(samples)} samples: {len(train_samples)} for training, {len(test_samples)} for testing")

    model = train_model(X_train, y_train)
    y_pred = predict(model, X_test)
    accuracy = float((y_pred == y_test).mean())
    train_accuracy = float((predict(model, X_train) == y_train).mean())

    export_onnx(model, ONNX_PATH)
    info = {
        "classes": CLASSES,
        "trainedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "samples": {
            "train": {c: int((y_train == i).sum()) for i, c in enumerate(CLASSES)},
            "test": {c: int((y_test == i).sum()) for i, c in enumerate(CLASSES)},
        },
        "trainAccuracy": round(train_accuracy, 4),
        "testAccuracy": round(accuracy, 4),
        "confusionMatrix": confusion_matrix(y_test, y_pred),
    }
    INFO_PATH.write_text(json.dumps(info, indent=2) + "\n")

    print(f"accuracy on training data: {train_accuracy:.1%}")
    print(f"accuracy on test data:     {accuracy:.1%}  (R25 safety floor: 90%)")
    print("confusion matrix (rows = true class, columns = predicted):")
    print("          " + "".join(f"{c:>10}" for c in CLASSES))
    for c, row in zip(CLASSES, info["confusionMatrix"]):
        print(f"{c:>10}" + "".join(f"{n:>10}" for n in row))
    print(f"saved {ONNX_PATH.relative_to(ROOT)} and {INFO_PATH.relative_to(ROOT)}")
