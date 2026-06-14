import {
  DesignBrief,
  type ProjectBundle,
  type RevisionIntent,
  type ExtraRoom,
} from "./schemas";
import { buildBundle } from "./bundle";
import { STYLE_LABEL, PRIORITY_LABEL, EXTRA_ROOM_LABEL, formatIdr } from "./format";

/**
 * RevisionApplier — the deterministic half of Stage 4. PURE: no DB, no AI, no I/O.
 *
 *   currentBundle + RevisionIntent ──► newBundle + human-readable change list
 *
 * The LLM only produced the intent (lib/revision-parser.ts). THIS module is what
 * actually mutates the brief and re-runs the same deterministic feasibility + layout
 * pipeline the thin MVP uses (`buildBundle`). That keeps every invariant the eng review
 * locked in: geometry stays template-based, output stays reproducible and unit-testable,
 * and the model can never produce a broken plan because it never produces a plan at all.
 *
 * Visuals are carried forward untouched (regenerating an image costs money and must stay
 * behind the cost-guarded /visual endpoint). The visual tweak is returned as extra prompt
 * clauses for the NEXT guarded regeneration, not applied here.
 */

export interface RevisionResult {
  bundle: ProjectBundle;
  /** What changed vs the previous version, in plain Indonesian. */
  changes: string[];
  /** Extra descriptive clauses for the image prompt on the next regeneration. */
  visualClauses: string[];
  /** Which layout the revision suggests highlighting, if any. */
  recommendedLayout: "A" | "B" | null;
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function applyRevision(bundle: ProjectBundle, intent: RevisionIntent): RevisionResult {
  const p = intent.briefPatch;
  const prev = bundle.brief;
  const changes: string[] = [];

  // Start from the current brief and apply each non-null patch, recording a change line.
  const next: DesignBrief = {
    ...prev,
    land: { ...prev.land },
    extraRooms: [...prev.extraRooms],
    priorities: [...prev.priorities],
  };

  if (p.floors !== null && p.floors !== prev.floors) {
    changes.push(`Lantai: ${prev.floors} → ${p.floors}`);
    next.floors = p.floors;
  }
  if (p.style !== null && p.style !== prev.style) {
    changes.push(`Gaya: ${STYLE_LABEL[prev.style]} → ${STYLE_LABEL[p.style]}`);
    next.style = p.style;
  }
  if (p.bedrooms !== null && p.bedrooms !== prev.bedrooms) {
    changes.push(`Kamar tidur: ${prev.bedrooms} → ${p.bedrooms}`);
    next.bedrooms = p.bedrooms;
  }
  if (p.bathrooms !== null && p.bathrooms !== prev.bathrooms) {
    changes.push(`Kamar mandi: ${prev.bathrooms} → ${p.bathrooms}`);
    next.bathrooms = p.bathrooms;
  }
  if (p.budgetIdr !== null && p.budgetIdr !== prev.budgetIdr) {
    changes.push(`Budget: ${formatIdr(prev.budgetIdr)} → ${formatIdr(p.budgetIdr)}`);
    next.budgetIdr = p.budgetIdr;
  }
  if (p.landWidthM !== null && p.landWidthM !== prev.land.widthM) {
    changes.push(`Lebar tanah: ${prev.land.widthM} → ${p.landWidthM} m`);
    next.land.widthM = p.landWidthM;
  }
  if (p.landDepthM !== null && p.landDepthM !== prev.land.depthM) {
    changes.push(`Panjang tanah: ${prev.land.depthM} → ${p.landDepthM} m`);
    next.land.depthM = p.landDepthM;
  }

  // Rooms: remove first, then add — and only count a real change.
  const removed: ExtraRoom[] = [];
  if (p.removeRooms.length) {
    for (const r of p.removeRooms) {
      if (next.extraRooms.includes(r)) {
        next.extraRooms = next.extraRooms.filter((x) => x !== r);
        removed.push(r);
      }
    }
  }
  const added: ExtraRoom[] = [];
  for (const r of dedupe(p.addRooms)) {
    if (!next.extraRooms.includes(r)) {
      next.extraRooms.push(r);
      added.push(r);
    }
  }
  if (added.length) changes.push(`Tambah ruang: ${added.map((r) => EXTRA_ROOM_LABEL[r]).join(", ")}`);
  if (removed.length)
    changes.push(`Hapus ruang: ${removed.map((r) => EXTRA_ROOM_LABEL[r]).join(", ")}`);

  if (p.priorities !== null) {
    const before = prev.priorities.join(",");
    const after = dedupe(p.priorities).join(",");
    if (before !== after) {
      const label = after ? p.priorities.map((x) => PRIORITY_LABEL[x]).join(", ") : "(tidak ada)";
      changes.push(`Prioritas: ${label}`);
      next.priorities = dedupe(p.priorities);
    }
  }

  const recommendedLayout =
    intent.layoutPreference === "privasi"
      ? "A"
      : intent.layoutPreference === "terbuka"
        ? "B"
        : null;
  if (recommendedLayout) {
    changes.push(
      recommendedLayout === "A"
        ? "Tata letak: utamakan privasi kamar (Denah A) — kamar di belakang."
        : "Tata letak: utamakan ruang publik lega (Denah B).",
    );
  }

  const visualClauses = intent.visual.tweak ? intent.visual.clauses.filter((c) => c.trim()) : [];
  if (visualClauses.length) {
    changes.push(`Visual: ${visualClauses.join(", ")} (berlaku saat gambar dibuat ulang).`);
  }

  // Re-validate, then re-run the SAME deterministic pipeline. Preserve identity/time.
  const validated = DesignBrief.parse(next);
  const rebuilt = buildBundle(validated, { id: bundle.id, createdAt: bundle.createdAt });
  // Carry visuals forward untouched — image regeneration stays behind the cost guard.
  rebuilt.visuals = bundle.visuals;

  return { bundle: rebuilt, changes, visualClauses, recommendedLayout };
}
