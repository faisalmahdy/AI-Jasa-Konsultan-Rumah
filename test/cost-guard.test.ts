import { describe, it, expect } from "vitest";
import { checkBudget } from "../lib/cost-guard";

// Defaults (no GIL_* env set): cost 1500, maxPerProject 6, dailyCap 100000, maxRegen 3.
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
    const d = checkBudget({ projectGenerations: 6, spentTodayIdr: 0, regenCountForView: 0 });
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
