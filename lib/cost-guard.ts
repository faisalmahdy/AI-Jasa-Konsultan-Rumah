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
    /** Max images per project (6 view types × up to 3 regen each). */
    maxPerProject: numEnv("GIL_MAX_IMAGES_PER_PROJECT", 18),
    /** Hard daily spend ceiling across ALL projects. The real backstop against abuse. */
    dailyCapIdr: numEnv("GIL_DAILY_SPEND_CAP_IDR", 100_000),
    /** Max regenerations per view type (front elevation / 3D). */
    maxRegenPerView: numEnv("GIL_MAX_REGEN_PER_VIEW", 3),
    /** Estimated IDR cost per NL revision (one Claude Haiku call). PLACEHOLDER. */
    revisionCostIdr: numEnv("GIL_REVISION_COST_IDR", 200),
    /** Max NL revisions per project. */
    maxRevisionsPerProject: numEnv("GIL_MAX_REVISIONS_PER_PROJECT", 15),
    /** Hard daily cap on revision calls across ALL projects — backstop against abuse. */
    dailyRevisionCap: numEnv("GIL_DAILY_REVISION_CAP", 500),
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

/**
 * Revision spend control (Stage 4). The /revise endpoint fires a paid LLM call, so it
 * carries the SAME cost-DoS risk as image generation and gets the same treatment: per-
 * project + global daily caps, enforced HERE before any call to Anthropic. Pure for the
 * same reason — the route reads the ledger counts from the DB and passes them in.
 */
export interface RevisionBudgetInput {
  projectRevisions: number;
  revisionsToday: number;
}

export function checkRevisionBudget(input: RevisionBudgetInput): BudgetDecision {
  const cfg = costConfig();
  const est = cfg.revisionCostIdr;

  if (input.projectRevisions >= cfg.maxRevisionsPerProject) {
    return {
      allowed: false,
      estimatedCostIdr: est,
      reason: `Batas jumlah revisi per proyek tercapai (maksimal ${cfg.maxRevisionsPerProject}).`,
    };
  }
  if (input.revisionsToday >= cfg.dailyRevisionCap) {
    return {
      allowed: false,
      estimatedCostIdr: est,
      reason: "Batas jumlah revisi harian tercapai. Coba lagi besok atau naikkan batas.",
    };
  }
  return { allowed: true, estimatedCostIdr: est };
}
