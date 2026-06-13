import type { DesignBrief, RoomPurpose } from "./schemas";
import { ROOM_SIZES } from "./feasibility-rules";

/**
 * A room the brief asks for, before any geometry is assigned. Shared by feasibility
 * (to sum required area) and layout (to pack rectangles) so the two never disagree
 * about what rooms exist.
 */
export interface DerivedRoom {
  name: string;
  purpose: RoomPurpose;
  wet: boolean;
  /** target area in m², used as the packing weight. */
  typM2: number;
}

const EXTRA_ROOM_MAP: Record<string, { name: string; purpose: RoomPurpose; wet: boolean }> = {
  ruang_tamu: { name: "Ruang Tamu", purpose: "living", wet: false },
  ruang_keluarga: { name: "Ruang Keluarga", purpose: "family", wet: false },
  ruang_makan: { name: "Ruang Makan", purpose: "dining", wet: false },
  dapur: { name: "Dapur", purpose: "kitchen", wet: true },
  garasi: { name: "Garasi", purpose: "garage", wet: false },
  taman: { name: "Taman", purpose: "garden", wet: false },
  mushola: { name: "Mushola", purpose: "prayer", wet: false },
  gudang: { name: "Gudang", purpose: "storage", wet: false },
};

function mk(name: string, purpose: RoomPurpose, wet: boolean): DerivedRoom {
  return { name, purpose, wet, typM2: ROOM_SIZES[purpose].typM2 };
}

/**
 * Turn a brief into the concrete list of rooms. Deterministic and pure.
 * Dapur (kitchen) is always included even if the user forgets it — you can't build a
 * house without one, and leaving it out would silently under-count the area.
 */
export function deriveRooms(brief: DesignBrief): DerivedRoom[] {
  const rooms: DerivedRoom[] = [];

  // Bedrooms: first one is the master.
  for (let i = 0; i < brief.bedrooms; i++) {
    rooms.push(
      i === 0
        ? mk("Kamar Utama", "master_bedroom", false)
        : mk(`Kamar Tidur ${i + 1}`, "bedroom", false),
    );
  }

  // Bathrooms.
  for (let i = 0; i < brief.bathrooms; i++) {
    rooms.push(mk(`Kamar Mandi ${i + 1}`, "bathroom", true));
  }

  // Always a kitchen.
  const hasKitchen = brief.extraRooms.includes("dapur");
  if (!hasKitchen) rooms.push(mk("Dapur", "kitchen", true));

  // Extra rooms (dedup against anything already added).
  for (const extra of brief.extraRooms) {
    const def = EXTRA_ROOM_MAP[extra];
    if (!def) continue;
    rooms.push(mk(def.name, def.purpose, def.wet));
  }

  return rooms;
}

/** Sum of the typical areas of every requested room (before circulation). */
export function netAreaM2(rooms: DerivedRoom[]): number {
  return rooms.reduce((sum, r) => sum + r.typM2, 0);
}
