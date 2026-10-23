"use client";

import React, { useState } from "react";

export interface Annotation {
  lineStart: number;
  lineEnd: number;
  text: string;
  level: "function" | "line";
}

interface Props {
  source: string;
  annotations: Annotation[];
  language?: string;
}

/** Returns the annotation whose range covers the given line number, or null. */
function findAnnotation(annotations: Annotation[], lineNo: number): Annotation | null {
  return (
    annotations.find((a) => lineNo >= a.lineStart && lineNo <= a.lineEnd) ?? null
  );
}

export function AnnotatedCodeViewer({ source, annotations, language = "python" }: Props) {
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [pinnedLine, setPinnedLine] = useState<number | null>(null);
  const lines = source.split("\n");

  // Pinned line takes priority; otherwise show hovered line
  const displayLine = pinnedLine ?? activeLine;
  const activeAnnotation = displayLine !== null ? findAnnotation(annotations, displayLine) : null;

  return (
    <div className="relative font-mono text-sm rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
      {/* Code block */}
      <pre className="overflow-x-auto p-4">
        <code>
          {lines.map((line, idx) => {
            const lineNo = idx + 1;
            const annotation = findAnnotation(annotations, lineNo);
            const isPinned = pinnedLine === lineNo;
            const isActive = displayLine === lineNo;
            const isAnnotated = annotation !== null;

            return (
              <div
                key={lineNo}
                data-line={lineNo}
                data-annotated={isAnnotated ? "true" : undefined}
                className={[
                  "px-2 -mx-2 rounded cursor-default",
                  isActive ? "bg-yellow-900/60 active-line" : "",
                  isAnnotated && !isActive ? "hover:bg-gray-800" : "",
                  isAnnotated ? "annotated-line" : "",
                ].join(" ")}
                onClick={() => {
                  if (!isAnnotated) return;
                  // Toggle pin: click pinned line to unpin, click other to pin
                  setPinnedLine(isPinned ? null : lineNo);
                }}
                onMouseEnter={() => isAnnotated && !pinnedLine && setActiveLine(lineNo)}
                onMouseLeave={() => !pinnedLine && setActiveLine(null)}
              >
                <span className="select-none text-gray-500 mr-4 text-xs w-6 inline-block text-right">
                  {lineNo}
                </span>
                <span className="text-gray-100">{line || " "}</span>
                {isAnnotated && (
                  <span className="ml-2 text-yellow-400 text-xs opacity-60">●</span>
                )}
              </div>
            );
          })}
        </code>
      </pre>

      {/* Annotation popover */}
      {activeAnnotation && (
        <div
          role="tooltip"
          className="absolute bottom-0 left-0 right-0 bg-gray-800 border-t border-yellow-600 p-3 text-sm text-gray-200"
        >
          <span className="text-yellow-400 font-semibold mr-2">
            {activeAnnotation.level === "function" ? "fn" : "→"}
          </span>
          {activeAnnotation.text}
        </div>
      )}
    </div>
  );
}
