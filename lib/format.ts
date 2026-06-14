import type { Style, Priority, Orientation, BudgetVerdict, ExtraRoom } from "./schemas";

/** Rp formatting, no decimals. Used in feasibility text, the UI, and the PDF. */
export function formatIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Round to 1 decimal place (areas/metres). Keeps numbers human-readable. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export const STYLE_LABEL: Record<Style, string> = {
  minimalis: "Minimalis",
  minimalis_tropis: "Minimalis Tropis",
  industrial: "Industrial",
  modern_sederhana: "Modern Sederhana",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  hemat_biaya: "Hemat biaya",
  kamar_luas: "Kamar luas",
  ruang_keluarga: "Ruang keluarga lega",
  garasi: "Garasi",
  taman: "Taman",
  rumah_tumbuh: "Rumah tumbuh",
};

export const ORIENTATION_LABEL: Record<Orientation, string> = {
  utara: "Utara",
  timur_laut: "Timur Laut",
  timur: "Timur",
  tenggara: "Tenggara",
  selatan: "Selatan",
  barat_daya: "Barat Daya",
  barat: "Barat",
  barat_laut: "Barat Laut",
};

export const EXTRA_ROOM_LABEL: Record<ExtraRoom, string> = {
  ruang_tamu: "Ruang Tamu",
  ruang_keluarga: "Ruang Keluarga",
  ruang_makan: "Ruang Makan",
  dapur: "Dapur",
  garasi: "Garasi",
  taman: "Taman",
  mushola: "Mushola",
  gudang: "Gudang",
};

export const BUDGET_VERDICT_LABEL: Record<BudgetVerdict, string> = {
  kurang: "Kurang dari estimasi minimum",
  cukup_dasar: "Cukup untuk kualitas dasar",
  cukup: "Cukup untuk kualitas menengah",
  nyaman: "Nyaman untuk kualitas baik",
};
