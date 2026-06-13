import type { LayoutOption } from "./schemas";
import { buildPlanDrawing, PLAN_COLORS, PLAN_PADDING } from "./plan-render";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Render a layout to a standalone SVG string for the web review screen.
 * Same geometry as the PDF (via buildPlanDrawing) so web and PDF match.
 */
export function renderPlanSvg(layout: LayoutOption, scalePxPerM = 36): string {
  const d = buildPlanDrawing(layout, scalePxPerM);
  const W = d.width + PLAN_PADDING * 2;
  const H = d.height + PLAN_PADDING * 2;
  const p = PLAN_PADDING;

  const rects = d.rects
    .map(
      (r) =>
        `<rect x="${(r.x + p).toFixed(2)}" y="${(r.y + p).toFixed(2)}" width="${r.w.toFixed(2)}" height="${r.h.toFixed(2)}" fill="${r.wet ? PLAN_COLORS.wet : PLAN_COLORS.dry}" stroke="${PLAN_COLORS.stroke}" stroke-width="1" />`,
    )
    .join("");

  const lines = d.lines
    .map(
      (l) =>
        `<line x1="${(l.x1 + p).toFixed(2)}" y1="${(l.y1 + p).toFixed(2)}" x2="${(l.x2 + p).toFixed(2)}" y2="${(l.y2 + p).toFixed(2)}" stroke="${PLAN_COLORS.opening}" stroke-width="${l.width}" stroke-linecap="round" />`,
    )
    .join("");

  const labels = d.labels
    .map(
      (t) =>
        `<text x="${(t.x + p).toFixed(2)}" y="${(t.y + p).toFixed(2)}" font-size="${t.size.toFixed(1)}" font-family="Helvetica, Arial, sans-serif" font-weight="${t.bold ? 700 : 400}" fill="${t.bold ? PLAN_COLORS.text : PLAN_COLORS.dim}" text-anchor="middle">${esc(t.text)}</text>`,
    )
    .join("");

  const border = `<rect x="${p}" y="${p}" width="${d.width.toFixed(2)}" height="${d.height.toFixed(2)}" fill="none" stroke="${PLAN_COLORS.border}" stroke-width="2" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}" width="100%" role="img" aria-label="Denah ${layout.id}">${rects}${border}${lines}${labels}</svg>`;
}
