"use client";
import React from "react";
import { AttentionHeatmap } from "@/src/components/Diagrams/AttentionHeatmap";
import { MultipleChoiceExercise } from "@/src/components/Exercises/MultipleChoiceExercise";
import { CodeCompletionExercise } from "@/src/components/Exercises/CodeCompletionExercise";
import { AnnotatedCodeViewer } from "@/src/components/AnnotatedCodeViewer";
import { useProgress } from "@/src/hooks/useProgress";
import type { Annotation } from "@/src/components/AnnotatedCodeViewer";

const LESSON_ID = "attention-mha";
const TOTAL_EXERCISES = 2;

// MultiHeadAttention class from tiny_lm/attention.py
const MHA_SOURCE = `class MultiHeadAttention(nn.Module):
    """Multi-head attention: splits into n_heads, runs in parallel, projects back.

    Args:
        d_model: Model dimension.
        n_heads: Number of attention heads (must evenly divide d_model).

    Raises:
        ConfigError: If n_heads does not evenly divide d_model.
    """

    def __init__(self, d_model: int, n_heads: int) -> None:
        if d_model % n_heads != 0:
            raise ConfigError(
                f"n_heads ({n_heads}) must evenly divide d_model ({d_model})"
            )
        super().__init__()
        self.d_head = d_model // n_heads
        self.heads = nn.ModuleList(
            [AttentionHead(d_model, self.d_head) for _ in range(n_heads)]
        )
        self.proj = nn.Linear(d_model, d_model, bias=False)

    def forward(self, x, mask=None):
        """Run all heads in parallel, concatenate, and project.

        Args:
            x: Input tensor [batch, seq_len, d_model].
            mask: Optional causal mask.

        Returns:
            Output tensor [batch, seq_len, d_model].
        """
        head_outputs = [h(x, mask) for h in self.heads]
        concat = torch.cat(head_outputs, dim=-1)  # [batch, seq_len, d_model]
        return self.proj(concat)`;

const MHA_ANNOTATIONS: Annotation[] = [
  { lineStart: 1, lineEnd: 22, text: "MultiHeadAttention creates n_heads independent AttentionHead modules, each of size d_model/n_heads.", level: "function" },
  { lineStart: 12, lineEnd: 15, text: "Guard: n_heads must evenly divide d_model so each head gets an equal slice of the embedding space.", level: "line" },
  { lineStart: 18, lineEnd: 20, text: "Each head is an independent AttentionHead operating on a d_head-dimensional subspace.", level: "line" },
  { lineStart: 22, lineEnd: 22, text: "Output projection maps the concatenated heads back to d_model.", level: "line" },
  { lineStart: 35, lineEnd: 35, text: "Run all heads in parallel — each sees the full input but projects to a smaller subspace.", level: "line" },
  { lineStart: 36, lineEnd: 37, text: "Concatenate along the last dimension to recover d_model, then project.", level: "line" },
];

export default function AttentionMhaPage() {
  const { markExerciseComplete } = useProgress();
  return (
    <article className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Multi-Head Attention</h1>
      <p className="text-gray-300">
        Multi-head attention runs <code>n_heads</code> attention heads in parallel, each on a
        subspace of dimension <code>d_model / n_heads</code>. Their outputs are concatenated and
        projected back to <code>d_model</code>.
      </p>
      <AttentionHeatmap />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-200">Source: <code>tiny_lm/attention.py</code> — MultiHeadAttention</h2>
        <p className="text-sm text-gray-400">Hover or click highlighted lines to see annotations.</p>
        <AnnotatedCodeViewer source={MHA_SOURCE} annotations={MHA_ANNOTATIONS} />
      </section>

      <MultipleChoiceExercise
        prompt="What constraint must n_heads satisfy relative to d_model?"
        options={["n_heads must equal d_model", "n_heads must evenly divide d_model", "n_heads must be a power of 2", "n_heads must be less than d_model"]}
        solution="n_heads must evenly divide d_model"
        hint="Each head gets d_model / n_heads dimensions."
        onComplete={() => markExerciseComplete(LESSON_ID, "mc1", TOTAL_EXERCISES)}
      />
      <CodeCompletionExercise
        prompt="Complete the MHA forward: concatenate head outputs and project:"
        starterCode={"head_outputs = [h(x, mask) for h in self.heads]\n# concatenate and project\nresult = ???"}
        solution={"head_outputs = [h(x, mask) for h in self.heads]\nconcat = torch.cat(head_outputs, dim=-1)\nresult = self.proj(concat)"}
        hint="torch.cat on dim=-1, then self.proj."
        onComplete={() => markExerciseComplete(LESSON_ID, "cc1", TOTAL_EXERCISES)}
      />
    </article>
  );
}
