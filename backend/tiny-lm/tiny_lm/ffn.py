"""Position-wise feed-forward network."""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class FeedForwardNetwork(nn.Module):
    """Two-layer MLP with GELU activation.

    Args:
        d_model: Input/output dimension.
        d_ff: Inner dimension (defaults to ``4 * d_model``).
    """

    def __init__(self, d_model: int, d_ff: int | None = None) -> None:
        super().__init__()
        if d_ff is None:
            d_ff = 4 * d_model
        self.d_ff = d_ff
        self.fc1 = nn.Linear(d_model, d_ff)
        self.fc2 = nn.Linear(d_ff, d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Apply FFN: Linear → GELU → Linear.

        Args:
            x: Input tensor of any shape ``[..., d_model]``.

        Returns:
            Output tensor with the same shape as ``x``.
        """
        return self.fc2(F.gelu(self.fc1(x)))
