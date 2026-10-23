"use client";
import React from "react";
import { ArchitectureDiagram } from "@/src/components/Diagrams/ArchitectureDiagram";
import { MultipleChoiceExercise } from "@/src/components/Exercises/MultipleChoiceExercise";
import { CodeCompletionExercise } from "@/src/components/Exercises/CodeCompletionExercise";
import { useProgress } from "@/src/hooks/useProgress";

const LESSON_ID = "model-assembly";
const TOTAL_EXERCISES = 2;

export default function ModelAssemblyPage() {
  const { markExerciseComplete } = useProgress();
  return (
    <article className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Full Model Assembly</h1>
      <p className="text-gray-300">
        TinyLM stacks <code>n_layers</code> transformer blocks on top of the embedding layer, applies
        a final LayerNorm, then projects to <code>vocab_size</code> logits via a linear head.
      </p>
      <ArchitectureDiagram />
      <MultipleChoiceExercise
        prompt="What does num_parameters() count?"
        options={["Only embedding parameters", "Only attention parameters", "All trainable parameters", "Non-trainable buffers"]}
        solution="All trainable parameters"
        hint="It sums p.numel() for all p where requires_grad is True."
        onComplete={() => markExerciseComplete(LESSON_ID, "mc1", TOTAL_EXERCISES)}
      />
      <CodeCompletionExercise
        prompt="Complete num_parameters():"
        starterCode={"def num_parameters(self):\n    # sum all trainable param counts\n    pass"}
        solution={"def num_parameters(self):\n    return sum(p.numel() for p in self.parameters() if p.requires_grad)"}
        hint="Use self.parameters() and filter by requires_grad."
        onComplete={() => markExerciseComplete(LESSON_ID, "cc1", TOTAL_EXERCISES)}
      />
    </article>
  );
}
