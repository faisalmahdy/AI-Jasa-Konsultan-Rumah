import { describe, it, expect } from "vitest";
import { computeFeasibility } from "../lib/feasibility";
import { DesignBrief } from "../lib/schemas";
import { goldenBrief, feasibleBrief, minimalBrief } from "./fixtures";

describe("computeFeasibility", () => {
  it("golden case: complete 3BR/2BA home on 10x10 @300jt yields >=5 warnings, all 5 families", () => {
    const r = computeFeasibility(goldenBrief);
    expect(r.warnings.length).toBeGreaterThanOrEqual(5);
    const codes = r.warnings.map((w) => w.code);
    for (const code of [
      "luas_bangunan_besar",
      "budget_dasar",
      "kamar_padat",
      "area_basah",
      "sirkulasi_sempit",
    ]) {
      expect(codes).toContain(code);
    }
    expect(r.budgetVerdict).toBe("cukup_dasar");
    expect(r.estimatedBuildAreaM2).toBeGreaterThan(0);
    expect(r.assumptions.length).toBeGreaterThanOrEqual(4);
  });

  it("feasible case does NOT over-warn (rules are real, not always-on)", () => {
    const r = computeFeasibility(feasibleBrief);
    // 2BR/1BA on 180 m² lot at 450jt is comfortable: no over-size, no budget warning.
    expect(r.warnings.map((w) => w.code)).not.toContain("luas_bangunan_besar");
    expect(r.warnings.map((w) => w.code)).not.toContain("budget_kurang");
    expect(["cukup", "nyaman", "cukup_dasar"]).toContain(r.budgetVerdict);
  });

  it("budget = 0 fires 'budget di bawah minimum', never divides by zero", () => {
    const r = computeFeasibility(minimalBrief);
    expect(() => r).not.toThrow();
    expect(r.warnings.map((w) => w.code)).toContain("budget_kurang");
    expect(Number.isFinite(r.estimatedBuildAreaM2)).toBe(true);
    expect(r.estimatedBuildAreaM2).toBeGreaterThan(0); // kitchen always counted
  });

  it("cost estimate is monotonic: low < medium < high", () => {
    const r = computeFeasibility(goldenBrief);
    expect(r.estimatedCost.lowIdr).toBeLessThan(r.estimatedCost.mediumIdr);
    expect(r.estimatedCost.mediumIdr).toBeLessThan(r.estimatedCost.highIdr);
  });
});

describe("DesignBrief validation (edge guard at the boundary)", () => {
  it("rejects a zero-area lot", () => {
    const res = DesignBrief.safeParse({
      clientProfile: "x",
      land: { widthM: 0, depthM: 10 },
      budgetIdr: 100_000_000,
      floors: 1,
      style: "minimalis",
      bedrooms: 2,
      bathrooms: 1,
    });
    expect(res.success).toBe(false);
  });

  it("coerces numeric strings from a form payload", () => {
    const res = DesignBrief.safeParse({
      clientProfile: "x",
      land: { widthM: "10", depthM: "12" },
      budgetIdr: "300000000",
      floors: "1",
      style: "minimalis",
      bedrooms: "3",
      bathrooms: "2",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.land.widthM).toBe(10);
  });
});
