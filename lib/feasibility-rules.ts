import type { RoomPurpose } from "./schemas";

/**
 * RULES ARE DATA, NOT CODE.
 *
 * An architect / civil engineer / local estimator must be able to tune these numbers
 * WITHOUT touching logic. Everything that encodes a domain assumption lives here.
 *
 * ⚠️ ALL COST NUMBERS ARE PLACEHOLDERS — VALIDATE LOCALLY before using with real clients.
 * Source the per-m² ranges and labour rates from the actual project city.
 */

/** Construction cost per m² of built area, by finish quality. Rupiah. VALIDATE LOCALLY. */
export const COST_PER_M2_IDR = {
  low: 3_500_000,
  medium: 5_000_000,
  high: 7_000_000,
} as const;

/** Extra area for halls/corridors/walls on top of the sum of room areas (+20%). */
export const CIRCULATION_FACTOR = 1.2;

/** Max ground-coverage ratio of the lot, by number of floors (setbacks + garden). */
export const MAX_FOOTPRINT_RATIO: Record<number, number> = {
  1: 0.7,
  2: 0.6,
};

/** Below this, a corridor/circulation warning fires. Metres. */
export const MIN_CORRIDOR_M = 0.9;

/**
 * Typical and minimum sizes per room purpose, derived from the design doc.
 * `typM2` drives layout weighting (how much floor a room wants).
 * `minM2` drives the "too small / doesn't fit" check.
 */
export const ROOM_SIZES: Record<RoomPurpose, { typM2: number; minM2: number }> = {
  master_bedroom: { typM2: 12, minM2: 9 }, // 3.5x3.5 .. 3x3
  bedroom: { typM2: 9, minM2: 7.5 }, // 3x3 .. 2.5x3
  bathroom: { typM2: 4, minM2: 3 }, // 2x2 .. 1.5x2
  kitchen: { typM2: 7.5, minM2: 5 }, // 2.5x3 .. 2x2.5
  living: { typM2: 10.5, minM2: 9 }, // ruang tamu
  family: { typM2: 12, minM2: 9 }, // ruang keluarga
  dining: { typM2: 7.5, minM2: 6 },
  garage: { typM2: 15, minM2: 12.5 }, // 1 mobil
  garden: { typM2: 6, minM2: 4 },
  prayer: { typM2: 3, minM2: 2.25 }, // mushola
  storage: { typM2: 3, minM2: 2.25 }, // gudang
};

/** Thresholds that gate the conditional warnings. Tunable. */
export const THRESHOLDS = {
  /** footprintNeeded / maxFootprint above this ⇒ "padat" + "sirkulasi sempit" warnings. */
  tightRatio: 0.8,
  /** number of habitable rooms above which density is plausibly a problem. */
  denseRoomCount: 5,
} as const;
