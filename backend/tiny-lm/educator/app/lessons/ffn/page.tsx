"use client";
import React from "react";
import { MultipleChoiceExercise } from "@/src/components/Exercises/MultipleChoiceExercise";
import { CodeCompletionExercise } from "@/src/components/Exercises/CodeCompletionExercise";
import { AnnotatedCodeViewer } from "@/src/components/AnnotatedCodeViewer";
import { useProgress } from "@/src/hooks/useProgress";
import annotationsData from "@/src/content/annotations/ffn.annotations.json";
import type { Annotation } from "@/src/components/AnnotatedCodeViewer";

const LESSON_ID = "ffn";
const TOTAL_EXERCISES = 2;

const FFN_SOURCE = `"""Position-wise feed-forward network."""

import torch.nn as nn
import torch.nn.functional as F


class FeedForwardNetwork(nn.Module):
    """Two-layer MLP with GELU activation.

    Args:
        d_model: Input/output dimension.
        d_ff: Inner dimension (defaults to 4 * d_model).
    """

    def __init__(self, d_model: int, d_ff: int | None = None) -> None:
        super().__init__()
        if d_ff is None:
            d_ff = 4 * d_model
        self.d_ff = d_ff
        self.fc1 = nn.Linear(d_model, d_ff)
        self.fc2 = nn.Linear(d_ff, d_model)

    def forward(self, x):
        """Apply FFN: Linear → GELU → Linear.

        Args:
            x: Input tensor of any shape [..., d_model].

        Returns:
            Output tensor with the same shape as x.
        """
        return self.fc2(F.gelu(self.fc1(x)))`;

function FFNDiagram() {
  return (
    <svg viewBox="0 0 280 100" aria-label="FFN diagram" className="w-full max-w-sm mx-auto">
      {[
        { x: 10, label: "x\n[…,d]", color: "#60a5fa" },
        { x: 90, label: "fc1\n[…,d_ff]", color: "#a78bfa" },
        { x: 170, label: "GELU", color: "#f472b6" },
        { x: 230, label: "fc2\n[…,d]", color: "#4ade80" },
      ].map(({ x, label, color }, i, arr) => (
        <g key={x}>
          <rect x={x} y={30} width={60} height={40} rx={6} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} />
          <text x={x + 30} y={54} textAnchor="middle" fill={color} fontSize={9} fontFamily="monospace">{label}</text>
          {i < arr.length - 1 && <line x1={x + 60} y1={50} x2={arr[i + 1].x} y2={50} stroke="#6b7280" strokeWidth={1.5} />}
        </g>
      ))}
    </svg>
  );
}

export default function FfnPage() {
  const { markExerciseComplete } = useProgress();
  return (
    <article className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Feed-Forward Network</h1>
      <p className="text-gray-300">
        The FFN applies two linear layers with a GELU activation between them. The inner dimension
        <code> d_ff</code> defaults to <code>4 × d_model</code>. Input and output shapes are identical.
      </p>
      <FFNDiagram />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-200">Source: <code>tiny_lm/ffn.py</code></h2>
        <p className="text-sm text-gray-400">Hover or click highlighted lines to see annotations.</p>
        <AnnotatedCodeViewer
          source={FFN_SOURCE}
          annotations={annotationsData.annotations as Annotation[]}
        />
      </section>

      <MultipleChoiceExercise
        prompt="What is the default value of d_ff relative to d_model?"
        options={["d_model / 2", "d_model", "2 × d_model", "4 × d_model"]}
        solution="4 × d_model"
        hint="See the FeedForwardNetwork constructor default."
        onComplete={() => markExerciseComplete(LESSON_ID, "mc1", TOTAL_EXERCISES)}
      />
      <CodeCompletionExercise
        prompt="Complete the FFN forward pass:"
        starterCode={"def forward(self, x):\n    # two linear layers with GELU\n    pass"}
        solution={"def forward(self, x):\n    return self.fc2(F.gelu(self.fc1(x)))"}
        hint="fc1 → gelu → fc2."
        onComplete={() => markExerciseComplete(LESSON_ID, "cc1", TOTAL_EXERCISES)}
      />
    </article>
  );
}
