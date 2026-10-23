"use client";
import React from "react";
import { MultipleChoiceExercise } from "@/src/components/Exercises/MultipleChoiceExercise";
import { CodeCompletionExercise } from "@/src/components/Exercises/CodeCompletionExercise";
import { AnnotatedCodeViewer } from "@/src/components/AnnotatedCodeViewer";
import { useProgress } from "@/src/hooks/useProgress";
import annotationsData from "@/src/content/annotations/train.annotations.json";

const LESSON_ID = "training-loop";
const TOTAL_EXERCISES = 2;

// Core training loop excerpt from tiny_lm/train.py (lines 97–135)
const TRAIN_SOURCE = `    model.train()
    step = start_step
    batch_idx = 0

    while step < config.max_steps:
        batch = batches[batch_idx % len(batches)]
        batch = batch[:, :seq_len]

        # Input: all tokens except last; target: all tokens except first
        inputs = batch[:, :-1]
        targets = batch[:, 1:]

        logits = model(inputs)  # [batch, seq-1, vocab]
        loss = criterion(
            logits.reshape(-1, logits.size(-1)),
            targets.reshape(-1),
        )

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        step += 1
        batch_idx += 1

        if step % config.log_interval == 0:
            print(f"step={step}  loss={loss.item():.4f}")

        if step % config.checkpoint_interval == 0:
            ckpt = os.path.join(output_dir, f"checkpoint_{step}.pt")
            torch.save(
                {
                    "step": step,
                    "model": model.state_dict(),
                    "optimizer": optimizer.state_dict(),
                },
                ckpt,
            )`;

// Annotations scoped to the excerpt above (line numbers relative to excerpt)
const TRAIN_EXCERPT_ANNOTATIONS = [
  {
    lineStart: 1,
    lineEnd: 3,
    text: "Set model to training mode and initialise step/batch counters.",
    level: "line" as const,
  },
  {
    lineStart: 5,
    lineEnd: 5,
    text: "Main training loop — runs until max_steps is reached.",
    level: "function" as const,
  },
  {
    lineStart: 9,
    lineEnd: 11,
    text: "Shift inputs and targets by one position: the model predicts the next token at every position.",
    level: "line" as const,
  },
  {
    lineStart: 13,
    lineEnd: 16,
    text: "CrossEntropyLoss expects [N, C] logits and [N] targets, so we flatten the batch and sequence dimensions.",
    level: "line" as const,
  },
  {
    lineStart: 18,
    lineEnd: 20,
    text: "Standard PyTorch backward pass: zero gradients → compute gradients → update weights.",
    level: "line" as const,
  },
  {
    lineStart: 25,
    lineEnd: 26,
    text: "Log the current loss every log_interval steps.",
    level: "line" as const,
  },
  {
    lineStart: 28,
    lineEnd: 36,
    text: "Save a checkpoint every checkpoint_interval steps so training can be resumed.",
    level: "line" as const,
  },
];

function LossCurveDiagram() {
  const points = [3.2, 2.8, 2.3, 1.9, 1.6, 1.4, 1.25, 1.15, 1.08, 1.03];
  const w = 280, h = 80, pad = 10;
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - 2 * pad));
  const ys = points.map((v) => pad + ((v - 1) / (3.2 - 1)) * (h - 2 * pad));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-label="Loss curve" className="w-full max-w-sm mx-auto">
      <path d={d} fill="none" stroke="#60a5fa" strokeWidth={2} />
      <text x={pad} y={h - 2} fill="#9ca3af" fontSize={8}>step →</text>
      <text x={2} y={pad + 4} fill="#9ca3af" fontSize={8} transform={`rotate(-90,8,${pad})`}>loss</text>
    </svg>
  );
}

export default function TrainingLoopPage() {
  const { markExerciseComplete } = useProgress();
  return (
    <article className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Training Loop</h1>
      <p className="text-gray-300">
        The training loop batches token sequences, computes cross-entropy loss between predicted
        logits and target IDs, then updates weights via backpropagation. Checkpoints are saved at
        configurable intervals and resumed automatically.
      </p>
      <LossCurveDiagram />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-200">Source: <code>tiny_lm/train.py</code> — core loop</h2>
        <p className="text-sm text-gray-400">Hover or click highlighted lines to see annotations.</p>
        <AnnotatedCodeViewer
          source={TRAIN_SOURCE}
          annotations={TRAIN_EXCERPT_ANNOTATIONS}
        />
      </section>

      <MultipleChoiceExercise
        prompt="What loss function does the training loop use?"
        options={["Mean squared error", "Binary cross-entropy", "Cross-entropy loss", "KL divergence"]}
        solution="Cross-entropy loss"
        hint="Language modelling is a classification task over the vocabulary."
        onComplete={() => markExerciseComplete(LESSON_ID, "mc1", TOTAL_EXERCISES)}
      />
      <CodeCompletionExercise
        prompt="Complete the loss computation and backward pass:"
        starterCode={"logits = model(inputs)  # [batch, seq-1, vocab]\n# compute loss, backward, step\npass"}
        solution={"logits = model(inputs)\nloss = criterion(logits.reshape(-1, logits.size(-1)), targets.reshape(-1))\noptimizer.zero_grad()\nloss.backward()\noptimizer.step()"}
        hint="Reshape logits to [batch*seq, vocab] for CrossEntropyLoss."
        onComplete={() => markExerciseComplete(LESSON_ID, "cc1", TOTAL_EXERCISES)}
      />
    </article>
  );
}
