"use client";
import React from "react";
import { MultipleChoiceExercise } from "@/src/components/Exercises/MultipleChoiceExercise";
import { CodeCompletionExercise } from "@/src/components/Exercises/CodeCompletionExercise";
import { AnnotatedCodeViewer } from "@/src/components/AnnotatedCodeViewer";
import { useProgress } from "@/src/hooks/useProgress";
import annotationsData from "@/src/content/annotations/inference.annotations.json";
import type { Annotation } from "@/src/components/AnnotatedCodeViewer";

const LESSON_ID = "inference";
const TOTAL_EXERCISES = 2;

// _generate_ids method from tiny_lm/inference.py
const INFERENCE_SOURCE = `    def _generate_ids(self, prompt, max_new_tokens, strategy, temperature, top_k):
        """Return the raw list of generated token IDs."""
        self.model.eval()
        input_ids = torch.tensor([self.tokenizer.encode(prompt)], dtype=torch.long)
        generated: list[int] = []

        with torch.no_grad():
            for _ in range(max_new_tokens):
                context = input_ids[:, -self.model.config.max_seq_len:]
                logits = self.model(context)        # [1, seq, vocab]
                next_logits = logits[0, -1, :]      # [vocab]

                if strategy == "greedy":
                    next_id = int(next_logits.argmax())
                elif strategy == "temperature":
                    probs = F.softmax(next_logits / max(temperature, 1e-8), dim=-1)
                    next_id = int(torch.multinomial(probs, num_samples=1))
                else:  # top_k
                    k = min(top_k, next_logits.size(-1))
                    top_vals, top_ids = torch.topk(next_logits, k)
                    probs = F.softmax(top_vals, dim=-1)
                    idx = int(torch.multinomial(probs, num_samples=1))
                    next_id = int(top_ids[idx])

                generated.append(next_id)
                input_ids = torch.cat(
                    [input_ids, torch.tensor([[next_id]])], dim=1
                )

        return generated`;

const INFERENCE_ANNOTATIONS: Annotation[] = [
  { lineStart: 1, lineEnd: 5, text: "Set model to eval mode (disables dropout), encode the prompt, and prepare the output list.", level: "function" },
  { lineStart: 8, lineEnd: 8, text: "Truncate context to max_seq_len — the model can only attend to a fixed window.", level: "line" },
  { lineStart: 9, lineEnd: 10, text: "Forward pass gives logits for every position; we only need the last one to predict the next token.", level: "line" },
  { lineStart: 12, lineEnd: 13, text: "Greedy: always pick the highest-probability token — deterministic but can be repetitive.", level: "line" },
  { lineStart: 14, lineEnd: 16, text: "Temperature: divide logits by T before softmax. T<1 sharpens the distribution; T>1 flattens it.", level: "line" },
  { lineStart: 17, lineEnd: 22, text: "Top-K: restrict sampling to the K most likely tokens, then sample from that subset.", level: "line" },
  { lineStart: 24, lineEnd: 27, text: "Append the chosen token and extend the context for the next iteration.", level: "line" },
];

function DecodingDiagram() {
  const strategies = [
    { name: "Greedy", desc: "argmax — deterministic", color: "#4ade80" },
    { name: "Temperature", desc: "softmax(logits/T) — varied", color: "#60a5fa" },
    { name: "Top-K", desc: "sample from top K — focused", color: "#a78bfa" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {strategies.map(({ name, desc, color }) => (
        <div key={name} className="rounded-lg border p-3 text-center" style={{ borderColor: color }}>
          <div className="font-semibold text-sm" style={{ color }}>{name}</div>
          <div className="text-xs text-gray-400 mt-1">{desc}</div>
        </div>
      ))}
    </div>
  );
}

export default function InferencePage() {
  const { markExerciseComplete } = useProgress();
  return (
    <article className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Inference &amp; Text Generation</h1>
      <p className="text-gray-300">
        The inference engine generates text autoregressively: at each step it runs a forward pass,
        picks the next token according to the chosen strategy, appends it to the context, and repeats
        until <code>max_new_tokens</code> is reached.
      </p>
      <DecodingDiagram />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-200">Source: <code>tiny_lm/inference.py</code> — generation loop</h2>
        <p className="text-sm text-gray-400">Hover or click highlighted lines to see annotations.</p>
        <AnnotatedCodeViewer source={INFERENCE_SOURCE} annotations={INFERENCE_ANNOTATIONS} />
      </section>

      <MultipleChoiceExercise
        prompt="Which decoding strategy always produces the same output for the same prompt?"
        options={["Temperature sampling", "Top-K sampling", "Greedy decoding", "Random sampling"]}
        solution="Greedy decoding"
        hint="Greedy always picks the argmax — no randomness."
        onComplete={() => markExerciseComplete(LESSON_ID, "mc1", TOTAL_EXERCISES)}
      />
      <CodeCompletionExercise
        prompt="Complete greedy next-token selection:"
        starterCode={"next_logits = logits[0, -1, :]  # [vocab]\n# select next token id\nnext_id = ???"}
        solution={"next_logits = logits[0, -1, :]\nnext_id = int(next_logits.argmax())"}
        hint="Use .argmax() on the logits tensor."
        onComplete={() => markExerciseComplete(LESSON_ID, "cc1", TOTAL_EXERCISES)}
      />
    </article>
  );
}
