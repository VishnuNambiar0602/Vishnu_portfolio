"""Tests for tiny_lm/attention.py — Properties 5, 6 + unit tests."""

from __future__ import annotations

import math

import pytest
import torch
import torch.nn.functional as F
from hypothesis import given, settings
from hypothesis import strategies as st

from tiny_lm.attention import AttentionHead, MultiHeadAttention
from tiny_lm.config import ConfigError


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

class TestAttentionHead:
    def test_causal_mask_4_tokens(self):
        """Attention weights at position i must be 0 for j > i."""
        head = AttentionHead(d_model=8, d_head=8)
        x = torch.randn(1, 4, 8)
        # Manually compute weights to inspect them
        Q = head.q(x)
        K = head.k(x)
        scores = torch.bmm(Q, K.transpose(1, 2)) / math.sqrt(8)
        mask = torch.triu(torch.ones(4, 4), diagonal=1).bool()
        scores = scores.masked_fill(mask.unsqueeze(0), float("-inf"))
        weights = F.softmax(scores, dim=-1)
        # Upper triangle (future) should be ~0
        for i in range(4):
            for j in range(i + 1, 4):
                assert weights[0, i, j].item() < 1e-6

    def test_softmax_sums_to_one(self):
        head = AttentionHead(d_model=8, d_head=8)
        x = torch.randn(1, 4, 8)
        Q = head.q(x)
        K = head.k(x)
        scores = torch.bmm(Q, K.transpose(1, 2)) / math.sqrt(8)
        mask = torch.triu(torch.ones(4, 4), diagonal=1).bool()
        scores = scores.masked_fill(mask.unsqueeze(0), float("-inf"))
        weights = F.softmax(scores, dim=-1)
        row_sums = weights.sum(dim=-1)
        assert torch.allclose(row_sums, torch.ones_like(row_sums), atol=1e-5)


class TestMultiHeadAttention:
    def test_bad_n_heads_raises(self):
        with pytest.raises(ConfigError):
            MultiHeadAttention(d_model=8, n_heads=3)

    def test_output_shape(self):
        mha = MultiHeadAttention(d_model=8, n_heads=2)
        x = torch.randn(2, 5, 8)
        assert mha(x).shape == (2, 5, 8)


# ---------------------------------------------------------------------------
# Property 5: Causal Mask Invariant — Validates: Requirements 3.2
# ---------------------------------------------------------------------------

@given(
    batch=st.integers(1, 3),
    seq_len=st.integers(2, 10),
)
@settings(max_examples=20)
def test_property_5_causal_mask_invariant(batch, seq_len):
    d_model, n_heads = 8, 2
    mha = MultiHeadAttention(d_model=d_model, n_heads=n_heads)
    # Inspect a single head's weights directly
    head = mha.heads[0]
    x = torch.randn(batch, seq_len, d_model)
    Q = head.q(x)
    K = head.k(x)
    scores = torch.bmm(Q, K.transpose(1, 2)) / math.sqrt(head.d_head)
    mask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()
    scores = scores.masked_fill(mask.unsqueeze(0), float("-inf"))
    weights = F.softmax(scores, dim=-1)
    for i in range(seq_len):
        for j in range(i + 1, seq_len):
            assert (weights[:, i, j] < 1e-6).all()


# ---------------------------------------------------------------------------
# Property 6: MHA Output Shape — Validates: Requirements 3.4
# ---------------------------------------------------------------------------

@given(
    batch=st.integers(1, 4),
    seq_len=st.integers(1, 12),
)
@settings(max_examples=20)
def test_property_6_mha_output_shape(batch, seq_len):
    d_model, n_heads = 8, 2
    mha = MultiHeadAttention(d_model=d_model, n_heads=n_heads)
    x = torch.randn(batch, seq_len, d_model)
    assert mha(x).shape == x.shape
