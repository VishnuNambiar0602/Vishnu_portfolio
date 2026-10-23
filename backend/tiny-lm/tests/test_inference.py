"""Tests for tiny_lm/inference.py — Property 11 + unit tests."""

from __future__ import annotations

import os
import tempfile

import pytest
import torch
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from tiny_lm.config import CheckpointError, ModelConfig
from tiny_lm.inference import InferenceEngine
from tiny_lm.model import TinyLM
from tiny_lm.tokenizer import Tokenizer


def _setup_engine(tmpdir: str) -> tuple[TinyLM, Tokenizer, InferenceEngine]:
    cfg = ModelConfig(d_model=8, n_heads=2, n_layers=1, d_ff=16, max_seq_len=16, vocab_size=27)
    model = TinyLM(cfg)
    tok = Tokenizer("char")
    tok.build_vocab("abcdefghijklmnopqrstuvwxyz", os.path.join(tmpdir, "vocab.json"))
    engine = InferenceEngine(model, tok)
    return model, tok, engine


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

class TestInferenceEngine:
    def test_greedy_is_deterministic(self, tmp_path):
        _, _, engine = _setup_engine(str(tmp_path))
        out1 = engine.generate("abc", max_new_tokens=5, strategy="greedy")
        out2 = engine.generate("abc", max_new_tokens=5, strategy="greedy")
        assert out1 == out2

    def test_temperature_produces_output(self, tmp_path):
        _, _, engine = _setup_engine(str(tmp_path))
        out = engine.generate("abc", max_new_tokens=5, strategy="temperature", temperature=1.0)
        assert isinstance(out, str)

    def test_top_k_produces_output(self, tmp_path):
        _, _, engine = _setup_engine(str(tmp_path))
        out = engine.generate("abc", max_new_tokens=5, strategy="top_k", top_k=5)
        assert isinstance(out, str)

    def test_checkpoint_error_on_missing_file(self, tmp_path):
        cfg = ModelConfig(d_model=8, n_heads=2, n_layers=1, d_ff=16, max_seq_len=16, vocab_size=27)
        model = TinyLM(cfg)
        tok = Tokenizer("char")
        tok.build_vocab("abc", str(tmp_path / "v.json"))
        with pytest.raises(CheckpointError):
            InferenceEngine.from_checkpoint("/no/such/file.pt", model, tok)

    def test_output_length_bounded(self, tmp_path):
        _, tok, engine = _setup_engine(str(tmp_path))
        max_new = 8
        ids = engine._generate_ids("abc", max_new, "greedy", 1.0, 50)
        assert len(ids) == max_new


# ---------------------------------------------------------------------------
# Property 11: Inference Length Bound — Validates: Requirements 7.5
# ---------------------------------------------------------------------------

@given(max_new=st.integers(1, 20))
@settings(max_examples=10, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_property_11_inference_length_bound(max_new):
    with tempfile.TemporaryDirectory() as tmpdir:
        _, tok, engine = _setup_engine(tmpdir)
        ids = engine._generate_ids("abc", max_new, "greedy", 1.0, 50)
        assert len(ids) == max_new
