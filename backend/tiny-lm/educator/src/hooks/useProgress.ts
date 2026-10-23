"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "tiny-lm-educator-progress";

interface PersistedProgress {
  version: 1;
  completedLessons: string[];
  completedExercises: Record<string, string[]>;
  lastVisitedLesson: string | null;
}

export interface ProgressState {
  completedLessons: Set<string>;
  completedExercises: Record<string, Set<string>>;
  lastVisitedLesson: string | null;
  storageUnavailable: boolean;
}

interface UseProgressReturn {
  state: ProgressState;
  markLessonComplete: (lessonId: string) => void;
  markExerciseComplete: (lessonId: string, exerciseId: string, totalExercises: number) => void;
  resetProgress: () => void;
}

function serialize(state: ProgressState): PersistedProgress {
  return {
    version: 1,
    completedLessons: Array.from(state.completedLessons),
    completedExercises: Object.fromEntries(
      Object.entries(state.completedExercises).map(([k, v]) => [k, Array.from(v)])
    ),
    lastVisitedLesson: state.lastVisitedLesson,
  };
}

function deserialize(raw: PersistedProgress): Omit<ProgressState, "storageUnavailable"> {
  const completedExercises: Record<string, Set<string>> = {};
  for (const [k, v] of Object.entries(raw.completedExercises ?? {})) {
    completedExercises[k] = new Set(Array.isArray(v) ? v : []);
  }
  return {
    completedLessons: new Set(Array.isArray(raw.completedLessons) ? raw.completedLessons : []),
    completedExercises,
    lastVisitedLesson: raw.lastVisitedLesson ?? null,
  };
}

function isStorageAvailable(): boolean {
  try {
    const key = "__storage_test__";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

const EMPTY_STATE: ProgressState = {
  completedLessons: new Set(),
  completedExercises: {},
  lastVisitedLesson: null,
  storageUnavailable: false,
};

export function useProgress(): UseProgressReturn {
  const [state, setState] = useState<ProgressState>(() => {
    if (!isStorageAvailable()) {
      return { ...EMPTY_STATE, storageUnavailable: true };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return EMPTY_STATE;
      const parsed: PersistedProgress = JSON.parse(raw);
      return { ...deserialize(parsed), storageUnavailable: false };
    } catch {
      return EMPTY_STATE;
    }
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (state.storageUnavailable) return;
    try {
      // If nothing is stored, remove the key rather than writing empty state
      const isEmpty =
        state.completedLessons.size === 0 &&
        Object.keys(state.completedExercises).length === 0 &&
        state.lastVisitedLesson === null;
      if (isEmpty) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(state)));
      }
    } catch {
      // ignore write errors
    }
  }, [state]);

  const markLessonComplete = useCallback((lessonId: string) => {
    setState((prev) => ({
      ...prev,
      completedLessons: new Set([...prev.completedLessons, lessonId]),
    }));
  }, []);

  const markExerciseComplete = useCallback(
    (lessonId: string, exerciseId: string, totalExercises: number) => {
      setState((prev) => {
        // Use Object.hasOwn to avoid prototype pollution (e.g. lessonId = "toString")
        const existing = Object.hasOwn(prev.completedExercises, lessonId)
          ? prev.completedExercises[lessonId]
          : new Set<string>();
        const lessonExercises = new Set(existing);
        lessonExercises.add(exerciseId);
        const newExercises = { ...prev.completedExercises, [lessonId]: lessonExercises };

        // Auto-mark lesson complete when all exercises are done
        const newCompleted = new Set(prev.completedLessons);
        if (lessonExercises.size >= totalExercises) {
          newCompleted.add(lessonId);
        }

        return {
          ...prev,
          completedExercises: newExercises,
          completedLessons: newCompleted,
        };
      });
    },
    []
  );

  const resetProgress = useCallback(() => {
    setState((prev) => {
      if (!prev.storageUnavailable) {
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      }
      return { ...EMPTY_STATE, storageUnavailable: prev.storageUnavailable };
    });
  }, []);

  return { state, markLessonComplete, markExerciseComplete, resetProgress };
}
