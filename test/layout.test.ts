import { describe, it, expect } from "vitest";
import { computeFeasibility } from "../lib/feasibility";
import { planLayouts } from "../lib/layout";
import type { LayoutOption, Room } from "../lib/schemas";
import { allBriefs, goldenBrief, tinyLotBrief } from "./fixtures";

const EPS = 1e-6;

function overlaps(a: Room, b: Room): boolean {
  const ix = Math.min(a.xM + a.widthM, b.xM + b.widthM) - Math.max(a.xM, b.xM);
  const iy = Math.min(a.yM + a.depthM, b.yM + b.depthM) - Math.max(a.yM, b.yM);
  return ix > EPS && iy > EPS; // positive overlap area
}

function assertValidGeometry(layout: LayoutOption) {
  const { widthM: W, depthM: D } = layout.footprint;
  for (const r of layout.rooms) {
    // in bounds
    expect(r.xM).toBeGreaterThanOrEqual(-EPS);
    expect(r.yM).toBeGreaterThanOrEqual(-EPS);
    expect(r.xM + r.widthM).toBeLessThanOrEqual(W + EPS);
    expect(r.yM + r.depthM).toBeLessThanOrEqual(D + EPS);
    // positive size
    expect(r.widthM).toBeGreaterThan(EPS);
    expect(r.depthM).toBeGreaterThan(EPS);
    // openings present
    expect(r.doors.length).toBeGreaterThanOrEqual(1);
  }
  // no overlap, any pair
  for (let i = 0; i < layout.rooms.length; i++) {
    for (let j = i + 1; j < layout.rooms.length; j++) {
      expect(overlaps(layout.rooms[i], layout.rooms[j])).toBe(false);
    }
  }
}

describe("planLayouts — invariants by construction", () => {
  it("returns exactly 2 distinct options (A and B)", () => {
    const f = computeFeasibility(goldenBrief);
    const layouts = planLayouts(goldenBrief, f);
    expect(layouts.map((l) => l.id)).toEqual(["A", "B"]);
    expect(layouts[0].summary).not.toBe(layouts[1].summary);
  });

  it("every brief produces in-bounds, non-overlapping rooms (no garbage)", () => {
    for (const brief of Object.values(allBriefs)) {
      const f = computeFeasibility(brief);
      for (const layout of planLayouts(brief, f)) {
        assertValidGeometry(layout);
      }
    }
  });

  it("covers every requested room (count matches derived rooms)", () => {
    const f = computeFeasibility(goldenBrief);
    const layout = planLayouts(goldenBrief, f)[0];
    // 3 bedrooms + 2 bathrooms + kitchen(auto) + ruang tamu + ruang keluarga = 8
    expect(layout.rooms.length).toBe(8);
  });

  it("impossible ask stays valid geometry but flags fits:false with a tradeoff note", () => {
    const f = computeFeasibility(tinyLotBrief);
    const layouts = planLayouts(tinyLotBrief, f);
    for (const layout of layouts) assertValidGeometry(layout); // still no garbage
    expect(layouts.some((l) => !l.fits)).toBe(true);
    const withNotes = layouts.find((l) => !l.fits)!;
    expect(withNotes.notes.length).toBeGreaterThanOrEqual(1);
  });

  it("band heights tile the footprint depth exactly (rooms reach top and bottom edges)", () => {
    const f = computeFeasibility(goldenBrief);
    const layout = planLayouts(goldenBrief, f)[0];
    const minY = Math.min(...layout.rooms.map((r) => r.yM));
    const maxY = Math.max(...layout.rooms.map((r) => r.yM + r.depthM));
    expect(minY).toBeCloseTo(0, 5);
    expect(maxY).toBeCloseTo(layout.footprint.depthM, 5);
  });
});
