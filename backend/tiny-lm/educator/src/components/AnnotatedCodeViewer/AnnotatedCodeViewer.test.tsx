import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnnotatedCodeViewer } from "./index";

const SOURCE = `def hello(x):
    return x + 1
y = hello(2)`;

const ANNOTATIONS = [
  { lineStart: 1, lineEnd: 2, text: "Function hello — adds 1 to x.", level: "function" as const },
  { lineStart: 3, lineEnd: 3, text: "Call hello with 2.", level: "line" as const },
];

describe("AnnotatedCodeViewer", () => {
  it("renders source code", () => {
    render(<AnnotatedCodeViewer source={SOURCE} annotations={ANNOTATIONS} />);
    expect(screen.getByText(/def hello/)).toBeTruthy();
  });

  it("clicking an annotated line shows the popover with correct text", () => {
    render(<AnnotatedCodeViewer source={SOURCE} annotations={ANNOTATIONS} />);
    const line1 = screen.getByText(/def hello/).closest("[data-line]")!;
    fireEvent.click(line1);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    expect(screen.getByRole("tooltip").textContent).toContain("Function hello");
  });

  it("active line receives the active-line class after click", () => {
    render(<AnnotatedCodeViewer source={SOURCE} annotations={ANNOTATIONS} />);
    const line1 = screen.getByText(/def hello/).closest("[data-line]")!;
    fireEvent.click(line1);
    expect(line1.className).toContain("active-line");
  });

  it("non-annotated lines have no popover on click", () => {
    render(<AnnotatedCodeViewer source={SOURCE} annotations={ANNOTATIONS} />);
    // Line 2 is covered by the function annotation, line 3 is annotated.
    // Let's use a source with a truly non-annotated line.
    const { container } = render(
      <AnnotatedCodeViewer source={"# comment\npass"} annotations={[]} />
    );
    const lines = container.querySelectorAll("[data-line]");
    fireEvent.click(lines[0]);
    expect(container.querySelector("[role='tooltip']")).toBeNull();
  });
});
