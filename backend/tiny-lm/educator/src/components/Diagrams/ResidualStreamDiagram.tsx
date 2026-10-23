import React from "react";

/** Diagram showing the residual stream and LayerNorm flow in a transformer block. */
export function ResidualStreamDiagram() {
  return (
    <svg viewBox="0 0 260 220" aria-label="Residual stream diagram" className="w-full max-w-xs mx-auto">
      {/* Input x */}
      <text x="130" y="18" textAnchor="middle" fill="#9ca3af" fontSize="11">x (input)</text>
      <line x1="130" y1="22" x2="130" y2="42" stroke="#6b7280" strokeWidth="1.5" />

      {/* LayerNorm 1 */}
      <rect x="80" y="42" width="100" height="28" rx="5" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5" />
      <text x="130" y="60" textAnchor="middle" fill="#60a5fa" fontSize="10">LayerNorm</text>
      <line x1="130" y1="70" x2="130" y2="90" stroke="#6b7280" strokeWidth="1.5" />

      {/* MHA */}
      <rect x="80" y="90" width="100" height="28" rx="5" fill="#2d1b69" stroke="#a78bfa" strokeWidth="1.5" />
      <text x="130" y="108" textAnchor="middle" fill="#a78bfa" fontSize="10">MultiHeadAttention</text>
      <line x1="130" y1="118" x2="130" y2="130" stroke="#6b7280" strokeWidth="1.5" />

      {/* Residual add 1 */}
      <circle cx="130" cy="138" r="10" fill="#374151" stroke="#4ade80" strokeWidth="1.5" />
      <text x="130" y="142" textAnchor="middle" fill="#4ade80" fontSize="12">+</text>
      {/* Residual skip line */}
      <path d="M130,22 Q30,22 30,138 L120,138" fill="none" stroke="#4ade80" strokeWidth="1" strokeDasharray="4,3" />

      <line x1="130" y1="148" x2="130" y2="162" stroke="#6b7280" strokeWidth="1.5" />

      {/* LayerNorm 2 */}
      <rect x="80" y="162" width="100" height="28" rx="5" fill="#1e3a5f" stroke="#60a5fa" strokeWidth="1.5" />
      <text x="130" y="180" textAnchor="middle" fill="#60a5fa" fontSize="10">LayerNorm</text>
      <line x1="130" y1="190" x2="130" y2="205" stroke="#6b7280" strokeWidth="1.5" />

      <text x="130" y="218" textAnchor="middle" fill="#9ca3af" fontSize="11">→ FFN (similar)</text>
    </svg>
  );
}
