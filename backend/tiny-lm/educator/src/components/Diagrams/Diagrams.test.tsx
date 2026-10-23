import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { AttentionHeatmap } from "./AttentionHeatmap";

describe("ArchitectureDiagram", () => {
  it("renders without crashing", () => {
    const { container } = render(<ArchitectureDiagram />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("has an accessible label", () => {
    render(<ArchitectureDiagram />);
    expect(screen.getByLabelText(/transformer architecture/i)).toBeTruthy();
  });
});

describe("AttentionHeatmap", () => {
  it("renders a cell for each weight in external weights", () => {
    const weights = [[0.5, 0], [0.3, 0.7]];
    render(<AttentionHeatmap weights={weights} />);
    const cells = screen.getAllByRole("gridcell");
    expect(cells).toHaveLength(4); // 2×2
  });

  it("updating input tokens re-renders the heatmap", () => {
    render(<AttentionHeatmap />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "a b c" } });
    const cells = screen.getAllByRole("gridcell");
    expect(cells.length).toBe(9); // 3×3
  });
});
