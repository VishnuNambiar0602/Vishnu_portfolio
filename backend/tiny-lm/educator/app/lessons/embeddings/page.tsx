"use client";
import React from "react";
import { MultipleChoiceExercise } from "@/src/components/Exercises/MultipleChoiceExercise";
import { CodeCompletionExercise } from "@/src/components/Exercises/CodeCompletionExercise";
import { AnnotatedCodeViewer } from "@/src/components/AnnotatedCodeViewer";
import { useProgress } from "@/src/hooks/useProgress";
import annotationsData from "@/src/content/annotations/embeddings.annotations.json";
import type { Annotation } from "@/src/components/AnnotatedCodeViewer";

const LESSON_ID = "embeddings";
const TOTAL_EXERCISES = 2;

const EMBEDDINGS_SOURCE = `class EmbeddingLayer(nn.Module):
    """Token embeddings + sinusoidal positional encoding.

    Args:
        vocab_size: Number of tokens in the vocabulary.
        d_model: Embedding dimension (must be a positive even integer).

    Raises:
        ConfigError: If d_model is not a positive even integer.
    """

    def __init__(self, vocab_size: int, d_model: int) -> None:
        if not isinstance(d_model, int) or d_model <= 0 or d_model % 2 != 0:
            raise ConfigError(
                f"d_model must be a positive even integer, got {d_model}"
            )
        super().__init__()
        self.d_model = d_model
        self.token_emb = nn.Embedding(vocab_size, d_model)
        # Pre-compute positional encoding up to a large max length
        self.register_buffer("pe", self._build_pe(4096, d_model))

    @staticmethod
    def _build_pe(max_len: int, d_model: int) -> torch.Tensor:
        """Build sinusoidal positional encoding matrix [max_len, d_model]."""
        pe = torch.zeros(max_len, d_model)
        pos = torch.arange(max_len).unsqueeze(1).float()
        div = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(pos * div)
        pe[:, 1::2] = torch.cos(pos * div)
        return pe  # [max_len, d_model]

    def forward(self, token_ids):
        """Return embeddings + positional encoding.

        Args:
            token_ids: Integer tensor of shape [batch, seq_len].

        Returns:
            Float tensor of shape [batch, seq_len, d_model].
        """
        seq_len = token_ids.size(1)
        x = self.token_emb(token_ids)   # [batch, seq_len, d_model]
        x = x + self.pe[:seq_len]       # broadcast over batch
        return x`;

function SinusoidalDiagram() {
  const positions = [0, 1, 2, 3, 4];
  return (
    <div className="rounded-lg bg-gray-800 p-4 space-y-2">
      <p className="text-xs text-gray-400">Sinusoidal PE — position vs. dimension</p>
      <svg viewBox="0 0 300 80" className="w-full">
        {positions.map((pos) => (
          <g key={pos}>
            {[0, 1, 2, 3, 4, 5].map((dim) => {
              const val = dim % 2 === 0
                ? Math.sin(pos / Math.pow(10000, dim / 6))
                : Math.cos(pos / Math.pow(10000, (dim - 1) / 6));
              const intensity = Math.round(((val + 1) / 2) * 200 + 55);
              return (
                <rect
                  key={dim}
                  x={pos * 52 + dim * 8}
                  y={10}
                  width={7}
                  height={60}
                  fill={`rgb(${intensity},${Math.round(intensity * 0.4)},${Math.round(intensity * 0.8)})`}
                />
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function EmbeddingsPage() {
  const { markExerciseComplete } = useProgress();
  return (
    <article className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Embeddings &amp; Positional Encoding</h1>
      <p className="text-gray-300">
        Each token ID is mapped to a dense vector of dimension <code>d_model</code>. A sinusoidal
        positional encoding is added so the model knows token order.
      </p>
      <SinusoidalDiagram />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-200">Source: <code>tiny_lm/embeddings.py</code></h2>
        <p className="text-sm text-gray-400">Hover or click highlighted lines to see annotations.</p>
        <AnnotatedCodeViewer
          source={EMBEDDINGS_SOURCE}
          annotations={annotationsData.annotations as Annotation[]}
        />
      </section>

      <MultipleChoiceExercise
        prompt="Why must d_model be an even integer?"
        options={["PyTorch requires it", "Sinusoidal PE uses sin/cos pairs requiring even dimensions", "It speeds up matrix multiplication", "No particular reason"]}
        solution="Sinusoidal PE uses sin/cos pairs requiring even dimensions"
        hint="PE alternates sin and cos across even/odd indices."
        onComplete={() => markExerciseComplete(LESSON_ID, "mc1", TOTAL_EXERCISES)}
      />
      <CodeCompletionExercise
        prompt="Complete the positional encoding addition in forward():"
        starterCode={"def forward(self, token_ids):\n    x = self.token_emb(token_ids)\n    seq_len = token_ids.size(1)\n    # add positional encoding\n    pass"}
        solution={"def forward(self, token_ids):\n    x = self.token_emb(token_ids)\n    seq_len = token_ids.size(1)\n    x = x + self.pe[:seq_len]\n    return x"}
        hint="Slice self.pe to seq_len and add to x."
        onComplete={() => markExerciseComplete(LESSON_ID, "cc1", TOTAL_EXERCISES)}
      />
    </article>
  );
}
