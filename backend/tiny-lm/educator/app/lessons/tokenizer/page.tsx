"use client";
import React from "react";
import { MultipleChoiceExercise } from "@/src/components/Exercises/MultipleChoiceExercise";
import { CodeCompletionExercise } from "@/src/components/Exercises/CodeCompletionExercise";
import { AnnotatedCodeViewer } from "@/src/components/AnnotatedCodeViewer";
import { useProgress } from "@/src/hooks/useProgress";
import annotationsData from "@/src/content/annotations/tokenizer.annotations.json";
import type { Annotation } from "@/src/components/AnnotatedCodeViewer";

const LESSON_ID = "tokenizer";
const TOTAL_EXERCISES = 2;

// Core encode/decode methods from tiny_lm/tokenizer.py
const TOKENIZER_SOURCE = `UNK_TOKEN = "<UNK>"
UNK_ID = 0


class Tokenizer:
    """Converts text to token IDs and back.

    Args:
        scheme: Tokenization scheme — "char" or "bpe".
    """

    def __init__(self, scheme="char") -> None:
        self.scheme = scheme
        self._vocab: dict[str, int] = {}
        self._id_to_token: dict[int, str] = {}

    def build_vocab(self, corpus: str, save_path: str) -> None:
        """Build vocabulary from corpus and persist it to save_path (JSON)."""
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

    def encode(self, text: str) -> list[int]:
        """Encode text into a list of token IDs."""
        tokens = self._tokenize(text)
        return [self._vocab.get(tok, UNK_ID) for tok in tokens]

    def decode(self, ids: list[int]) -> str:
        """Decode a list of token IDs back into a string."""
        return "".join(self._id_to_token.get(i, UNK_TOKEN) for i in ids)

    @property
    def vocab_size(self) -> int:
        """Number of tokens in the vocabulary (including UNK)."""
        return len(self._vocab)

    def _tokenize(self, text: str) -> list[str]:
        """Split text into tokens according to the current scheme."""
        if self.scheme == "char":
            return list(text)
        return self._bpe_encode(text)`;

function TokenizerDiagram() {
  return (
    <div className="rounded-lg bg-gray-800 p-4 font-mono text-sm text-gray-300 space-y-1">
      <div><span className="text-yellow-400">Input:</span>  "hello"</div>
      <div className="text-gray-500">↓ encode()</div>
      <div><span className="text-green-400">IDs:</span>    [8, 5, 12, 12, 15]</div>
      <div className="text-gray-500">↓ decode()</div>
      <div><span className="text-yellow-400">Output:</span> "hello"</div>
    </div>
  );
}

export default function TokenizerPage() {
  const { markExerciseComplete } = useProgress();
  return (
    <article className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Tokenizer</h1>
      <p className="text-gray-300">
        The tokenizer converts raw text into integer token IDs and back. Tiny LM supports
        character-level and BPE schemes. Unknown characters map to a reserved <code>&lt;UNK&gt;</code> ID.
      </p>
      <TokenizerDiagram />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-200">Source: <code>tiny_lm/tokenizer.py</code></h2>
        <p className="text-sm text-gray-400">Hover or click highlighted lines to see annotations.</p>
        <AnnotatedCodeViewer
          source={TOKENIZER_SOURCE}
          annotations={annotationsData.annotations as Annotation[]}
        />
      </section>

      <MultipleChoiceExercise
        prompt="What does the tokenizer do with a character not in its vocabulary?"
        options={["Raises an exception", "Skips it", "Maps it to the UNK ID", "Adds it to the vocab"]}
        solution="Maps it to the UNK ID"
        hint="See the UNK_ID constant in tokenizer.py."
        onComplete={() => markExerciseComplete(LESSON_ID, "mc1", TOTAL_EXERCISES)}
      />
      <CodeCompletionExercise
        prompt="Complete the encode method (char-level):"
        starterCode={"def encode(self, text):\n    tokens = list(text)\n    # return list of IDs\n    pass"}
        solution={"def encode(self, text):\n    tokens = list(text)\n    return [self._vocab.get(tok, 0) for tok in tokens]"}
        hint="Use self._vocab.get(tok, UNK_ID)."
        onComplete={() => markExerciseComplete(LESSON_ID, "cc1", TOTAL_EXERCISES)}
      />
    </article>
  );
}
