import type {
  DesignBrief,
  FeasibilityReport,
  LayoutOption,
  Room,
  RoomPurpose,
  Opening,
} from "./schemas";
import { MAX_FOOTPRINT_RATIO, ROOM_SIZES } from "./feasibility-rules";
import { deriveRooms, type DerivedRoom } from "./rooms";

/**
 * Template-based parametric layout.
 *
 * Strategy (locked in eng review): NOT algorithmic free packing, NOT LLM-generated.
 * Rooms are placed into horizontal BANDS; each band is split into CELLS. Band heights
 * sum to the footprint depth and cell widths sum to the footprint width, computed with
 * a "last item takes the remainder" trick. That makes two invariants TRUE BY
 * CONSTRUCTION, for ANY input:
 *
 *   • every room is inside the footprint           (no out-of-bounds)
 *   • no two rooms overlap                          (no garbage plans)
 *
 * The packer can never produce overlapping or escaping rooms. The only failure it
 * reports is `fits: false` — rooms shrank below a comfortable minimum — and that is a
 * tradeoff message, not broken geometry.
 *
 *   footprint (W × D)
 *   ┌───────────┬───────────┐  band 1  (height ∝ band weight)
 *   │  cell A   │  cell B    │
 *   ├──────┬────┴─────┬──────┤  band 2
 *   │  C   │    D      │  E   │
 *   └──────┴──────────┴──────┘  band 3
 */

const PRIVATE: RoomPurpose[] = ["master_bedroom", "bedroom"];
const WET: RoomPurpose[] = ["bathroom", "kitchen"];

/** Group rank for ordering, per strategy. Lower rank = nearer the top (back) of the plan. */
function groupRank(purpose: RoomPurpose, strategy: "A" | "B"): number {
  const isPrivate = PRIVATE.includes(purpose);
  const isWet = WET.includes(purpose);
  if (strategy === "A") {
    // Privacy: bedrooms at the back (top), wet grouped, public at the front (bottom).
    if (isPrivate) return 0;
    if (isWet) return 1;
    return 2;
  }
  // Open: public/living at the front-top, wet grouped, bedrooms compact at the back.
  if (isPrivate) return 2;
  if (isWet) return 1;
  return 0;
}

/** Per-strategy area tilt so the two plans look meaningfully different. */
function tilt(purpose: RoomPurpose, strategy: "A" | "B"): number {
  if (strategy === "A" && PRIVATE.includes(purpose)) return 1.15; // roomier bedrooms
  if (strategy === "B" && (purpose === "living" || purpose === "family")) return 1.3; // roomier public
  return 1;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

interface Weighted extends DerivedRoom {
  weight: number;
}

function orderRooms(rooms: DerivedRoom[], strategy: "A" | "B"): Weighted[] {
  return rooms
    .map((r, i) => ({ ...r, weight: r.typM2 * tilt(r.purpose, strategy), _i: i }))
    .sort((a, b) => {
      const g = groupRank(a.purpose, strategy) - groupRank(b.purpose, strategy);
      return g !== 0 ? g : a._i - b._i; // stable within group
    });
}

/**
 * Split ordered rooms into nBands with as-even-as-possible CELL COUNTS (contiguous
 * chunks, sizes differ by at most 1). Even counts stop any single band from cramming
 * 5 rooms into one row (the label-crowding bug). Band HEIGHT still scales with the
 * band's total room area, computed later in buildLayout.
 */
function splitIntoBands(rooms: Weighted[], nBands: number): Weighted[][] {
  nBands = Math.max(1, Math.min(nBands, rooms.length));
  const base = Math.floor(rooms.length / nBands);
  const rem = rooms.length % nBands; // first `rem` bands get one extra room
  const bands: Weighted[][] = [];
  let idx = 0;
  for (let b = 0; b < nBands; b++) {
    const size = base + (b < rem ? 1 : 0);
    bands.push(rooms.slice(idx, idx + size));
    idx += size;
  }
  return bands;
}

const EPS = 1e-9;

function makeOpenings(
  xM: number,
  yM: number,
  widthM: number,
  depthM: number,
  footprintW: number,
  footprintD: number,
): { doors: Opening[]; windows: Opening[] } {
  const windows: Opening[] = [];
  // A window on each wall that lies on the footprint exterior.
  if (yM <= EPS) windows.push({ wall: "N", offsetM: widthM / 2, widthM: Math.min(1.2, widthM * 0.5) });
  if (Math.abs(yM + depthM - footprintD) <= EPS)
    windows.push({ wall: "S", offsetM: widthM / 2, widthM: Math.min(1.2, widthM * 0.5) });
  if (xM <= EPS) windows.push({ wall: "W", offsetM: depthM / 2, widthM: Math.min(1.2, depthM * 0.5) });
  if (Math.abs(xM + widthM - footprintW) <= EPS)
    windows.push({ wall: "E", offsetM: depthM / 2, widthM: Math.min(1.2, depthM * 0.5) });

  // One door, centred on the south wall (toward the front/circulation). Placeholder
  // geometry — enough to show an opening; refined in a later stage.
  const doors: Opening[] = [{ wall: "S", offsetM: widthM / 2, widthM: Math.min(0.8, widthM * 0.4) }];
  return { doors, windows };
}

function buildLayout(
  brief: DesignBrief,
  feasibility: FeasibilityReport,
  strategy: "A" | "B",
): LayoutOption {
  const derived = deriveRooms(brief);

  // Footprint: cap the needed build area at the lot's allowed ground coverage, then
  // keep the lot's aspect ratio so the plan sits sensibly on the land.
  const lotArea = feasibility.lotAreaM2;
  const ratio = MAX_FOOTPRINT_RATIO[brief.floors] ?? 0.7;
  const footprintArea = Math.min(feasibility.estimatedBuildAreaM2 / brief.floors, lotArea * ratio);
  const scale = Math.sqrt(footprintArea / lotArea);
  const footprintW = brief.land.widthM * scale;
  const footprintD = brief.land.depthM * scale;

  const ordered = orderRooms(derived, strategy);
  const nBands = clamp(Math.round(footprintD / 3.2), 2, 4);
  const bands = splitIntoBands(ordered, nBands);

  const rooms: Room[] = [];
  let fits = true;

  let yCursor = 0;
  const totalWeight = ordered.reduce((s, r) => s + r.weight, 0);
  for (let b = 0; b < bands.length; b++) {
    const band = bands[b];
    const bandWeight = band.reduce((s, r) => s + r.weight, 0);
    // Last band absorbs the remainder so heights sum EXACTLY to footprintD.
    const bandHeight =
      b === bands.length - 1 ? footprintD - yCursor : (bandWeight / totalWeight) * footprintD;

    let xCursor = 0;
    for (let c = 0; c < band.length; c++) {
      const r = band[c];
      // Last cell absorbs the remainder so widths sum EXACTLY to footprintW.
      const cellWidth =
        c === band.length - 1 ? footprintW - xCursor : (r.weight / bandWeight) * footprintW;

      const { doors, windows } = makeOpenings(
        xCursor,
        yCursor,
        cellWidth,
        bandHeight,
        footprintW,
        footprintD,
      );

      rooms.push({
        name: r.name,
        purpose: r.purpose,
        xM: xCursor,
        yM: yCursor,
        widthM: cellWidth,
        depthM: bandHeight,
        wet: r.wet,
        doors,
        windows,
      });

      if (cellWidth * bandHeight < ROOM_SIZES[r.purpose].minM2 * 0.85) fits = false;
      xCursor += cellWidth;
    }
    yCursor += bandHeight;
  }

  const summary =
    strategy === "A"
      ? "Privasi kamar lebih baik; area publik lebih kompak."
      : "Ruang keluarga/tamu lebih lega; kamar lebih kompak.";

  const notes: string[] = [];
  if (!fits) {
    notes.push(
      "Beberapa ruang menjadi lebih kecil dari ukuran nyaman. Pertimbangkan mengurangi ruang, menambah lantai, atau memperluas tanah.",
    );
  }

  return {
    id: strategy,
    summary,
    footprint: { widthM: footprintW, depthM: footprintD },
    buildAreaM2: feasibility.estimatedBuildAreaM2,
    rooms,
    fits,
    notes,
  };
}

/** Produce exactly two conceptual layout alternatives. */
export function planLayouts(brief: DesignBrief, feasibility: FeasibilityReport): LayoutOption[] {
  return [buildLayout(brief, feasibility, "A"), buildLayout(brief, feasibility, "B")];
}
