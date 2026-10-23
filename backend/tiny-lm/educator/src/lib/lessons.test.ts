import { describe, it, expect } from "vitest";
import { lessons } from "./lessons";

const REQUIRED_IDS = [
  "intro",
  "tokenizer",
  "embeddings",
  "attention-sdp",
  "attention-mha",
  "ffn",
  "transformer-block",
  "model-assembly",
  "training-loop",
  "inference",
];

describe("lesson registry", () => {
  it("has exactly 10 lessons", () => {
    expect(lessons).toHaveLength(10);
  });

  it("contains all required lesson IDs", () => {
    const ids = lessons.map((l) => l.id);
    for (const id of REQUIRED_IDS) {
      expect(ids).toContain(id);
    }
  });

  it("lessons are ordered 1–10 with no gaps", () => {
    const orders = lessons.map((l) => l.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("every lesson has non-empty id, title, and sourceFile", () => {
    for (const lesson of lessons) {
      expect(lesson.id.length).toBeGreaterThan(0);
      expect(lesson.title.length).toBeGreaterThan(0);
      expect(lesson.sourceFile.length).toBeGreaterThan(0);
    }
  });
});
