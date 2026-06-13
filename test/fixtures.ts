import { DesignBrief } from "../lib/schemas";

/**
 * Canonical case from the design doc (Reviewer Concern #11): a complete 3-bedroom home
 * brief on a 10×10 lot at Rp300jt. Realistic program (living + family + kitchen) makes
 * it genuinely tight — the case the feasibility rules exist to catch.
 */
export const goldenBrief = DesignBrief.parse({
  clientProfile: "Pegawai 30 tahun, first-time homebuilder",
  land: { widthM: 10, depthM: 10, orientation: "selatan" },
  budgetIdr: 300_000_000,
  floors: 1,
  style: "minimalis",
  bedrooms: 3,
  bathrooms: 2,
  extraRooms: ["ruang_tamu", "ruang_keluarga"],
  priorities: ["hemat_biaya", "kamar_luas"],
});

/** A comfortably feasible brief — should NOT over-warn. Proves the rules are real. */
export const feasibleBrief = DesignBrief.parse({
  clientProfile: "Keluarga kecil",
  land: { widthM: 12, depthM: 15 },
  budgetIdr: 450_000_000,
  floors: 1,
  style: "minimalis",
  bedrooms: 2,
  bathrooms: 1,
  extraRooms: [],
  priorities: [],
});

/** Minimal brief (no bedrooms/bathrooms) — kitchen still auto-added; must not crash. */
export const minimalBrief = DesignBrief.parse({
  clientProfile: "Studio",
  land: { widthM: 6, depthM: 6 },
  budgetIdr: 0,
  floors: 1,
  style: "modern_sederhana",
  bedrooms: 0,
  bathrooms: 0,
});

/** Impossible ask: many rooms on a tiny lot. Layout must stay valid (fits:false ok). */
export const tinyLotBrief = DesignBrief.parse({
  clientProfile: "Over-ask",
  land: { widthM: 4, depthM: 5 },
  budgetIdr: 150_000_000,
  floors: 1,
  style: "minimalis",
  bedrooms: 3,
  bathrooms: 2,
  extraRooms: ["ruang_tamu", "ruang_keluarga", "dapur", "garasi", "mushola"],
  priorities: [],
});

export const allBriefs = { goldenBrief, feasibleBrief, minimalBrief, tinyLotBrief };
