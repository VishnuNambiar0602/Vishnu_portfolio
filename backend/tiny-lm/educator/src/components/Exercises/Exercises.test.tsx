import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MultipleChoiceExercise } from "./MultipleChoiceExercise";
import { CodeCompletionExercise } from "./CodeCompletionExercise";

describe("MultipleChoiceExercise", () => {
  const props = {
    prompt: "What is 2+2?",
    options: ["3", "4", "5"],
    solution: "4",
    hint: "Think addition.",
  };

  it("renders all options", () => {
    render(<MultipleChoiceExercise {...props} />);
    expect(screen.getByLabelText("3")).toBeTruthy();
    expect(screen.getByLabelText("4")).toBeTruthy();
    expect(screen.getByLabelText("5")).toBeTruthy();
  });

  it("correct answer shows success", () => {
    render(<MultipleChoiceExercise {...props} />);
    fireEvent.click(screen.getByLabelText("4"));
    fireEvent.click(screen.getByText("Submit"));
    expect(screen.getByRole("status").textContent).toContain("Correct");
  });

  it("incorrect answer shows hint", () => {
    render(<MultipleChoiceExercise {...props} />);
    fireEvent.click(screen.getByLabelText("3"));
    fireEvent.click(screen.getByText("Submit"));
    expect(screen.getByRole("alert").textContent).toContain("Think addition");
  });
});

describe("CodeCompletionExercise", () => {
  const props = {
    prompt: "Complete the function",
    starterCode: "def add(a, b):\n    pass",
    solution: "def add(a, b):\n    return a + b",
    hint: "Use return.",
  };

  it("renders starter code in editor", () => {
    render(<CodeCompletionExercise {...props} />);
    const editor = screen.getByRole("textbox", { name: /code editor/i }) as HTMLTextAreaElement;
    expect(editor.value).toContain("def add");
  });

  it("correct submission shows success", () => {
    render(<CodeCompletionExercise {...props} />);
    const editor = screen.getByRole("textbox", { name: /code editor/i }) as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: props.solution } });
    fireEvent.click(screen.getByText("Submit"));
    expect(screen.getByRole("status").textContent).toContain("Correct");
  });

  it("incorrect submission shows hint", () => {
    render(<CodeCompletionExercise {...props} />);
    fireEvent.click(screen.getByText("Submit"));
    expect(screen.getByRole("alert").textContent).toContain("Use return");
  });
});
