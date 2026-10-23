"""Transformer block: pre-norm variant with residual connections."""

from __future__ import annotations

import torch
import torch.nn as nn

from tiny_lm.attention import MultiHeadAttention
from tiny_lm.ffn import FeedForwardNetwork


class TransformerBlock(nn.Module):
    """One transformer layer using pre-norm: LayerNorm → sublayer → residual add.

    Args:
        d_model: Model dimension.
        n_heads: Number of attention heads.
        d_ff: FFN inner dimension (defaults to ``4 * d_model``).
    """

    def __init__(
        self, d_model: int, n_heads: int, d_ff: int | None = None
    ) -> None:
        super().__init__()
        self.norm1 = nn.LayerNorm(d_model)
        self.attn = MultiHeadAttention(d_model, n_heads)
        self.norm2 = nn.LayerNorm(d_model)
        self.ffn = FeedForwardNetwork(d_model, d_ff)

    def forward(
        self, x: torch.Tensor, mask: torch.Tensor | None = None
    ) -> torch.Tensor:
        """Forward pass with pre-norm and residual connections.

        Args:
            x: Input tensor ``[batch, seq_len, d_model]``.
            mask: Optional causal mask.

        Returns:
            Output tensor ``[batch, seq_len, d_model]``.
        """
        # Pre-norm attention sub-layer
        x = x + self.attn(self.norm1(x), mask)
        # Pre-norm FFN sub-layer
        x = x + self.ffn(self.norm2(x))
        return x
