"""Scaled dot-product attention and multi-head attention."""

from __future__ import annotations

import math

import torch
import torch.nn as nn
import torch.nn.functional as F

from tiny_lm.config import ConfigError


class AttentionHead(nn.Module):
    """Single scaled dot-product attention head with causal masking.

    Args:
        d_model: Full model dimension.
        d_head: Dimension of this head's query/key/value projections.
    """

    def __init__(self, d_model: int, d_head: int) -> None:
        super().__init__()
        self.d_head = d_head
        self.q = nn.Linear(d_model, d_head, bias=False)
        self.k = nn.Linear(d_model, d_head, bias=False)
        self.v = nn.Linear(d_model, d_head, bias=False)

    def forward(
        self, x: torch.Tensor, mask: torch.Tensor | None = None
    ) -> torch.Tensor:
        """Compute attention output.

        Args:
            x: Input tensor ``[batch, seq_len, d_model]``.
            mask: Optional boolean causal mask ``[seq_len, seq_len]``.

        Returns:
            Output tensor ``[batch, seq_len, d_head]``.
        """
        Q = self.q(x)  # [batch, seq_len, d_head]
        K = self.k(x)
        V = self.v(x)

        scale = math.sqrt(self.d_head)
        scores = torch.bmm(Q, K.transpose(1, 2)) / scale  # [batch, seq, seq]

        if mask is None:
            seq_len = x.size(1)
            mask = torch.triu(
                torch.ones(seq_len, seq_len, device=x.device), diagonal=1
            ).bool()

        # Mask future positions with -inf so softmax gives 0
        scores = scores.masked_fill(mask.unsqueeze(0), float("-inf"))
        weights = F.softmax(scores, dim=-1)
        return torch.bmm(weights, V)


class MultiHeadAttention(nn.Module):
    """Multi-head attention: splits into n_heads, runs in parallel, projects back.

    Args:
        d_model: Model dimension.
        n_heads: Number of attention heads (must evenly divide d_model).

    Raises:
        ConfigError: If ``n_heads`` does not evenly divide ``d_model``.
    """

    def __init__(self, d_model: int, n_heads: int) -> None:
        if d_model % n_heads != 0:
            raise ConfigError(
                f"n_heads ({n_heads}) must evenly divide d_model ({d_model})"
            )
        super().__init__()
        self.d_head = d_model // n_heads
        self.heads = nn.ModuleList(
            [AttentionHead(d_model, self.d_head) for _ in range(n_heads)]
        )
        self.proj = nn.Linear(d_model, d_model, bias=False)

    def forward(
        self, x: torch.Tensor, mask: torch.Tensor | None = None
    ) -> torch.Tensor:
        """Run all heads in parallel, concatenate, and project.

        Args:
            x: Input tensor ``[batch, seq_len, d_model]``.
            mask: Optional causal mask.

        Returns:
            Output tensor ``[batch, seq_len, d_model]``.
        """
        head_outputs = [h(x, mask) for h in self.heads]
        concat = torch.cat(head_outputs, dim=-1)  # [batch, seq_len, d_model]
        return self.proj(concat)
