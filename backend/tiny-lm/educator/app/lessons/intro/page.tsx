"use client";
import React from "react";
import { ArchitectureDiagram } from "@/src/components/Diagrams/ArchitectureDiagram";
import { MultipleChoiceExercise } from "@/src/components/Exercises/MultipleChoiceExercise";
import { CodeCompletionExercise } from "@/src/components/Exercises/CodeCompletionExercise";
import { useProgress } from "@/src/hooks/useProgress";

const LESSON_ID = "intro";
const TOTAL_EXERCISES = 2;

export default function IntroPage() {
  const { markExerciseComplete } = useProgress();
  return (
    <article className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-100">Introduction &amp; Architecture Overview</h1>
      <p className="text-gray-300">
        Tiny LM is a decoder-only transformer built from scratch. It converts raw text into token
        IDs, embeds them, passes them through stacked transformer blocks, and projects to vocabulary
        logits to predict the next token.
      </p>
      <ArchitectureDiagram />
      <MultipleChoiceExercise
        prompt="What is the final output of the TinyLM forward pass?"
        options={["Token embeddings", "Attention weights", "Logits over the vocabulary", "Hidden states"]}
        solution="Logits over the vocabulary"
        hint="The last layer is a linear projection to vocab_size."
        onComplete={() => markExerciseComplete(LESSON_ID, "mc1", TOTAL_EXERCISES)}
      />
      <CodeCompletionExercise
        prompt="Complete the TinyLM forward method signature:"
        starterCode={"def forward(self, token_ids):\n    # your code here\n    pass"}
        solution={"def forward(self, token_ids):\n    x = self.embedding(token_ids)\n    for block in self.blocks:\n        x = block(x)\n    x = self.norm(x)\n    return self.head(x)"}
        hint="Embed → blocks → norm → head."
        onComplete={() => markExerciseComplete(LESSON_ID, "cc1", TOTAL_EXERCISES)}
      />
    </article>
  );
}
