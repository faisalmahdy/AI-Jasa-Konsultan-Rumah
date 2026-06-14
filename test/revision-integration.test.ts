import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  saveProject,
  getProject,
  nextVersionNumber,
  snapshotVersion,
  listVersions,
  updateProjectState,
  getProjectVisualClauses,
  getRecommendedLayout,
  logRevision,
  countProjectRevisions,
  countDailyRevisions,
} from "../lib/db";
import { buildBundle } from "../lib/bundle";
import { applyRevision } from "../lib/revise";
import type { ProjectVersion, RevisionIntent } from "../lib/schemas";
import { goldenBrief } from "./fixtures";

/**
 * End-to-end DB integration for the Stage 4 revision loop, against the real SQLite store
 * (the LLM half is covered separately with a mock client). Confirms the migration, the
 * version snapshots, the live-state update, and the revision ledger all wire together.
 */
describe("revision loop — DB integration", () => {
  it("persists a revision as a new version and updates current state", () => {
    const id = `test-${randomUUID()}`;
    const day = "2026-06-14";

    const original = buildBundle(goldenBrief, { id, createdAt: "2026-06-14T00:00:00.000Z" });
    saveProject(original);

    // Fresh project has no version history yet.
    expect(listVersions(id)).toHaveLength(0);
    expect(getProjectVisualClauses(id)).toEqual([]);
    expect(getRecommendedLayout(id)).toBeNull();

    // ensureInitialVersion: snapshot the original as v1.
    expect(nextVersionNumber(id)).toBe(1);
    const v1: ProjectVersion = {
      id: randomUUID(),
      projectId: id,
      versionNumber: 1,
      createdAt: original.createdAt,
      requestText: null,
      intent: null,
      changes: ["Versi awal"],
      brief: original.brief,
      feasibility: original.feasibility,
      layouts: original.layouts,
      visuals: original.visuals,
      recommendedLayout: null,
    };
    snapshotVersion(v1);

    // Apply a revision: +1 bedroom, privacy preference, a visual tweak.
    const intent: RevisionIntent = {
      understanding: "Tambah kamar, privasi, lebih cerah",
      briefPatch: {
        floors: null,
        style: null,
        bedrooms: goldenBrief.bedrooms + 1,
        bathrooms: null,
        budgetIdr: null,
        landWidthM: null,
        landDepthM: null,
        addRooms: ["garasi"],
        removeRooms: [],
        priorities: null,
      },
      layoutPreference: "privasi",
      visual: { tweak: true, clauses: ["warna lebih cerah"] },
      unsupported: [],
      needsClarification: null,
    };
    const result = applyRevision(original, intent);

    updateProjectState(id, {
      brief: result.bundle.brief,
      feasibility: result.bundle.feasibility,
      layouts: result.bundle.layouts,
      visuals: result.bundle.visuals,
      visualClauses: result.visualClauses,
      recommendedLayout: result.recommendedLayout,
    });

    const vnum = nextVersionNumber(id); // v1 exists now → 2
    expect(vnum).toBe(2);
    snapshotVersion({
      id: randomUUID(),
      projectId: id,
      versionNumber: vnum,
      createdAt: "2026-06-14T01:00:00.000Z",
      requestText: "tambah kamar, kamar utama di belakang, lebih cerah",
      intent,
      changes: result.changes,
      brief: result.bundle.brief,
      feasibility: result.bundle.feasibility,
      layouts: result.bundle.layouts,
      visuals: result.bundle.visuals,
      recommendedLayout: result.recommendedLayout,
    });

    logRevision({ id: randomUUID(), projectId: id, createdAt: "x", day, costIdr: 200 });

    // Current state reflects the revision.
    const current = getProject(id)!;
    expect(current.brief.bedrooms).toBe(goldenBrief.bedrooms + 1);
    expect(current.brief.extraRooms).toContain("garasi");
    expect(getProjectVisualClauses(id)).toEqual(["warna lebih cerah"]);
    expect(getRecommendedLayout(id)).toBe("A");

    // History has both versions, oldest first, with the original preserved.
    const versions = listVersions(id);
    expect(versions.map((v) => v.versionNumber)).toEqual([1, 2]);
    expect(versions[0].brief.bedrooms).toBe(goldenBrief.bedrooms); // v1 untouched
    expect(versions[1].brief.bedrooms).toBe(goldenBrief.bedrooms + 1);

    // Ledger counts this project's revision and the day's total.
    expect(countProjectRevisions(id)).toBe(1);
    expect(countDailyRevisions(day)).toBeGreaterThanOrEqual(1);
  });
});
