"use client";

import React, { useState } from "react";

interface Props {
  prompt: string;
  options: string[];
  solution: string;
  hint: string;
  onComplete?: () => void;
}

export function MultipleChoiceExercise({ prompt, options, solution, hint, onComplete }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected === solution;

  function handleSubmit() {
    if (!selected) return;
    setSubmitted(true);
    if (isCorrect) onComplete?.();
  }

  return (
    <div className="rounded-lg border border-gray-700 p-4 space-y-3">
      <p className="font-medium text-gray-100">{prompt}</p>
      <ul className="space-y-2">
        {options.map((opt) => (
          <li key={opt}>
            <label className="flex items-center gap-2 cursor-pointer text-gray-300">
              <input
                type="radio"
                name="mc"
                value={opt}
                checked={selected === opt}
                onChange={() => !submitted && setSelected(opt)}
              />
              {opt}
            </label>
          </li>
        ))}
      </ul>
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!selected}
          className="px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-40"
        >
          Submit
        </button>
      )}
      {submitted && isCorrect && (
        <p role="status" className="text-green-400">Correct!</p>
      )}
      {submitted && !isCorrect && (
        <p role="alert" className="text-red-400">Incorrect. Hint: {hint}</p>
      )}
    </div>
  );
}
