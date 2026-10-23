"""Full TinyLM model: embeddings → transformer stack → logit projection."""

from __future__ import annotations

import torch
import torch.nn as nn

from tiny_lm.config import ConfigError, ModelConfig
from tiny_lm.embeddings import EmbeddingLayer
from tiny_lm.transformer_block import TransformerBlock


class TinyLM(nn.Module):
    """Decoder-only transformer language model.

    Args:
        config: ``ModelConfig`` with all hyperparameters.

    Raises:
        ConfigError: If ``config.n_layers < 1``.
    """

    def __init__(self, config: ModelConfig) -> None:
        if config.n_layers < 1:
            raise ConfigError(f"n_layers must be >= 1, got {config.n_layers}")
        super().__init__()
        self.config = config
        self.embedding = EmbeddingLayer(config.vocab_size, config.d_model)
        self.blocks = nn.ModuleList(
            [
                TransformerBlock(config.d_model, config.n_heads, config.d_ff)
                for _ in range(config.n_layers)
            ]
        )
        self.norm = nn.LayerNorm(config.d_model)
        self.head = nn.Linear(config.d_model, config.vocab_size, bias=False)

    def forward(self, token_ids: torch.Tensor) -> torch.Tensor:
        """Run a forward pass and return logits.

        Args:
            token_ids: Integer tensor ``[batch, seq_len]``.

        Returns:
            Logits tensor ``[batch, seq_len, vocab_size]``.
        """
        x = self.embedding(token_ids)
        for block in self.blocks:
            x = block(x)
        x = self.norm(x)
        return self.head(x)

    def num_parameters(self) -> int:
        """Return total number of trainable parameters."""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)
