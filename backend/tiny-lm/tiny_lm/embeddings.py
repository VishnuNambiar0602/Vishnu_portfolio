"""Embedding layer with sinusoidal positional encoding."""

from __future__ import annotations

import math

import torch
import torch.nn as nn

from tiny_lm.config import ConfigError


class EmbeddingLayer(nn.Module):
    """Token embeddings + sinusoidal positional encoding.

    Args:
        vocab_size: Number of tokens in the vocabulary.
        d_model: Embedding dimension (must be a positive even integer).

    Raises:
        ConfigError: If ``d_model`` is not a positive even integer.
    """

    def __init__(self, vocab_size: int, d_model: int) -> None:
        if not isinstance(d_model, int) or d_model <= 0 or d_model % 2 != 0:
            raise ConfigError(
                f"d_model must be a positive even integer, got {d_model}"
            )
        super().__init__()
        self.d_model = d_model
        self.token_emb = nn.Embedding(vocab_size, d_model)
        # Pre-compute positional encoding up to a large max length
        self.register_buffer("pe", self._build_pe(4096, d_model))

    @staticmethod
    def _build_pe(max_len: int, d_model: int) -> torch.Tensor:
        """Build sinusoidal positional encoding matrix [max_len, d_model]."""
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(max_len).unsqueeze(1).float()
        div = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        return pe  # [max_len, d_model]

    def forward(self, token_ids: torch.Tensor) -> torch.Tensor:
        """Return embeddings + positional encoding.

        Args:
            token_ids: Integer tensor of shape ``[batch, seq_len]``.

        Returns:
            Float tensor of shape ``[batch, seq_len, d_model]``.
        """
        seq_len = token_ids.size(1)
        x = self.token_emb(token_ids)          # [batch, seq_len, d_model]
        x = x + self.pe[:seq_len]              # broadcast over batch
        return x
