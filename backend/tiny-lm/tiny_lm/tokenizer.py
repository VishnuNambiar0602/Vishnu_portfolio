"""Tokenizer implementation for Tiny LM.

Supports character-level ('char') and byte-pair encoding ('bpe') schemes.
"""

from __future__ import annotations

import json
from collections import Counter
from typing import Literal

from tiny_lm.config import TokenizerError

UNK_TOKEN = "<UNK>"
UNK_ID = 0


class Tokenizer:
    """Converts text to token IDs and back.

    Args:
        scheme: Tokenization scheme — ``"char"`` or ``"bpe"``.
    """

    def __init__(self, scheme: Literal["char", "bpe"] = "char") -> None:
        self.scheme = scheme
        # token -> id
        self._vocab: dict[str, int] = {}
        # id -> token
        self._id_to_token: dict[int, str] = {}

    # ------------------------------------------------------------------
    # Vocabulary building
    # ------------------------------------------------------------------

    def build_vocab(self, corpus: str, save_path: str) -> None:
        """Build vocabulary from *corpus* and persist it to *save_path* (JSON)."""
        if self.scheme == "char":
            tokens = sorted(set(corpus))
        else:
            tokens = self._bpe_tokens(corpus)

        # Reserve ID 0 for UNK
        vocab: dict[str, int] = {UNK_TOKEN: UNK_ID}
        for i, tok in enumerate(tokens, start=1):
            vocab[tok] = i

        self._vocab = vocab
        self._id_to_token = {v: k for k, v in vocab.items()}

        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(vocab, f, ensure_ascii=False)

    def load_vocab(self, path: str) -> None:
        """Load vocabulary from a JSON file at *path*.

        Raises:
            TokenizerError: If the file is missing or contains invalid JSON.
        """
        try:
            with open(path, encoding="utf-8") as f:
                raw = f.read()
        except FileNotFoundError:
            raise TokenizerError(f"Vocab file not found: {path}")

        try:
            vocab: dict[str, int] = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise TokenizerError(f"Vocab file corrupt at {path}: {exc}")

        self._vocab = vocab
        self._id_to_token = {v: k for k, v in vocab.items()}

    # ------------------------------------------------------------------
    # Encoding / decoding
    # ------------------------------------------------------------------

    def encode(self, text: str) -> list[int]:
        """Encode *text* into a list of token IDs."""
        tokens = self._tokenize(text)
        return [self._vocab.get(tok, UNK_ID) for tok in tokens]

    def decode(self, ids: list[int]) -> str:
        """Decode a list of token IDs back into a string."""
        return "".join(self._id_to_token.get(i, UNK_TOKEN) for i in ids)

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------

    @property
    def vocab_size(self) -> int:
        """Number of tokens in the vocabulary (including UNK)."""
        return len(self._vocab)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _tokenize(self, text: str) -> list[str]:
        """Split *text* into tokens according to the current scheme."""
        if self.scheme == "char":
            return list(text)
        # BPE: apply learned merges greedily
        return self._bpe_encode(text)

    # ---- BPE helpers --------------------------------------------------

    def _bpe_tokens(self, corpus: str) -> list[str]:
        """Derive a BPE vocabulary from *corpus* (simplified, 256 merges)."""
        # Start with character-level splits
        words = corpus.split()
        word_freqs: Counter[tuple[str, ...]] = Counter()
        for w in words:
            word_freqs[tuple(w)] += 1

        vocab_set: set[str] = set()
        for chars in word_freqs:
            vocab_set.update(chars)

        merges: list[tuple[str, str]] = []
        for _ in range(256):
            pairs = self._get_pairs(word_freqs)
            if not pairs:
                break
            best = max(pairs, key=lambda p: pairs[p])
            merges.append(best)
            word_freqs = self._merge_pair(best, word_freqs)
            vocab_set.add(best[0] + best[1])

        self._merges = merges
        return sorted(vocab_set)

    @staticmethod
    def _get_pairs(
        word_freqs: Counter[tuple[str, ...]],
    ) -> Counter[tuple[str, str]]:
        pairs: Counter[tuple[str, str]] = Counter()
        for word, freq in word_freqs.items():
            for a, b in zip(word, word[1:]):
                pairs[(a, b)] += freq
        return pairs

    @staticmethod
    def _merge_pair(
        pair: tuple[str, str],
        word_freqs: Counter[tuple[str, ...]],
    ) -> Counter[tuple[str, ...]]:
        new_freqs: Counter[tuple[str, ...]] = Counter()
        merged = pair[0] + pair[1]
        for word, freq in word_freqs.items():
            new_word: list[str] = []
            i = 0
            while i < len(word):
                if i < len(word) - 1 and word[i] == pair[0] and word[i + 1] == pair[1]:
                    new_word.append(merged)
                    i += 2
                else:
                    new_word.append(word[i])
                    i += 1
            new_freqs[tuple(new_word)] += freq
        return new_freqs

    def _bpe_encode(self, text: str) -> list[str]:
        """Encode *text* using learned BPE merges."""
        if not hasattr(self, "_merges"):
            # No merges learned — fall back to char-level
            return list(text)
        words = text.split()
        result: list[str] = []
        for word in words:
            chars = list(word)
            for pair in self._merges:
                merged = pair[0] + pair[1]
                i = 0
                new_chars: list[str] = []
                while i < len(chars):
                    if i < len(chars) - 1 and chars[i] == pair[0] and chars[i + 1] == pair[1]:
                        new_chars.append(merged)
                        i += 2
                    else:
                        new_chars.append(chars[i])
                        i += 1
                chars = new_chars
            result.extend(chars)
        return result
