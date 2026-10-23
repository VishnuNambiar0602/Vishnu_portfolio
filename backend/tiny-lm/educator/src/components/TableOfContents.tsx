"use client";

import React from "react";
import Link from "next/link";
import { lessons } from "../lib/lessons";
import { useProgress } from "../hooks/useProgress";

export function TableOfContents() {
  const { state, resetProgress } = useProgress();
  const [confirmReset, setConfirmReset] = React.useState(false);
  const completed = state.completedLessons.size;

  return (
    <nav aria-label="Table of contents" className="w-64 shrink-0 p-4 border-r border-gray-700 flex flex-col gap-4">
      {/* Progress indicator */}
      <div className="text-sm text-gray-400">
        {completed} / {lessons.length} lessons complete
      </div>

      {/* Lesson list */}
      <ol className="space-y-1">
        {lessons.map((lesson) => {
          const done = state.completedLessons.has(lesson.id);
          return (
            <li key={lesson.id}>
              <Link
                href={`/lessons/${lesson.id}`}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <span
                  aria-label={done ? "completed" : "not completed"}
                  className={`w-4 h-4 rounded-full border ${done ? "bg-green-500 border-green-500" : "border-gray-500"}`}
                />
                {lesson.order}. {lesson.title}
              </Link>
            </li>
          );
        })}
      </ol>

      {/* Reset progress */}
      {!confirmReset ? (
        <button
          onClick={() => setConfirmReset(true)}
          className="mt-auto text-xs text-gray-500 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
        >
          Reset Progress
        </button>
      ) : (
        <div className="mt-auto space-y-1">
          <span className="block text-xs text-gray-400">Are you sure?</span>
          <div className="flex gap-2">
            <button
              onClick={() => { resetProgress(); setConfirmReset(false); }}
              className="text-xs px-2 py-1 rounded bg-red-700 text-white hover:bg-red-600"
            >
              Yes, reset
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Storage unavailable warning */}
      {state.storageUnavailable && (
        <span role="alert" className="block text-xs text-yellow-400">
          Progress won't be saved (storage unavailable).
        </span>
      )}
    </nav>
  );
}
