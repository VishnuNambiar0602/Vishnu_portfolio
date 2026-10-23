"""Unit and property-based tests for tiny_lm/tokenizer.py.

Property 1: Tokenizer Round-Trip — Validates: Requirements 1.6
Property 2: Unknown Token Handling — Validates: Requirements 1.4
"""

from __future__ import annotations

import tempfile
import os

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from tiny_lm.config import TokenizerError
from tiny_lm.tokenizer import UNK_ID, Tokenizer

_CORPUS = "hello world this is a test corpus for the tokenizer"


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------


class TestCharTokenizer:
    def setup_method(self, method):
        self._tmpdir = tempfile.mkdtemp()
        self.vocab_path = os.path.join(self._tmpdir, "vocab.json")
        self.tok = Tokenizer(scheme="char")
        self.tok.build_vocab(_CORPUS, self.vocab_path)

    def test_encode_decode_known_string(self):
        text = "hello"
        assert self.tok.decode(self.tok.encode(text)) == text

    def test_encode_returns_ints(self):
        ids = self.tok.encode("hi")
        assert all(isinstance(i, int) for i in ids)

    def test_vocab_size_positive(self):
        assert self.tok.vocab_size > 0

    def test_vocab_persistence_round_trip(self, tmp_path):
        path = str(tmp_path / "vocab.json")
        self.tok.build_vocab(_CORPUS, path)
        tok2 = Tokenizer(scheme="char")
        tok2.load_vocab(path)
        assert tok2.vocab_size == self.tok.vocab_size
        assert tok2.encode("hello") == self.tok.encode("hello")

    def test_load_vocab_missing_file_raises(self):
        tok = Tokenizer()
        with pytest.raises(TokenizerError) as exc_info:
            tok.load_vocab("/nonexistent/path/vocab.json")
        assert "/nonexistent/path/vocab.json" in str(exc_info.value)

    def test_load_vocab_corrupt_json_raises(self, tmp_path):
        bad = tmp_path / "bad.json"
        bad.write_text("not valid json {{{{")
        tok = Tokenizer()
        with pytest.raises(TokenizerError) as exc_info:
            tok.load_vocab(str(bad))
        assert str(bad) in str(exc_info.value)

    def test_oov_maps_to_unk(self):
        tok = Tokenizer(scheme="char")
        path = os.path.join(self._tmpdir, "small_vocab.json")
        tok.build_vocab("abcdef", path)
        ids = tok.encode("xyz€")
        assert all(i == UNK_ID for i in ids)


# ---------------------------------------------------------------------------
# Property-based tests
# ---------------------------------------------------------------------------

# Feature: tiny-lm-educator, Property 1: Tokenizer Round-Trip
# For any valid input string, encoding then decoding should equal the original.
# Validates: Requirements 1.6

@given(text=st.text(
    alphabet=st.characters(whitelist_categories=("L", "N", "P", "Zs")),
    min_size=1,
    max_size=30,
))
@settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_property_1_tokenizer_round_trip(text):
    with tempfile.TemporaryDirectory() as tmpdir:
        tok = Tokenizer(scheme="char")
        tok.build_vocab(text, os.path.join(tmpdir, "vocab.json"))
        assert tok.decode(tok.encode(text)) == text


# Feature: tiny-lm-educator, Property 2: Unknown Token Handling
# Strings with chars outside the vocab should all map to UNK_ID.
# Validates: Requirements 1.4

@given(
    oov_text=st.text(
        alphabet="ΑΒΓΔΕΖΗΘ",  # Greek letters — never in ASCII corpus
        min_size=1,
        max_size=20,
    )
)
@settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_property_2_unknown_token_handling(oov_text):
    with tempfile.TemporaryDirectory() as tmpdir:
        tok = Tokenizer(scheme="char")
        tok.build_vocab("abcdefghijklmnopqrstuvwxyz", os.path.join(tmpdir, "vocab.json"))
        ids = tok.encode(oov_text)
        assert len(ids) > 0
        assert all(i == UNK_ID for i in ids)
