/**
 * Static copy. Disclaimers are legally and technically important: the whole product
 * promise depends on clients NOT mistaking this for a buildable drawing.
 */

/** Shown on EVERY PDF page (fixed footer) — non-negotiable per the design doc. */
export const DISCLAIMER =
  "Konsep awal, BUKAN gambar kerja (DED) atau gambar siap bangun. Ukuran bersifat indikasi. Wajib direview arsitek / insinyur sipil / kontraktor sebelum dibangun.";

/** Shown beside any generated visual (Visual MVP, stage 3). */
export const VISUAL_MISMATCH_DISCLAIMER =
  "Gambar visual ini hanya referensi suasana/tampak. Denah dan ukuran ruang mengacu pada gambar 2D konseptual, bukan pada gambar visual ini.";

/** Questions the client should bring to a tukang/kontraktor. */
export const QUESTIONS_FOR_TUKANG = [
  "Berapa estimasi biaya bangun per meter persegi di lokasi saya saat ini?",
  "Dengan budget saya, kualitas material dan finishing seperti apa yang realistis?",
  "Apakah jumlah dan ukuran ruang ini masuk akal untuk luas tanah saya?",
  "Bagian mana dari rencana ini yang paling berisiko membengkak biayanya?",
  "Apa yang perlu disiapkan untuk struktur, pondasi, dan saluran air?",
  "Apakah perlu mengurus PBG/IMB, dan bagaimana prosesnya di daerah saya?",
];
