"""R23: the neural network that turns 63 normalized numbers into 3 class scores."""

import torch
from torch import nn

INPUT_SIZE = 63  # 21 points x 3 numbers
NUM_CLASSES = 3  # rock, paper, scissors (R22)


class HandSignClassifier(nn.Module):
    """A small MLP ("multi-layer perceptron"): 3 layers of artificial neurons.

    63 inputs -> 64 neurons -> 32 neurons -> 3 outputs (one score per class).
    Each nn.Linear layer computes "weighted sums" of its inputs; training finds good weights.
    ReLU (= max(0, x)) between layers lets the network learn curved, not only straight, boundaries.
    Dropout randomly switches off 20% of neurons during training, so the network can't rely on
    one single detail: it generalizes better to new hands ("less overfitting").
    """

    def __init__(self) -> None:
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(INPUT_SIZE, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, NUM_CLASSES),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Returns raw scores called "logits" (any number, not yet probabilities)."""
        return self.layers(x)


class WithProbabilities(nn.Module):
    """Adds softmax at the end, so the exported model directly gives probabilities (R12, R24).

    Softmax turns the 3 logits into 3 numbers between 0 and 1 that add up to 1.
    Example: logits [3.0, 0.5, 0.1] -> probabilities [0.88, 0.07, 0.05].
    """

    def __init__(self, model: HandSignClassifier) -> None:
        super().__init__()
        self.model = model

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return torch.softmax(self.model(x), dim=1)
