import type { LayoutOption, Room, Opening, RoomPurpose } from "./schemas";
import { round1 } from "./format";

const SHORT_LABEL: Record<RoomPurpose, string> = {
  master_bedroom: "KU",
  bedroom: "KT",
  bathroom: "KM",
  kitchen: "Dapur",
  living: "R.Tamu",
  family: "R.Klg",
  dining: "R.Makan",
  garage: "Garasi",
  garden: "Taman",
  prayer: "Mushola",
  storage: "Gudang",
};

/** Compact label for narrow cells, e.g. "Kamar Mandi 2" -> "KM 2". */
function shortLabel(room: Room): string {
  const num = room.name.match(/\d+/)?.[0] ?? "";
  const base = SHORT_LABEL[room.purpose];
  return num ? `${base} ${num}` : base;
}

/**
 * Renderer-neutral drawing model. The layout geometry is turned into plain shapes
 * (rects, labels, lines) ONCE here, then drawn by two backends: an SVG string for the
 * web review screen, and @react-pdf primitives for the PDF. Shared so the two can never
 * disagree about where a room or a label sits.
 */

export interface DrawRect {
  x: number;
  y: number;
  w: number;
  h: number;
  wet: boolean;
}
export interface DrawLabel {
  x: number;
  y: number;
  text: string;
  size: number;
  bold: boolean;
}
export interface DrawLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}
export interface PlanDrawing {
  width: number;
  height: number;
  rects: DrawRect[];
  labels: DrawLabel[];
  lines: DrawLine[];
}

// Griya floor-plan palette (--plan-* tokens). Literal hex so the PDF backend, which
// can't read CSS vars, matches the web SVG exactly. Warm paper rooms, blueprint-blue
// wet areas, charcoal walls, blueprint openings.
export const PLAN_COLORS = {
  stroke: "#3A332A", // --plan-wall
  wet: "#DCE8F8", // --plan-wet (blueprint tint)
  dry: "#FBF7F1", // --plan-dry (warm paper)
  text: "#221E18", // --plan-label
  dim: "#6B5F4D", // --plan-dim
  opening: "#5181CE", // --plan-opening (blueprint-400)
  border: "#2A241D", // --plan-border
} as const;

export const PLAN_PADDING = 16;

function openingLine(room: Room, op: Opening, scale: number, lineWidth: number): DrawLine {
  const x = room.xM * scale;
  const y = room.yM * scale;
  const w = room.widthM * scale;
  const h = room.depthM * scale;
  const ow = op.widthM * scale;
  const off = op.offsetM * scale;
  switch (op.wall) {
    case "N":
      return { x1: x + off - ow / 2, y1: y, x2: x + off + ow / 2, y2: y, width: lineWidth };
    case "S":
      return { x1: x + off - ow / 2, y1: y + h, x2: x + off + ow / 2, y2: y + h, width: lineWidth };
    case "W":
      return { x1: x, y1: y + off - ow / 2, x2: x, y2: y + off + ow / 2, width: lineWidth };
    case "E":
      return { x1: x + w, y1: y + off - ow / 2, x2: x + w, y2: y + off + ow / 2, width: lineWidth };
  }
}

/** scale = drawing units (px for SVG, pt for PDF) per metre. */
export function buildPlanDrawing(layout: LayoutOption, scale: number): PlanDrawing {
  const width = layout.footprint.widthM * scale;
  const height = layout.footprint.depthM * scale;
  const rects: DrawRect[] = [];
  const labels: DrawLabel[] = [];
  const lines: DrawLine[] = [];

  for (const room of layout.rooms) {
    const x = room.xM * scale;
    const y = room.yM * scale;
    const w = room.widthM * scale;
    const h = room.depthM * scale;
    rects.push({ x, y, w, h, wet: room.wet });

    const cx = x + w / 2;
    const cy = y + h / 2;
    const nameSize = Math.max(6, Math.min(11, w / 8));
    // Rough text width; abbreviate when the full name would overflow the cell so
    // adjacent labels never collide (the crowding bug from the first build).
    const fits = (txt: string, sz: number) => txt.length * sz * 0.55 <= w - 4;
    const nameText = fits(room.name, nameSize) ? room.name : shortLabel(room);
    const drawDim = w >= 46 && h >= 26;
    if (w > 16 && h > 12 && fits(nameText, nameSize)) {
      labels.push({
        x: cx,
        y: drawDim ? cy - 3 : cy + nameSize * 0.35,
        text: nameText,
        size: nameSize,
        bold: true,
      });
    }
    if (drawDim) {
      labels.push({
        x: cx,
        y: cy + 9,
        text: `${round1(room.widthM)} × ${round1(room.depthM)} m`,
        size: Math.max(5, Math.min(9, w / 10)),
        bold: false,
      });
    }

    for (const d of room.doors) lines.push(openingLine(room, d, scale, 1.5));
    for (const wd of room.windows) lines.push(openingLine(room, wd, scale, 3));
  }

  return { width, height, rects, labels, lines };
}
