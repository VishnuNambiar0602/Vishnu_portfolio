"""Tests for tiny_lm/model.py — Property 8 + unit tests."""

from __future__ import annotations

import pytest
import torch
from hypothesis import given, settings
from hypothesis import strategies as st

from tiny_lm.config import ConfigError, ModelConfig
from tiny_lm.model import TinyLM


def _small_config(**overrides) -> ModelConfig:
    cfg = dict(d_model=8, n_heads=2, n_layers=2, d_ff=16, max_seq_len=32, vocab_size=20)
    cfg.update(overrides)
    return ModelConfig(**cfg)


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

class TestTinyLM:
    def test_num_parameters_positive(self):
        model = TinyLM(_small_config())
        assert model.num_parameters() > 0

    def test_logits_shape(self):
        model = TinyLM(_small_config())
        ids = torch.randint(0, 20, (2, 6))
        logits = model(ids)
        assert logits.shape == (2, 6, 20)

    def test_n_layers_zero_raises(self):
        with pytest.raises(ConfigError):
            TinyLM(_small_config(n_layers=0))

    def test_n_layers_negative_raises(self):
        with pytest.raises(ConfigError):
            TinyLM(_small_config(n_layers=-1))


# ---------------------------------------------------------------------------
# Property 8: Logits Output Shape — Validates: Requirements 5.3
# ---------------------------------------------------------------------------

@given(
    batch=st.integers(1, 4),
    seq_len=st.integers(1, 10),
)
@settings(max_examples=20)
def test_property_8_logits_output_shape(batch, seq_len):
    vocab_size = 20
    model = TinyLM(_small_config(vocab_size=vocab_size))
    ids = torch.randint(0, vocab_size, (batch, seq_len))
    logits = model(ids)
    assert logits.shape == (batch, seq_len, vocab_size)
