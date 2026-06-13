import { describe, it, expect } from "vitest";
import { buildImagePrompt } from "../lib/prompt";
import { buildBundle } from "../lib/bundle";
import { goldenBrief } from "./fixtures";

const bundle = buildBundle(goldenBrief, { id: "t", createdAt: "2026-06-13T00:00:00.000Z" });
const layout = bundle.layouts[0];

describe("buildImagePrompt (VisualPromptWriter)", () => {
  it("locks floor count, style, lot, and the not-technical disclaimer", () => {
    const p = buildImagePrompt(goldenBrief, layout, "front_elevation");
    expect(p).toMatch(/1 lantai/);
    expect(p.toLowerCase()).toContain("minimalis");
    expect(p).toContain("10 x 10");
    expect(p.toLowerCase()).toContain("bukan gambar teknik");
    expect(p.toLowerCase()).toContain("hindari kesan mewah");
    expect(p).toContain("Tampak depan");
  });

  it("switches framing for the 3D view", () => {
    const p = buildImagePrompt(goldenBrief, layout, "exterior_3d");
    expect(p.toLowerCase()).toContain("3d");
    expect(p.toLowerCase()).toContain("bukan gambar teknik");
  });
});
