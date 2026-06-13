import type { DesignBrief, LayoutOption } from "./schemas";
import { STYLE_LABEL } from "./format";

export type ViewType = "front_elevation" | "exterior_3d";

export const VIEW_LABEL: Record<ViewType, string> = {
  front_elevation: "Tampak Depan",
  exterior_3d: "3D Eksterior",
};

/**
 * VisualPromptWriter (deterministic template, no LLM). Turns the brief + the chosen
 * layout into an image prompt that LOCKS the conceptual constraints:
 *   - correct floor count
 *   - the requested style, kept simple/economical
 *   - explicitly a concept rendering, NOT a technical/buildable drawing
 *   - no luxury, no oversized lot
 * These locks are what keep the generated image honest (and pass VisualReviewer).
 */
export function buildImagePrompt(
  brief: DesignBrief,
  layout: LayoutOption,
  view: ViewType,
): string {
  const floors = brief.floors === 1 ? "rumah 1 lantai" : "rumah 2 lantai";
  const style = STYLE_LABEL[brief.style].toLowerCase();
  const lot = `lahan ${brief.land.widthM} x ${brief.land.depthM} meter`;
  const footprint = `bangunan sekitar ${Math.round(layout.footprint.widthM)} x ${Math.round(layout.footprint.depthM)} meter`;

  const viewClause =
    view === "front_elevation"
      ? "Tampak depan (front elevation) lurus dari arah jalan, proporsi realistis."
      : "Pandangan 3D eksterior dari sudut depan, perspektif mata manusia.";

  return [
    `Render konsep arsitektur ${viewClause}`,
    `${floors} bergaya ${style} sederhana untuk keluarga di Indonesia.`,
    `${lot}, ${footprint}.`,
    "Material ekonomis dan umum: dinding plester cat, atap genteng/metal sederhana, jendela standar.",
    "Hindari kesan mewah, tanpa kolam renang, tanpa taman besar, tanpa material mahal.",
    "Suasana siang hari, langit cerah, pencahayaan natural.",
    "PENTING: ini gambar konsep untuk diskusi, BUKAN gambar teknik atau gambar siap bangun.",
    "Jangan menampilkan teks, dimensi, watermark, atau orang.",
  ].join(" ");
}
