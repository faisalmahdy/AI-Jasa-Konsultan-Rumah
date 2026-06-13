import { randomUUID } from "node:crypto";
import type { DesignBrief, ProjectBundle } from "./schemas";
import { computeFeasibility } from "./feasibility";
import { planLayouts } from "./layout";

/**
 * The pure thin-MVP compute pipeline — NO DB, NO AI, NO I/O:
 *
 *   brief ──► feasibility ──► 2 layouts ──► bundle
 *
 * Kept separate from pipeline.ts (which persists) so it can be unit-tested without
 * opening a database.
 */
export function buildBundle(
  brief: DesignBrief,
  opts?: { id?: string; createdAt?: string },
): ProjectBundle {
  const feasibility = computeFeasibility(brief);
  const layouts = planLayouts(brief, feasibility);
  return {
    id: opts?.id ?? randomUUID(),
    createdAt: opts?.createdAt ?? new Date().toISOString(),
    brief,
    feasibility,
    layouts,
    visuals: [],
  };
}
