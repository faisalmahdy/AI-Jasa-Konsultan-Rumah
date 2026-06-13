import { z } from "zod";

/**
 * Single source of truth for the whole pipeline. Every module (feasibility, layout,
 * svg, pdf, db) imports types from here. Validate at the edges (the API), trust the
 * types inside.
 *
 *   form payload ──parse──► DesignBrief
 *                              │
 *                  feasibility │ layout
 *                              ▼
 *               FeasibilityReport + LayoutOption[]  ──► ProjectBundle ──► PDF
 */

// ---------------------------------------------------------------------------
// Enums (Bahasa Indonesia domain vocabulary)
// ---------------------------------------------------------------------------

export const Orientation = z.enum([
  "utara",
  "timur_laut",
  "timur",
  "tenggara",
  "selatan",
  "barat_daya",
  "barat",
  "barat_laut",
]);
export type Orientation = z.infer<typeof Orientation>;

export const Style = z.enum([
  "minimalis",
  "minimalis_tropis",
  "industrial",
  "modern_sederhana",
]);
export type Style = z.infer<typeof Style>;

export const Priority = z.enum([
  "hemat_biaya",
  "kamar_luas",
  "ruang_keluarga",
  "garasi",
  "taman",
  "rumah_tumbuh",
]);
export type Priority = z.infer<typeof Priority>;

/** Rooms the user can add on top of bedrooms + bathrooms. Dapur is always implied. */
export const ExtraRoom = z.enum([
  "ruang_tamu",
  "ruang_keluarga",
  "ruang_makan",
  "dapur",
  "garasi",
  "taman",
  "mushola",
  "gudang",
]);
export type ExtraRoom = z.infer<typeof ExtraRoom>;

export const RoomPurpose = z.enum([
  "master_bedroom",
  "bedroom",
  "bathroom",
  "kitchen",
  "living",
  "family",
  "dining",
  "garage",
  "garden",
  "prayer",
  "storage",
]);
export type RoomPurpose = z.infer<typeof RoomPurpose>;

// ---------------------------------------------------------------------------
// DesignBrief — the validated requirement object
// ---------------------------------------------------------------------------

export const DesignBrief = z.object({
  clientProfile: z.string().min(1).max(200),
  land: z.object({
    // z.coerce so a string from a form input ("10") is accepted and turned into a number.
    widthM: z.coerce.number().positive().max(100),
    depthM: z.coerce.number().positive().max(100),
    orientation: Orientation.optional(),
  }),
  budgetIdr: z.coerce.number().int().nonnegative().max(100_000_000_000),
  floors: z.coerce.number().int().min(1).max(2),
  style: Style,
  bedrooms: z.coerce.number().int().min(0).max(10),
  bathrooms: z.coerce.number().int().min(0).max(10),
  extraRooms: z.array(ExtraRoom).default([]),
  priorities: z.array(Priority).default([]),
});
export type DesignBrief = z.infer<typeof DesignBrief>;

// ---------------------------------------------------------------------------
// Geometry — Room + LayoutOption
// ---------------------------------------------------------------------------

export const Wall = z.enum(["N", "S", "E", "W"]);
export type Wall = z.infer<typeof Wall>;

export const Opening = z.object({
  wall: Wall,
  offsetM: z.number(),
  widthM: z.number(),
});
export type Opening = z.infer<typeof Opening>;

export const Room = z.object({
  name: z.string(),
  purpose: RoomPurpose,
  xM: z.number(),
  yM: z.number(),
  widthM: z.number(),
  depthM: z.number(),
  wet: z.boolean(),
  doors: z.array(Opening),
  windows: z.array(Opening),
});
export type Room = z.infer<typeof Room>;

export const LayoutOption = z.object({
  id: z.enum(["A", "B"]),
  summary: z.string(),
  footprint: z.object({ widthM: z.number(), depthM: z.number() }),
  buildAreaM2: z.number(),
  rooms: z.array(Room),
  /** false when rooms had to shrink below a usable minimum (geometry is still valid). */
  fits: z.boolean(),
  notes: z.array(z.string()),
});
export type LayoutOption = z.infer<typeof LayoutOption>;

// ---------------------------------------------------------------------------
// FeasibilityReport
// ---------------------------------------------------------------------------

export const WarningSeverity = z.enum(["warning", "tradeoff", "info"]);
export type WarningSeverity = z.infer<typeof WarningSeverity>;

export const Warning = z.object({
  code: z.string(),
  severity: WarningSeverity,
  title: z.string(),
  detail: z.string(),
});
export type Warning = z.infer<typeof Warning>;

export const BudgetVerdict = z.enum(["kurang", "cukup_dasar", "cukup", "nyaman"]);
export type BudgetVerdict = z.infer<typeof BudgetVerdict>;

export const FeasibilityReport = z.object({
  lotAreaM2: z.number(),
  netAreaM2: z.number(),
  estimatedBuildAreaM2: z.number(),
  footprintNeededM2: z.number(),
  maxFootprintM2: z.number(),
  costPerM2Used: z.object({ low: z.number(), medium: z.number(), high: z.number() }),
  estimatedCost: z.object({ lowIdr: z.number(), mediumIdr: z.number(), highIdr: z.number() }),
  budgetVerdict: BudgetVerdict,
  assumptions: z.array(z.string()),
  warnings: z.array(Warning),
});
export type FeasibilityReport = z.infer<typeof FeasibilityReport>;

// ---------------------------------------------------------------------------
// VisualVersion — defined now so the data model is stable for Visual MVP (stage 3).
// Not produced by the thin MVP.
// ---------------------------------------------------------------------------

export const VisualVersion = z.object({
  id: z.string(),
  type: z.enum(["front_elevation", "exterior_3d"]),
  prompt: z.string(),
  status: z.enum(["candidate", "accepted", "rejected"]),
  imageUrl: z.string().optional(),
  feedback: z.string().optional(),
  costIdr: z.number().optional(),
  parentId: z.string().optional(),
});
export type VisualVersion = z.infer<typeof VisualVersion>;

// ---------------------------------------------------------------------------
// ProjectBundle — what the PDF compiler and review screen consume
// ---------------------------------------------------------------------------

export const ProjectBundle = z.object({
  id: z.string(),
  createdAt: z.string(),
  brief: DesignBrief,
  feasibility: FeasibilityReport,
  layouts: z.array(LayoutOption),
  visuals: z.array(VisualVersion),
});
export type ProjectBundle = z.infer<typeof ProjectBundle>;
