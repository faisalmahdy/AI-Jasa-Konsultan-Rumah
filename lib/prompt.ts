import type { DesignBrief, LayoutOption, Room, RoomPurpose } from "./schemas";
import { STYLE_LABEL } from "./format";

/**
 * VisualPromptWriter (deterministic template, no LLM). Turns the brief + the chosen
 * layout into an image prompt PER VIEW. The whole point of Stage 4's visual set is that
 * the 3D is built from the REAL structured layout we already computed — footprint, floor
 * count, where the carport/garage is, and (for the furnished plan) each room's position,
 * size, and purpose. That grounds every render in the actual denah instead of a guess.
 *
 * Six views, generated on demand:
 *   - exterior_3d     : the hero — 3/4 aerial, wide, helicopter/drone shot from front-right
 *   - front_elevation : tampak depan
 *   - tampak_samping  : tampak samping (profil)
 *   - tampak_belakang : tampak belakang
 *   - tampak_atas     : tampak atas / atap (bird-eye, straight down)
 *   - denah_interior  : furnished top-down floor plan (walls + furniture per room)
 *
 * Every prompt keeps the same honesty LOCKS (economical materials, not luxury, concept
 * not technical drawing, no text/people) and appends any revision tweaks (extraClauses).
 */

export type ViewType =
  | "exterior_3d"
  | "front_elevation"
  | "tampak_samping"
  | "tampak_belakang"
  | "tampak_atas"
  | "denah_interior";

export const VIEW_LABEL: Record<ViewType, string> = {
  exterior_3d: "3D Aerial 3/4 (Helicopter)",
  front_elevation: "Tampak Depan (3D)",
  tampak_samping: "Tampak Samping (3D)",
  tampak_belakang: "Tampak Belakang (3D)",
  tampak_atas: "Tampak Atas / Atap",
  denah_interior: "Denah Interior Berperabot",
};

/** Display + generation order (hero first, furnished plan last). */
export const VIEW_ORDER: ViewType[] = [
  "exterior_3d",
  "front_elevation",
  "tampak_samping",
  "tampak_belakang",
  "tampak_atas",
  "denah_interior",
];

const FURNITURE: Record<RoomPurpose, string> = {
  master_bedroom: "tempat tidur besar dan lemari",
  bedroom: "tempat tidur dan lemari",
  bathroom: "kloset, shower, dan wastafel",
  kitchen: "kitchen set, kompor, dan wastafel",
  living: "set sofa tamu dan meja",
  family: "sofa keluarga dan rak TV",
  dining: "meja makan dan kursi",
  garage: "mobil (carport)",
  garden: "tanaman dan rumput",
  prayer: "sajadah dan rak",
  storage: "rak penyimpanan",
};

const EPS = 0.01;

/** Position of a room within the footprint, in plain Indonesian (back = top, front = bottom). */
function roomPosition(room: Room, layout: LayoutOption): string {
  const fw = layout.footprint.widthM;
  const fd = layout.footprint.depthM;
  const cx = (room.xM + room.widthM / 2) / Math.max(fw, EPS);
  const cy = (room.yM + room.depthM / 2) / Math.max(fd, EPS);
  const horiz = cx < 0.34 ? "kiri" : cx > 0.66 ? "kanan" : "tengah";
  // y grows toward the front (street) in the layout packer.
  const vert = cy < 0.34 ? "belakang" : cy > 0.66 ? "depan" : "tengah";
  if (horiz === "tengah" && vert === "tengah") return "bagian tengah";
  if (horiz === "tengah") return vert;
  if (vert === "tengah") return horiz;
  return `${vert}-${horiz}`;
}

/** One clause per room: "Kamar Utama di belakang-kiri (~3×3 m) dengan tempat tidur besar dan lemari". */
function describeRooms(layout: LayoutOption): string {
  return layout.rooms
    .map((r) => {
      const w = Math.round(r.widthM);
      const d = Math.round(r.depthM);
      return `${r.name} di ${roomPosition(r, layout)} (~${w}×${d} m) dengan ${FURNITURE[r.purpose]}`;
    })
    .join("; ");
}

const SHARED_LOCKS = [
  "Material ekonomis dan umum: dinding plester cat, atap genteng/metal sederhana, jendela standar.",
  "Hindari kesan mewah, tanpa kolam renang, tanpa taman besar, tanpa material mahal.",
];

const HONESTY_END = [
  "PENTING: ini gambar konsep untuk diskusi, BUKAN gambar teknik atau gambar siap bangun.",
  "Jangan menampilkan teks, angka dimensi, watermark, atau orang.",
];

/** Camera/framing clause per exterior view. */
const CAMERA: Record<Exclude<ViewType, "denah_interior">, string> = {
  exterior_3d:
    "Pemandangan 3D eksterior dari udara, sudut 3/4 dari arah DEPAN-KANAN atas, kamera tinggi seperti foto drone/helikopter melihat ke bawah sekitar 35 derajat, komposisi LEBAR (wide). Terlihat atap, fasad depan dan sisi kanan, halaman depan, pagar, dan akses jalan; rumah berada di tengah komposisi.",
  front_elevation:
    "Tampak depan (front view) dengan sedikit kedalaman 3D, dilihat lurus dari arah jalan setinggi mata, proporsi realistis.",
  tampak_samping:
    "Tampak samping (side view) bangunan, profil dari samping yang memperlihatkan kemiringan atap, dinding samping, dan kedalaman rumah.",
  tampak_belakang:
    "Tampak belakang (rear view) bangunan, dilihat dari sisi belakang rumah, memperlihatkan area servis/belakang.",
  tampak_atas:
    "Tampak atas (top-down / bird-eye) lurus dari atas, memperlihatkan bentuk dan susunan atap, footprint bangunan, halaman, dan tata letak di atas tanah.",
};

export function buildImagePrompt(
  brief: DesignBrief,
  layout: LayoutOption,
  view: ViewType,
  /** Stage 4: extra descriptive clauses from a visual revision (e.g. "warna lebih cerah"). */
  extraClauses: string[] = [],
): string {
  const floors = brief.floors === 1 ? "rumah 1 lantai" : "rumah 2 lantai";
  const style = STYLE_LABEL[brief.style].toLowerCase();
  const lot = `lahan ${brief.land.widthM} x ${brief.land.depthM} meter`;
  const fw = Math.round(layout.footprint.widthM);
  const fd = Math.round(layout.footprint.depthM);
  const hasGarage = layout.rooms.some((r) => r.purpose === "garage");

  const tweaks = extraClauses.map((c) => c.trim()).filter(Boolean);
  const tweakClause = tweaks.length ? [`Penyesuaian dari klien: ${tweaks.join(", ")}.`] : [];

  if (view === "denah_interior") {
    // Furnished top-down floor plan, built room-by-room from the real layout.
    const clauses = [
      "Ilustrasi denah lantai (floor plan) tampak ATAS / top-down, perspektif lurus dari atas.",
      "Dinding terlihat tebal dan jelas, lantai terlihat, setiap ruangan diberi perabot sesuai fungsi (denah berperabot).",
      `${floors} bergaya ${style} sederhana, footprint bangunan sekitar ${fw} x ${fd} meter.`,
      `Tata letak ruang (belakang = atas gambar, depan = bawah dekat jalan): ${describeRooms(layout)}.`,
      "Gaya ilustrasi arsitektur top-down berwarna, rapi, realistis, proporsi mengikuti ukuran ruang.",
      ...tweakClause,
      ...HONESTY_END,
    ];
    return clauses.join(" ");
  }

  const clauses = [
    `Render konsep arsitektur 3D. ${CAMERA[view]}`,
    `${floors} bergaya ${style} sederhana untuk keluarga di Indonesia.`,
    `${lot}, bangunan menempati sekitar ${fw} x ${fd} meter.`,
    hasGarage
      ? "Sertakan carport/garasi terbuka di sisi depan sesuai denah."
      : "Tanpa garasi/carport.",
    ...SHARED_LOCKS,
    "Suasana siang hari, langit cerah, pencahayaan natural.",
    ...tweakClause,
    ...HONESTY_END,
  ];
  return clauses.join(" ");
}
