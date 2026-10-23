"use client";

import React, { useState, useMemo } from "react";

interface Props {
  weights?: number[][];
}

/** Compute a simple attention-like weight matrix from token strings (client-side). */
function computeWeights(tokens: string[]): number[][] {
  const n = tokens.length;
  if (n === 0) return [];
  // Simple heuristic: weight[i][j] = similarity based on shared chars, causal masked
  const raw = tokens.map((t, i) =>
    tokens.map((s, j) => {
      if (j > i) return 0; // causal mask
      const shared = [...t].filter((c) => s.includes(c)).length;
      return shared + 1;
    })
  );
  // Softmax per row
  return raw.map((row) => {
    const sum = row.reduce((a, b) => a + b, 0) || 1;
    return row.map((v) => v / sum);
  });
}

function weightToColor(w: number): string {
  const v = Math.round(w * 255);
  return `rgb(${v}, ${Math.round(v * 0.6)}, 0)`;
}

/** Interactive attention weight heatmap. */
export function AttentionHeatmap({ weights: externalWeights }: Props) {
  const [input, setInput] = useState("the cat sat");

  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const weights = externalWeights ?? computeWeights(tokens);

  return (
    <div className="space-y-3">
      <label className="block text-sm text-gray-300">
        Tokens (space-separated):
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="ml-2 rounded border border-gray-600 bg-gray-800 px-2 py-0.5 text-gray-100 text-sm"
        />
      </label>
      {weights.length > 0 && (
        <div
          role="grid"
          aria-label="attention heatmap"
          style={{ display: "grid", gridTemplateColumns: `repeat(${weights[0].length}, 2rem)`, gap: "2px" }}
        >
          {weights.flatMap((row, i) =>
            row.map((w, j) => (
              <div
                key={`${i}-${j}`}
                role="gridcell"
                title={`[${i},${j}] = ${w.toFixed(2)}`}
                style={{ width: "2rem", height: "2rem", background: weightToColor(w), borderRadius: "3px" }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
