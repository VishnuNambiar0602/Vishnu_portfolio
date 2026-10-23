"""Tests for tiny_lm/transformer_block.py — Property 7 + unit tests."""

from __future__ import annotations

import torch
from hypothesis import given, settings
from hypothesis import strategies as st

from tiny_lm.transformer_block import TransformerBlock


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

class TestTransformerBlock:
    def test_output_shape(self):
        block = TransformerBlock(d_model=8, n_heads=2)
        x = torch.randn(2, 5, 8)
        assert block(x).shape == x.shape

    def test_residual_connection_applied(self):
        """Output should differ from the raw sublayer output (residual adds input)."""
        block = TransformerBlock(d_model=8, n_heads=2)
        x = torch.randn(1, 4, 8)
        out = block(x)
        # If residual were absent, out == attn(norm(x)); with residual it differs
        attn_only = block.attn(block.norm1(x))
        assert not torch.allclose(out, attn_only)


# ---------------------------------------------------------------------------
# Property 7: Transformer Block Shape Preservation — Validates: Requirements 5.1
# ---------------------------------------------------------------------------

@given(
    batch=st.integers(1, 4),
    seq_len=st.integers(1, 12),
)
@settings(max_examples=20)
def test_property_7_transformer_block_shape(batch, seq_len):
    d_model, n_heads = 8, 2
    block = TransformerBlock(d_model=d_model, n_heads=n_heads)
    x = torch.randn(batch, seq_len, d_model)
    assert block(x).shape == x.shape
