import React from "react";

/** Static SVG diagram of the full transformer stack. */
export function ArchitectureDiagram() {
  const layers = ["Input Tokens", "Embedding + PE", "Transformer Block ×N", "LayerNorm", "Linear → Logits"];
  const colors = ["#4ade80", "#60a5fa", "#a78bfa", "#f472b6", "#fb923c"];

  return (
    <svg
      viewBox="0 0 240 300"
      aria-label="Transformer architecture diagram"
      className="w-full max-w-xs mx-auto"
    >
      {layers.map((label, i) => (
        <g key={label} transform={`translate(20, ${20 + i * 52})`}>
          <rect width="200" height="36" rx="6" fill={colors[i]} fillOpacity="0.2" stroke={colors[i]} strokeWidth="1.5" />
          <text x="100" y="22" textAnchor="middle" fill={colors[i]} fontSize="11" fontFamily="monospace">
            {label}
          </text>
          {i < layers.length - 1 && (
            <line x1="100" y1="36" x2="100" y2="52" stroke="#6b7280" strokeWidth="1.5" markerEnd="url(#arrow)" />
          )}
        </g>
      ))}
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#6b7280" />
        </marker>
      </defs>
    </svg>
  );
}
