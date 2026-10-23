import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import fc from "fast-check";
import { useProgress } from "./useProgress";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

const STORAGE_KEY = "tiny-lm-educator-progress";

beforeEach(() => {
  localStorageMock.clear();
});

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe("useProgress", () => {
  it("marks a lesson complete", () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.markLessonComplete("intro"));
    expect(result.current.state.completedLessons.has("intro")).toBe(true);
  });

  it("marks an exercise complete", () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.markExerciseComplete("intro", "ex1", 3));
    expect(result.current.state.completedExercises["intro"]?.has("ex1")).toBe(true);
  });

  it("auto-marks lesson complete when all exercises done", () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.markExerciseComplete("intro", "ex1", 2));
    act(() => result.current.markExerciseComplete("intro", "ex2", 2));
    expect(result.current.state.completedLessons.has("intro")).toBe(true);
  });

  it("reset clears all state", () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.markLessonComplete("intro"));
    act(() => result.current.resetProgress());
    expect(result.current.state.completedLessons.size).toBe(0);
    expect(localStorageMock.getItem(STORAGE_KEY)).toBeNull();
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useProgress());
    act(() => result.current.markLessonComplete("tokenizer"));
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!);
    expect(stored.completedLessons).toContain("tokenizer");
  });

  it("restores state from localStorage on mount", () => {
    localStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, completedLessons: ["ffn"], completedExercises: {}, lastVisitedLesson: null })
    );
    const { result } = renderHook(() => useProgress());
    expect(result.current.state.completedLessons.has("ffn")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property 12: Progress Persistence Round-Trip — Validates: Requirements 12.1, 12.2
// ---------------------------------------------------------------------------

describe("Property 12: progress persistence round-trip", () => {
  it("restores completed lessons after simulated reload", () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 5 }),
        (lessonIds) => {
          localStorageMock.clear();
          const { result } = renderHook(() => useProgress());
          act(() => {
            for (const id of lessonIds) result.current.markLessonComplete(id);
          });
          // Simulate reload: new hook instance reads from localStorage
          const { result: result2 } = renderHook(() => useProgress());
          for (const id of lessonIds) {
            expect(result2.current.state.completedLessons.has(id)).toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Exercise Completion Triggers Lesson Completion — Validates: Requirements 11.6
// ---------------------------------------------------------------------------

describe("Property 13: exercise completion triggers lesson completion", () => {
  it("marks lesson complete when all exercises are done", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }).map(
          (arr) => [...new Set(arr)]
        ),
        (lessonId, exerciseIds) => {
          localStorageMock.clear();
          const { result } = renderHook(() => useProgress());
          act(() => {
            for (const exId of exerciseIds) {
              result.current.markExerciseComplete(lessonId, exId, exerciseIds.length);
            }
          });
          expect(result.current.state.completedLessons.has(lessonId)).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });
});
