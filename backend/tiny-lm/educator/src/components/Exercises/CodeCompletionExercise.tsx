"use client";

import React, { useState } from "react";

interface Props {
  prompt: string;
  starterCode: string;
  solution: string;
  hint: string;
  onComplete?: () => void;
}

export function CodeCompletionExercise({ prompt, starterCode, solution, hint, onComplete }: Props) {
  const [code, setCode] = useState(starterCode);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = code.trim() === solution.trim();

  function handleSubmit() {
    setSubmitted(true);
    if (isCorrect) onComplete?.();
  }

  return (
    <div className="rounded-lg border border-gray-700 p-4 space-y-3">
      <p className="font-medium text-gray-100">{prompt}</p>
      <textarea
        value={code}
        onChange={(e) => !submitted && setCode(e.target.value)}
        rows={6}
        className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 font-mono text-sm text-gray-100"
        aria-label="code editor"
      />
      {!submitted && (
        <button
          onClick={handleSubmit}
          className="px-4 py-1 rounded bg-blue-600 text-white"
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
