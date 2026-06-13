import { describe, it, expect } from "vitest";
import { computeFeasibility } from "../lib/feasibility";
import { planLayouts } from "../lib/layout";
import { renderPlanSvg } from "../lib/svg";
import { goldenBrief } from "./fixtures";

describe("renderPlanSvg", () => {
  const layout = planLayouts(goldenBrief, computeFeasibility(goldenBrief))[0];
  const svg = renderPlanSvg(layout);

  it("produces a well-formed svg root with a viewBox", () => {
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("viewBox=");
    expect(svg.trim().endsWith("</svg>")).toBe(true);
  });

  it("draws a rect per room plus the footprint border", () => {
    const rectCount = (svg.match(/<rect /g) ?? []).length;
    expect(rectCount).toBe(layout.rooms.length + 1); // rooms + border
  });

  it("labels rooms and their dimensions", () => {
    expect(svg).toContain("Kamar Utama");
    expect(svg).toContain("Dapur");
    expect(svg).toMatch(/\d+(\.\d+)? × \d+(\.\d+)? m/);
  });
});
