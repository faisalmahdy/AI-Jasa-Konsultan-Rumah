import { describe, it, expect } from "vitest";
import { buildBundle } from "../lib/bundle";
import { renderBriefPdf } from "../lib/pdf";
import type { VisualVersion } from "../lib/schemas";
import { goldenBrief } from "./fixtures";

function pdfPageCount(buf: Buffer): number | null {
  const txt = buf.toString("latin1");
  const m = txt.match(/\/Count\s+(\d+)/);
  return m ? Number(m[1]) : null;
}

describe("renderBriefPdf", () => {
  it("renders a valid 5-page PDF for the thin-MVP bundle (no visual)", async () => {
    const bundle = buildBundle(goldenBrief, { id: "test", createdAt: "2026-06-13T00:00:00.000Z" });
    expect(bundle.visuals).toHaveLength(0);

    const buf = await renderBriefPdf(bundle);
    expect(buf.length).toBeGreaterThan(3000);
    expect(buf.toString("latin1", 0, 5)).toBe("%PDF-");
    // 5 pages => disclaimer (fixed footer) appears on all 5 by construction.
    expect(pdfPageCount(buf)).toBe(5);
  });

  it("CRITICAL: PDF still ships with plans even though no visual exists (degradation)", async () => {
    const bundle = buildBundle(goldenBrief, { id: "t2", createdAt: "2026-06-13T00:00:00.000Z" });
    const buf = await renderBriefPdf(bundle);
    expect(buf.toString("latin1", 0, 5)).toBe("%PDF-");
    expect(pdfPageCount(buf)).toBe(5);
  });

  it("also renders when a visual IS present (stage-3 forward-compat)", async () => {
    const visual: VisualVersion = {
      id: "v1",
      type: "front_elevation",
      prompt: "rumah minimalis 1 lantai",
      status: "accepted",
    };
    const bundle = buildBundle(goldenBrief, { id: "t3", createdAt: "2026-06-13T00:00:00.000Z" });
    bundle.visuals.push(visual);
    const buf = await renderBriefPdf(bundle);
    expect(buf.toString("latin1", 0, 5)).toBe("%PDF-");
    expect(pdfPageCount(buf)).toBe(5);
  });
});
