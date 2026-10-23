"use client";
import React from "react";
import { MultipleChoiceExercise } from "@/src/components/Exercises/MultipleChoiceExercise";
import { CodeCompletionExercise } from "@/src/components/Exercises/CodeCompletionExercise";
import { AnnotatedCodeViewer } from "@/src/components/AnnotatedCodeViewer";
import { useProgress } from "@/src/hooks/useProgress";
import annotationsData from "@/src/content/annotations/attention.annotations.json";
import type { Annotation } from "@/src/components/AnnotatedCodeViewer";

const LESSON_ID = "attention-sdp";
const TOTAL_EXERCISES = 2;

// AttentionHead class from tiny_lm/attention.py
const ATTENTION_HEAD_SOURCE = `class AttentionHead(nn.Module):
    """Single scaled dot-product attention head with causal masking.

    Args:
        d_model: Full model dimension.
        d_head: Dimension of this head's query/key/value projections.
    """

    def __init__(self, d_model: int, d_head: int) -> None:
        super().__init__()
        self.d_head = d_head
        self.q = nn.Linear(d_model, d_head, bias=False)
        self.k = nn.Linear(d_model, d_head, bias=False)
        self.v = nn.Linear(d_model, d_head, bias=False)

    def forward(self, x, mask=None):
        """Compute attention output.

        Args:
            x: Input tensor [batch, seq_len, d_model].
            mask: Optional boolean causal mask [seq_len, seq_len].

        Returns:
            Output tensor [batch, seq_len, d_head].
        """
        Q = self.q(x)  # [batch, seq_len, d_head]
        K = self.k(x)
        V = self.v(x)

        scale = math.sqrt(self.d_head)
        scores = torch.bmm(Q, K.transpose(1, 2)) / scale  # [batch, seq, seq]

        if mask is None:
            seq_len = x.size(1)
            mask = torch.triu(
                torch.ones(seq_len, seq_len, device=x.device), diagonal=1
            ).bool()

        # Mask future positions with -inf so softmax gives 0
        scores = scores.masked_fill(mask.unsqueeze(0), float("-inf"))
        weights = F.softmax(scores, dim=-1)
        return torch.bmm(weights, V)`;

const SDP_ANNOTATIONS: Annotation[] = [
  { lineStart: 1, lineEnd: 14, text: "AttentionHead projects input into Q, K, V subspaces of size d_head.", level: "function" },
  { lineStart: 30, lineEnd: 32, text: "Project input x into Query, Key, and Value matrices — each [batch, seq_len, d_head].", level: "line" },
  { lineStart: 34, lineEnd: 35, text: "Scale scores by √d_head to prevent large dot products from saturating softmax.", level: "line" },
  { lineStart: 37, lineEnd: 41, text: "Build a causal mask if none is provided — upper triangle is True, blocking future positions.", level: "line" },
  { lineStart: 44, lineEnd: 44, text: "Fill masked positions with -∞ so softmax assigns them zero weight.", level: "line" },
  { lineStart: 45, lineEnd: 46, text: "Softmax over keys gives attention weights; weighted sum of V is the output.", level: "line" },
];

function AttentionScoreDiagram() {
  return (
    <div className="rounded-lg bg-gray-800 p-4 font-mono text-sm text-gray-300 space-y-1">
      <div className="text-yellow-400">Scaled Dot-Product Attention:</div>
      <div className="pl-4">scores = Q @ Kᵀ / √d_head</div>
      <div className="pl-4">scores = masked_fill(scores, mask, -∞)</div>
      <div className="pl-4">weights = softmax(scores)</div>
      <div className="pl-4">output = weights @ V</div>
    </div>
  );
}

export default function AttentionSdpPage() {
  const { markExerciseComplete } = useProgress();
  return (
    <article className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Scaled Dot-Product Attention</h1>
      <p className="text-gray-300">
        Each attention head computes a weighted sum of values, where weights come from the
        similarity between queries and keys, scaled by √d_head to prevent vanishing gradients.
      </p>
      <AttentionScoreDiagram />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-200">Source: <code>tiny_lm/attention.py</code> — AttentionHead</h2>
        <p className="text-sm text-gray-400">Hover or click highlighted lines to see annotations.</p>
        <AnnotatedCodeViewer source={ATTENTION_HEAD_SOURCE} annotations={SDP_ANNOTATIONS} />
      </section>

      <MultipleChoiceExercise
        prompt="Why do we divide attention scores by √d_head?"
        options={["To normalize the output range", "To prevent dot products from growing large and pushing softmax into saturation", "To match the learning rate", "To apply the causal mask"]}
        solution="To prevent dot products from growing large and pushing softmax into saturation"
        hint="Large dot products → near-zero gradients through softmax."
        onComplete={() => markExerciseComplete(LESSON_ID, "mc1", TOTAL_EXERCISES)}
      />
      <CodeCompletionExercise
        prompt="Complete the scaled dot-product attention score computation:"
        starterCode={"scale = math.sqrt(self.d_head)\n# compute scores from Q and K\nscores = ???"}
        solution={"scale = math.sqrt(self.d_head)\nscores = torch.bmm(Q, K.transpose(1, 2)) / scale"}
        hint="Use torch.bmm and transpose K on dims 1 and 2."
        onComplete={() => markExerciseComplete(LESSON_ID, "cc1", TOTAL_EXERCISES)}
      />
    </article>
  );
}
