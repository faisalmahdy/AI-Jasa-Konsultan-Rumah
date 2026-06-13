/**
 * Spend control — the #1 eng-review concern. An unauthenticated endpoint that fires a
 * paid image call is a money faucet. Every cap is enforced HERE, server-side, BEFORE
 * any call to OpenAI.
 *
 * `checkBudget` is a PURE function: the route reads the ledger from the DB and passes
 * the numbers in, so the policy is unit-testable without a database or network.
 */

function numEnv(key: string, fallback: number): number {
  const v = process.env[key];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function costConfig() {
  return {
    /** Estimated IDR cost per image. PLACEHOLDER — validate against real OpenAI pricing. */
    imageCostIdr: numEnv("GIL_IMAGE_COST_IDR", 1500),
    /** Max images per project (e.g. 2 views × 3 regen). */
    maxPerProject: numEnv("GIL_MAX_IMAGES_PER_PROJECT", 6),
    /** Hard daily spend ceiling across ALL projects. The real backstop against abuse. */
    dailyCapIdr: numEnv("GIL_DAILY_SPEND_CAP_IDR", 100_000),
    /** Max regenerations per view type (front elevation / 3D). */
    maxRegenPerView: numEnv("GIL_MAX_REGEN_PER_VIEW", 3),
  };
}

export interface BudgetInput {
  projectGenerations: number;
  spentTodayIdr: number;
  regenCountForView: number;
}

export interface BudgetDecision {
  allowed: boolean;
  reason?: string;
  estimatedCostIdr: number;
}

export function checkBudget(input: BudgetInput): BudgetDecision {
  const cfg = costConfig();
  const est = cfg.imageCostIdr;

  if (input.regenCountForView >= cfg.maxRegenPerView) {
    return {
      allowed: false,
      estimatedCostIdr: est,
      reason: `Batas regenerate untuk visual ini tercapai (maksimal ${cfg.maxRegenPerView}x).`,
    };
  }
  if (input.projectGenerations >= cfg.maxPerProject) {
    return {
      allowed: false,
      estimatedCostIdr: est,
      reason: `Batas jumlah gambar per proyek tercapai (maksimal ${cfg.maxPerProject}).`,
    };
  }
  if (input.spentTodayIdr + est > cfg.dailyCapIdr) {
    return {
      allowed: false,
      estimatedCostIdr: est,
      reason: "Batas biaya gambar harian tercapai. Coba lagi besok atau naikkan batas.",
    };
  }
  return { allowed: true, estimatedCostIdr: est };
}
