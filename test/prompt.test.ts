import { describe, it, expect } from "vitest";
import { buildImagePrompt, VIEW_ORDER } from "../lib/prompt";
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

  it("frames the hero 3D as a wide 3/4 aerial from the front-right", () => {
    const p = buildImagePrompt(goldenBrief, layout, "exterior_3d");
    expect(p.toLowerCase()).toContain("3d");
    expect(p).toMatch(/3\/4/);
    expect(p.toLowerCase()).toContain("depan-kanan");
    expect(p.toLowerCase()).toMatch(/drone|helikopter/);
    expect(p.toLowerCase()).toContain("bukan gambar teknik");
  });

  it("every view type produces a non-empty prompt with the honesty lock", () => {
    for (const view of VIEW_ORDER) {
      const p = buildImagePrompt(goldenBrief, layout, view);
      expect(p.length).toBeGreaterThan(40);
      expect(p.toLowerCase()).toContain("bukan gambar teknik");
    }
  });

  it("furnished interior plan lists real rooms with furniture (from the layout)", () => {
    const p = buildImagePrompt(goldenBrief, layout, "denah_interior");
    expect(p.toLowerCase()).toContain("top-down");
    expect(p.toLowerCase()).toContain("perabot");
    expect(p).toContain("Kamar Utama"); // a real room name from the derived layout
    expect(p.toLowerCase()).toContain("tempat tidur"); // master-bedroom furniture
  });

  it("the top view asks for a straight-down bird-eye framing", () => {
    const p = buildImagePrompt(goldenBrief, layout, "tampak_atas");
    expect(p.toLowerCase()).toMatch(/atas|bird-eye|top-down/);
  });

  it("appends revision tweak clauses before the honesty lock", () => {
    const p = buildImagePrompt(goldenBrief, layout, "front_elevation", ["warna lebih cerah"]);
    expect(p).toContain("Penyesuaian dari klien: warna lebih cerah");
    expect(p.indexOf("Penyesuaian")).toBeLessThan(p.indexOf("BUKAN gambar teknik"));
  });
});
