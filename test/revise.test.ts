import { describe, it, expect } from "vitest";
import { applyRevision } from "../lib/revise";
import { buildBundle } from "../lib/bundle";
import type { RevisionIntent } from "../lib/schemas";
import { goldenBrief } from "./fixtures";

/** A no-op intent: every field "no change". Tests override only what they exercise. */
function emptyIntent(over: Partial<RevisionIntent> = {}): RevisionIntent {
  return {
    understanding: "tidak ada perubahan",
    briefPatch: {
      floors: null,
      style: null,
      bedrooms: null,
      bathrooms: null,
      budgetIdr: null,
      landWidthM: null,
      landDepthM: null,
      addRooms: [],
      removeRooms: [],
      priorities: null,
    },
    layoutPreference: "tidak_ada",
    visual: { tweak: false, clauses: [] },
    unsupported: [],
    needsClarification: null,
    ...over,
  };
}

const bundle = buildBundle(goldenBrief, { id: "p1", createdAt: "2026-06-14T00:00:00.000Z" });

describe("applyRevision (deterministic revision applier)", () => {
  it("preserves project identity and re-derives the plan", () => {
    const r = applyRevision(bundle, emptyIntent());
    expect(r.bundle.id).toBe("p1");
    expect(r.bundle.createdAt).toBe("2026-06-14T00:00:00.000Z");
    expect(r.bundle.layouts).toHaveLength(2); // invariant from the deterministic pipeline
  });

  it("changes bedroom count and re-runs feasibility + layout", () => {
    const r = applyRevision(
      bundle,
      emptyIntent({ briefPatch: { ...emptyIntent().briefPatch, bedrooms: 4 } }),
    );
    expect(r.bundle.brief.bedrooms).toBe(4);
    expect(r.changes.some((c) => /Kamar tidur/i.test(c))).toBe(true);
    // 4 bedrooms must show up as 4 bedroom-type rooms in both layouts.
    const beds = r.bundle.layouts[0].rooms.filter((rm) =>
      ["master_bedroom", "bedroom"].includes(rm.purpose),
    );
    expect(beds).toHaveLength(4);
  });

  it("adds and removes extra rooms (idempotent, deduped)", () => {
    const r = applyRevision(
      bundle,
      emptyIntent({
        briefPatch: {
          ...emptyIntent().briefPatch,
          addRooms: ["garasi", "garasi", "ruang_tamu"], // ruang_tamu already present; garasi dup
          removeRooms: ["ruang_keluarga"],
        },
      }),
    );
    expect(r.bundle.brief.extraRooms).toContain("garasi");
    expect(r.bundle.brief.extraRooms).not.toContain("ruang_keluarga");
    // garasi added once, ruang_tamu not re-added.
    expect(r.bundle.brief.extraRooms.filter((x) => x === "garasi")).toHaveLength(1);
    expect(r.changes.some((c) => /Tambah ruang/i.test(c))).toBe(true);
    expect(r.changes.some((c) => /Hapus ruang/i.test(c))).toBe(true);
  });

  it("maps a privacy preference to recommended layout A", () => {
    const r = applyRevision(bundle, emptyIntent({ layoutPreference: "privasi" }));
    expect(r.recommendedLayout).toBe("A");
    expect(r.changes.some((c) => /privasi/i.test(c))).toBe(true);
  });

  it("maps an open preference to recommended layout B", () => {
    const r = applyRevision(bundle, emptyIntent({ layoutPreference: "terbuka" }));
    expect(r.recommendedLayout).toBe("B");
  });

  it("collects visual tweak clauses without touching geometry", () => {
    const r = applyRevision(
      bundle,
      emptyIntent({ visual: { tweak: true, clauses: ["warna lebih cerah", " "] } }),
    );
    expect(r.visualClauses).toEqual(["warna lebih cerah"]); // blank dropped
    // No geometry change for a pure visual tweak.
    expect(r.bundle.brief.bedrooms).toBe(goldenBrief.bedrooms);
  });

  it("carries existing visuals forward untouched", () => {
    const withVisual = {
      ...bundle,
      visuals: [
        {
          id: "v1",
          type: "front_elevation" as const,
          prompt: "p",
          status: "accepted" as const,
          imageUrl: "/api/images/v1",
        },
      ],
    };
    const r = applyRevision(withVisual, emptyIntent({ briefPatch: { ...emptyIntent().briefPatch, style: "industrial" } }));
    expect(r.bundle.visuals).toHaveLength(1);
    expect(r.bundle.visuals[0].id).toBe("v1");
  });

  it("produces no change lines when nothing actually differs", () => {
    const r = applyRevision(
      bundle,
      emptyIntent({ briefPatch: { ...emptyIntent().briefPatch, bedrooms: goldenBrief.bedrooms } }),
    );
    expect(r.changes).toHaveLength(0);
  });
});
