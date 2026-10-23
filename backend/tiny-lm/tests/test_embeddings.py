"""Tests for tiny_lm/embeddings.py — Property 3 + unit tests."""

from __future__ import annotations

import pytest
import torch
from hypothesis import given, settings
from hypothesis import strategies as st

from tiny_lm.config import ConfigError
from tiny_lm.embeddings import EmbeddingLayer


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

class TestEmbeddingLayer:
    def test_output_shape(self):
        layer = EmbeddingLayer(vocab_size=50, d_model=16)
        x = torch.randint(0, 50, (2, 8))
        assert layer(x).shape == (2, 8, 16)

    def test_positional_encoding_added(self):
        layer = EmbeddingLayer(vocab_size=50, d_model=16)
        x = torch.zeros(1, 4, dtype=torch.long)
        out = layer(x)
        # All same token IDs — output should differ across positions due to PE
        assert not torch.allclose(out[0, 0], out[0, 1])

    def test_odd_d_model_raises(self):
        with pytest.raises(ConfigError):
            EmbeddingLayer(vocab_size=50, d_model=7)

    def test_zero_d_model_raises(self):
        with pytest.raises(ConfigError):
            EmbeddingLayer(vocab_size=50, d_model=0)

    def test_negative_d_model_raises(self):
        with pytest.raises(ConfigError):
            EmbeddingLayer(vocab_size=50, d_model=-4)


# ---------------------------------------------------------------------------
# Property 3: Embedding Output Shape — Validates: Requirements 2.4
# ---------------------------------------------------------------------------

@given(
    batch=st.integers(min_value=1, max_value=4),
    seq_len=st.integers(min_value=1, max_value=16),
    d_model=st.integers(min_value=1, max_value=8).map(lambda x: x * 2),  # even
)
@settings(max_examples=20)
def test_property_3_embedding_output_shape(batch, seq_len, d_model):
    vocab_size = 32
    layer = EmbeddingLayer(vocab_size=vocab_size, d_model=d_model)
    token_ids = torch.randint(0, vocab_size, (batch, seq_len))
    out = layer(token_ids)
    assert out.shape == (batch, seq_len, d_model)
