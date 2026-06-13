import type { DesignBrief, FeasibilityReport, Warning, BudgetVerdict } from "./schemas";
import {
  COST_PER_M2_IDR,
  CIRCULATION_FACTOR,
  MAX_FOOTPRINT_RATIO,
  MIN_CORRIDOR_M,
  THRESHOLDS,
} from "./feasibility-rules";
import { deriveRooms, netAreaM2 } from "./rooms";
import { formatIdr, round1 } from "./format";

/**
 * Pure: DesignBrief -> FeasibilityReport. No I/O, no LLM. Deterministic.
 *
 * Produces the 5 warning families from the design doc's acceptance criteria:
 *   1. luas bangunan terlalu besar untuk tanah
 *   2. budget di bawah estimasi minimum
 *   3. jumlah ruang terlalu padat
 *   4. area basah tersebar
 *   5. sirkulasi terlalu sempit
 * Each fires from a real threshold, not a hard-coded list.
 */
export function computeFeasibility(brief: DesignBrief): FeasibilityReport {
  const rooms = deriveRooms(brief);
  const net = netAreaM2(rooms);
  const estimatedBuildArea = round1(net * CIRCULATION_FACTOR);
  const lotArea = round1(brief.land.widthM * brief.land.depthM);
  const floors = brief.floors;
  const footprintNeeded = round1(estimatedBuildArea / floors);
  const ratio = MAX_FOOTPRINT_RATIO[floors] ?? 0.7;
  const maxFootprint = round1(lotArea * ratio);

  const estimatedCost = {
    lowIdr: Math.round(estimatedBuildArea * COST_PER_M2_IDR.low),
    mediumIdr: Math.round(estimatedBuildArea * COST_PER_M2_IDR.medium),
    highIdr: Math.round(estimatedBuildArea * COST_PER_M2_IDR.high),
  };

  const warnings: Warning[] = [];

  // 1. Building too big for the lot.
  if (footprintNeeded > maxFootprint) {
    warnings.push({
      code: "luas_bangunan_besar",
      severity: "tradeoff",
      title: "Luas bangunan terlalu besar untuk tanah",
      detail: `Kebutuhan ruang perlu sekitar ${footprintNeeded} m² di lantai dasar, sedangkan tanah hanya menyediakan sekitar ${maxFootprint} m² area bangun (sisanya untuk sempadan dan taman). Pilihan: kurangi ruang, perkecil ukuran, tambah lantai, atau cari tanah lebih luas.`,
    });
  }

  // 2. Budget. Guard divide-by-zero by checking build area first.
  if (estimatedBuildArea > 0) {
    if (brief.budgetIdr < estimatedCost.lowIdr) {
      warnings.push({
        code: "budget_kurang",
        severity: "warning",
        title: "Budget di bawah estimasi minimum",
        detail: `Estimasi biaya konstruksi termurah sekitar ${formatIdr(estimatedCost.lowIdr)} (kualitas dasar), sedangkan budget ${formatIdr(brief.budgetIdr)}. Perlu menambah budget atau mengurangi luas/ruang.`,
      });
    } else if (brief.budgetIdr < estimatedCost.mediumIdr) {
      warnings.push({
        code: "budget_dasar",
        severity: "tradeoff",
        title: "Budget cukup hanya untuk kualitas dasar",
        detail: `Budget ${formatIdr(brief.budgetIdr)} cukup untuk kualitas dasar (mulai ${formatIdr(estimatedCost.lowIdr)}), tetapi kualitas menengah perlu sekitar ${formatIdr(estimatedCost.mediumIdr)}.`,
      });
    }
  }

  // 3. Rooms too dense.
  const habitable = brief.bedrooms + brief.bathrooms + brief.extraRooms.length;
  if (
    footprintNeeded > maxFootprint * THRESHOLDS.tightRatio &&
    habitable >= THRESHOLDS.denseRoomCount
  ) {
    warnings.push({
      code: "kamar_padat",
      severity: "warning",
      title: "Jumlah ruang terlalu padat",
      detail: `${habitable} ruang dalam lahan bangun ${maxFootprint} m² membuat tiap ruang menjadi sempit. Pertimbangkan mengurangi atau menggabungkan ruang.`,
    });
  }

  // 4. Wet areas grouping (guidance whenever there is a bathroom).
  if (brief.bathrooms >= 1) {
    warnings.push({
      code: "area_basah",
      severity: "info",
      title: "Kelompokkan area basah",
      detail: `Tempatkan ${brief.bathrooms} kamar mandi berdekatan dengan dapur agar instalasi air lebih murah dan rapi. Denah berikut sudah mengelompokkan area basah.`,
    });
  }

  // 5. Circulation tight.
  if (footprintNeeded > maxFootprint * THRESHOLDS.tightRatio) {
    warnings.push({
      code: "sirkulasi_sempit",
      severity: "tradeoff",
      title: "Sirkulasi berpotensi sempit",
      detail: `Lahan padat berisiko membuat koridor di bawah ${MIN_CORRIDOR_M} m. Prioritaskan sirkulasi yang nyaman atau kurangi ruang.`,
    });
  }

  const budgetVerdict: BudgetVerdict =
    brief.budgetIdr >= estimatedCost.highIdr
      ? "nyaman"
      : brief.budgetIdr >= estimatedCost.mediumIdr
        ? "cukup"
        : brief.budgetIdr >= estimatedCost.lowIdr
          ? "cukup_dasar"
          : "kurang";

  const assumptions = [
    `Biaya per m²: dasar ${formatIdr(COST_PER_M2_IDR.low)}, menengah ${formatIdr(COST_PER_M2_IDR.medium)}, baik ${formatIdr(COST_PER_M2_IDR.high)} (asumsi awal, WAJIB divalidasi lokal).`,
    `Budget ${formatIdr(brief.budgetIdr)} dianggap biaya konstruksi dasar — belum termasuk harga tanah, jasa desain, perizinan (PBG/IMB), dan furnitur.`,
    `Sirkulasi diasumsikan +${Math.round((CIRCULATION_FACTOR - 1) * 100)}% dari luas ruang bersih.`,
    `Rumah ${floors} lantai; area bangun maksimum ${Math.round(ratio * 100)}% dari luas tanah.`,
  ];

  return {
    lotAreaM2: lotArea,
    netAreaM2: round1(net),
    estimatedBuildAreaM2: estimatedBuildArea,
    footprintNeededM2: footprintNeeded,
    maxFootprintM2: maxFootprint,
    costPerM2Used: { ...COST_PER_M2_IDR },
    estimatedCost,
    budgetVerdict,
    assumptions,
    warnings,
  };
}
