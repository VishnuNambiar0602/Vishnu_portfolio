"use client";
import React from "react";
import { ResidualStreamDiagram } from "@/src/components/Diagrams/ResidualStreamDiagram";
import { MultipleChoiceExercise } from "@/src/components/Exercises/MultipleChoiceExercise";
import { CodeCompletionExercise } from "@/src/components/Exercises/CodeCompletionExercise";
import { AnnotatedCodeViewer } from "@/src/components/AnnotatedCodeViewer";
import { useProgress } from "@/src/hooks/useProgress";
import annotationsData from "@/src/content/annotations/transformer_block.annotations.json";
import type { Annotation } from "@/src/components/AnnotatedCodeViewer";

const LESSON_ID = "transformer-block";
const TOTAL_EXERCISES = 2;

const TRANSFORMER_BLOCK_SOURCE = `"""Transformer block: pre-norm variant with residual connections."""

import torch.nn as nn

from tiny_lm.attention import MultiHeadAttention
from tiny_lm.ffn import FeedForwardNetwork


class TransformerBlock(nn.Module):
    """One transformer layer using pre-norm: LayerNorm → sublayer → residual add.

    Args:
        d_model: Model dimension.
        n_heads: Number of attention heads.
        d_ff: FFN inner dimension (defaults to 4 * d_model).
    """

    def __init__(self, d_model: int, n_heads: int, d_ff: int | None = None) -> None:
        super().__init__()
        self.norm1 = nn.LayerNorm(d_model)
        self.attn = MultiHeadAttention(d_model, n_heads)
        self.norm2 = nn.LayerNorm(d_model)
        self.ffn = FeedForwardNetwork(d_model, d_ff)

    def forward(self, x, mask=None):
        """Forward pass with pre-norm and residual connections.

        Args:
            x: Input tensor [batch, seq_len, d_model].
            mask: Optional causal mask.

        Returns:
            Output tensor [batch, seq_len, d_model].
        """
        # Pre-norm attention sub-layer
        x = x + self.attn(self.norm1(x), mask)
        # Pre-norm FFN sub-layer
        x = x + self.ffn(self.norm2(x))
        return x`;

export default function TransformerBlockPage() {
  const { markExerciseComplete } = useProgress();
  return (
    <article className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Transformer Block</h1>
      <p className="text-gray-300">
        Each transformer block uses the <strong>pre-norm</strong> variant: LayerNorm is applied
        before each sublayer, and the sublayer output is added back to the input (residual connection).
      </p>
      <ResidualStreamDiagram />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-200">Source: <code>tiny_lm/transformer_block.py</code></h2>
        <p className="text-sm text-gray-400">Hover or click highlighted lines to see annotations.</p>
        <AnnotatedCodeViewer
          source={TRANSFORMER_BLOCK_SOURCE}
          annotations={annotationsData.annotations as Annotation[]}
        />
      </section>

      <MultipleChoiceExercise
        prompt="In the pre-norm variant, where is LayerNorm applied?"
        options={["After the sublayer output", "Before the sublayer input", "Only at the end of the block", "Between the two sublayers only"]}
        solution="Before the sublayer input"
        hint="Pre-norm: LayerNorm → sublayer → residual add."
        onComplete={() => markExerciseComplete(LESSON_ID, "mc1", TOTAL_EXERCISES)}
      />
      <CodeCompletionExercise
        prompt="Complete the pre-norm attention sub-layer with residual:"
        starterCode={"def forward(self, x, mask=None):\n    # pre-norm attention\n    x = ???\n    # pre-norm FFN\n    x = x + self.ffn(self.norm2(x))\n    return x"}
        solution={"def forward(self, x, mask=None):\n    x = x + self.attn(self.norm1(x), mask)\n    x = x + self.ffn(self.norm2(x))\n    return x"}
        hint="x = x + self.attn(self.norm1(x), mask)"
        onComplete={() => markExerciseComplete(LESSON_ID, "cc1", TOTAL_EXERCISES)}
      />
    </article>
  );
}
