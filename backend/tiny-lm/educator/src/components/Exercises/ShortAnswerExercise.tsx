"use client";

import React, { useState } from "react";

interface Props {
  prompt: string;
  solution: string;
  hint: string;
  onComplete?: () => void;
}

export function ShortAnswerExercise({ prompt, solution, hint, onComplete }: Props) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = value.trim().toLowerCase() === solution.trim().toLowerCase();

  function handleSubmit() {
    setSubmitted(true);
    if (isCorrect) onComplete?.();
  }

  return (
    <div className="rounded-lg border border-gray-700 p-4 space-y-3">
      <p className="font-medium text-gray-100">{prompt}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => !submitted && setValue(e.target.value)}
        className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-1 text-gray-100"
        placeholder="Your answer…"
      />
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
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
