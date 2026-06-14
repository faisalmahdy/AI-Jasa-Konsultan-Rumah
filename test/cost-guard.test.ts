import { describe, it, expect } from "vitest";
import { checkBudget, checkRevisionBudget } from "../lib/cost-guard";

// Defaults (no GIL_* env set): cost 1500, maxPerProject 18, dailyCap 100000, maxRegen 3.
describe("checkBudget (spend guardrails)", () => {
  it("allows when under every cap", () => {
    const d = checkBudget({ projectGenerations: 0, spentTodayIdr: 0, regenCountForView: 0 });
    expect(d.allowed).toBe(true);
    expect(d.estimatedCostIdr).toBeGreaterThan(0);
  });

  it("blocks at the per-view regenerate cap", () => {
    const d = checkBudget({ projectGenerations: 1, spentTodayIdr: 0, regenCountForView: 3 });
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/regenerate/i);
  });

  it("blocks at the per-project image cap", () => {
    const d = checkBudget({ projectGenerations: 18, spentTodayIdr: 0, regenCountForView: 0 });
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/proyek/i);
  });

  it("blocks when the daily spend cap would be exceeded (money backstop)", () => {
    // 99,500 + 1,500 = 101,000 > 100,000
    const d = checkBudget({ projectGenerations: 0, spentTodayIdr: 99_500, regenCountForView: 0 });
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/harian/i);
  });

  it("allows exactly at the daily boundary (not over)", () => {
    // 98,500 + 1,500 = 100,000, not > 100,000
    const d = checkBudget({ projectGenerations: 0, spentTodayIdr: 98_500, regenCountForView: 0 });
    expect(d.allowed).toBe(true);
  });
});

// Defaults: revisionCost 200, maxRevisionsPerProject 15, dailyRevisionCap 500.
describe("checkRevisionBudget (LLM spend guardrails)", () => {
  it("allows when under every cap", () => {
    const d = checkRevisionBudget({ projectRevisions: 0, revisionsToday: 0 });
    expect(d.allowed).toBe(true);
    expect(d.estimatedCostIdr).toBeGreaterThan(0);
  });

  it("blocks at the per-project revision cap", () => {
    const d = checkRevisionBudget({ projectRevisions: 15, revisionsToday: 0 });
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/proyek/i);
  });

  it("blocks at the daily revision cap (abuse backstop)", () => {
    const d = checkRevisionBudget({ projectRevisions: 0, revisionsToday: 500 });
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/harian/i);
  });
});
