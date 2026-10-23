"""Tests for tiny_lm/ffn.py — Property 4 + unit tests."""

from __future__ import annotations

import torch
from hypothesis import given, settings
from hypothesis import strategies as st

from tiny_lm.ffn import FeedForwardNetwork


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

class TestFeedForwardNetwork:
    def test_shape_preservation(self):
        ffn = FeedForwardNetwork(d_model=16)
        x = torch.randn(2, 5, 16)
        assert ffn(x).shape == x.shape

    def test_default_d_ff(self):
        ffn = FeedForwardNetwork(d_model=16)
        assert ffn.d_ff == 64  # 4 * 16

    def test_custom_d_ff(self):
        ffn = FeedForwardNetwork(d_model=16, d_ff=32)
        assert ffn.d_ff == 32
        x = torch.randn(1, 3, 16)
        assert ffn(x).shape == x.shape


# ---------------------------------------------------------------------------
# Property 4: FFN Shape Preservation — Validates: Requirements 4.3
# ---------------------------------------------------------------------------

@given(
    batch=st.integers(1, 4),
    seq_len=st.integers(1, 12),
    d_model=st.integers(1, 8).map(lambda x: x * 4),  # multiples of 4
)
@settings(max_examples=20)
def test_property_4_ffn_shape_preservation(batch, seq_len, d_model):
    ffn = FeedForwardNetwork(d_model=d_model)
    x = torch.randn(batch, seq_len, d_model)
    assert ffn(x).shape == x.shape
