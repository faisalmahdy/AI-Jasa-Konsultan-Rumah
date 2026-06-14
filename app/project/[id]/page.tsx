import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Ruler, LayoutGrid, MessagesSquare, PencilRuler, Box } from "lucide-react";
import { getProject } from "@/lib/pipeline";
import { getRecommendedLayout } from "@/lib/db";
import { renderPlanSvg } from "@/lib/svg";
import {
  formatIdr,
  round1,
  STYLE_LABEL,
  PRIORITY_LABEL,
  ORIENTATION_LABEL,
  BUDGET_VERDICT_LABEL,
} from "@/lib/format";
import { QUESTIONS_FOR_TUKANG, DISCLAIMER } from "@/lib/content";
import type { BudgetVerdict, LayoutOption } from "@/lib/schemas";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { SectionHeading } from "@/components/ui/SectionHeading";
import VisualPanel from "./VisualPanel";
import RevisionSection from "./RevisionSection";

export const runtime = "nodejs";

const VERDICT: Record<BudgetVerdict, { badge: BadgeTone; card: "forest" | "paper" }> = {
  kurang: { badge: "danger", card: "paper" },
  cukup_dasar: { badge: "caution", card: "paper" },
  cukup: { badge: "forest", card: "forest" },
  nyaman: { badge: "forest", card: "forest" },
};

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = getProject(id);
  if (!bundle) notFound();

  const { brief, feasibility, layouts } = bundle;
  const recommendedLayout = getRecommendedLayout(id);
  const verdict = VERDICT[feasibility.budgetVerdict];
  const overFootprint = feasibility.footprintNeededM2 > feasibility.maxFootprintM2;

  const stats: { label: string; value: number; unit: string; tone: "default" | "caution" }[] = [
    { label: "Luas tanah", value: feasibility.lotAreaM2, unit: "m²", tone: "default" },
    { label: "Est. bangunan", value: feasibility.estimatedBuildAreaM2, unit: "m²", tone: "default" },
    { label: "Footprint perlu", value: feasibility.footprintNeededM2, unit: "m²", tone: overFootprint ? "caution" : "default" },
    { label: "Maks. area bangun", value: feasibility.maxFootprintM2, unit: "m²", tone: "default" },
  ];

  return (
    <main style={{ maxWidth: 832, margin: "0 auto", padding: "var(--space-8) clamp(20px,5vw,32px) var(--space-10)" }}>
      {/* Title bar */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: "var(--space-7)", flexWrap: "wrap" }}>
        <div>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textDecoration: "none", marginBottom: 10 }}>
            <ArrowLeft size={15} /> Buat brief baru
          </Link>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-3xl)", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--sand-900)", margin: 0 }}>
            Brief Pra-Desain
          </h1>
        </div>
        <a href={`/api/projects/${id}/pdf`} target="_blank" rel="noopener noreferrer" style={pdfBtn}>
          <Download size={17} /> Unduh PDF
        </a>
      </div>

      {/* Ringkasan */}
      <Card eyebrow="Ringkasan" tone="sunk" elevation="none" style={{ marginBottom: "var(--space-9)" }}>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: "var(--space-5) var(--space-6)", margin: 0 }}>
          <SummaryRow k="Profil" v={brief.clientProfile} />
          <SummaryRow k="Tanah" v={`${brief.land.widthM} × ${brief.land.depthM} m`} />
          {brief.land.orientation && <SummaryRow k="Orientasi" v={ORIENTATION_LABEL[brief.land.orientation]} />}
          <SummaryRow k="Budget" v={formatIdr(brief.budgetIdr)} />
          <SummaryRow k="Lantai" v={`${brief.floors} lantai`} />
          <SummaryRow k="Kamar" v={`${brief.bedrooms} tidur · ${brief.bathrooms} mandi`} />
          <SummaryRow k="Gaya" v={STYLE_LABEL[brief.style]} />
          {brief.priorities.length > 0 && <SummaryRow k="Prioritas" v={brief.priorities.map((p) => PRIORITY_LABEL[p]).join(", ")} />}
        </dl>
      </Card>

      {/* Kelayakan */}
      <section style={{ marginBottom: "var(--space-9)" }}>
        <SectionHeading eyebrow="01 — Kelayakan" icon={<Ruler size={22} strokeWidth={2.2} />} title="Cek Kelayakan & Budget" />

        <Card tone={verdict.card} elevation="sm" padding="lg" style={{ marginBottom: "var(--space-5)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div className="gr-eyebrow" style={{ marginBottom: 8 }}>Status budget</div>
              <Badge tone={verdict.badge} dot>{BUDGET_VERDICT_LABEL[feasibility.budgetVerdict]}</Badge>
              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "12px 0 0", maxWidth: "44ch", lineHeight: 1.55 }}>
                Estimasi biaya konstruksi {formatIdr(feasibility.estimatedCost.lowIdr)} – {formatIdr(feasibility.estimatedCost.highIdr)} untuk
                ± {feasibility.estimatedBuildAreaM2} m² bangunan.
              </p>
            </div>
            <Stat label="Budget kamu" value={formatIdr(brief.budgetIdr)} tone="clay" />
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 1, background: "var(--border-hair)", border: "1px solid var(--border-hair)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: "var(--space-5)" }}>
          {stats.map((st) => (
            <div key={st.label} style={{ background: "var(--surface)", padding: "var(--space-5)" }}>
              <Stat label={st.label} value={st.value} unit={st.unit} tone={st.tone} />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {feasibility.warnings.map((w, i) => (
            <Callout key={i} severity={w.severity === "info" ? "info" : w.severity} title={w.title}>
              {w.detail}
            </Callout>
          ))}
        </div>
      </section>

      {/* Denah */}
      <section style={{ marginBottom: "var(--space-9)" }}>
        <SectionHeading eyebrow="02 — Denah" icon={<LayoutGrid size={22} strokeWidth={2.2} />} title="2 Alternatif Denah Konsep" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: "var(--space-5)" }}>
          {layouts.map((layout) => (
            <PlanCard key={layout.id} layout={layout} accent={layout.id === "A" ? "clay" : "forest"} recommended={layout.id === recommendedLayout} />
          ))}
        </div>
      </section>

      {/* Revisi (AI) */}
      <section style={{ marginBottom: "var(--space-9)" }}>
        <SectionHeading eyebrow="03 — Revisi" icon={<PencilRuler size={22} strokeWidth={2.2} />} title="Revisi dengan Bahasa Sehari-hari" />
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 var(--space-5)", lineHeight: 1.55, maxWidth: "60ch" }}>
          Sampaikan perubahan yang diminta klien dengan kalimat biasa. AI menerjemahkannya menjadi
          perubahan brief; denah dan kelayakan dihitung ulang otomatis. Setiap revisi tersimpan
          sebagai versi yang bisa dibandingkan.
        </p>
        <RevisionSection projectId={id} />
      </section>

      {/* Visual 3D (AI) */}
      <section style={{ marginBottom: "var(--space-9)" }}>
        <SectionHeading eyebrow="04 — Visual 3D" icon={<Box size={22} strokeWidth={2.2} />} title="Visual Konsep 3D" />
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 var(--space-5)", lineHeight: 1.55, maxWidth: "60ch" }}>
          Buat 3D aerial (sudut 3/4 helicopter), tampak depan/belakang/samping/atas, dan denah
          interior berperabot — semuanya dibangun dari denah & data ruang yang sudah dihitung.
          Bisa dibuat ulang sampai cocok, lalu disertakan di PDF.
        </p>
        <VisualPanel projectId={id} initialVisuals={bundle.visuals} />
      </section>

      {/* Pertanyaan */}
      <section style={{ marginBottom: "var(--space-9)" }}>
        <SectionHeading eyebrow="05 — Bawa ke ahli" icon={<MessagesSquare size={22} strokeWidth={2.2} />} title="Pertanyaan untuk Tukang / Kontraktor" />
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-hair)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          {QUESTIONS_FOR_TUKANG.map((q, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                padding: "var(--space-4) var(--space-5)",
                borderBottom: i < QUESTIONS_FOR_TUKANG.length - 1 ? "1px solid var(--border-hair)" : "none",
              }}
            >
              <span style={{ flex: "0 0 auto", width: 26, height: 26, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12, background: "var(--clay-50)", color: "var(--clay-700)", border: "1px solid var(--clay-200)" }}>
                {i + 1}
              </span>
              <p style={{ fontSize: 15, lineHeight: 1.5, color: "var(--text-body)", margin: "2px 0 0" }}>{q}</p>
            </div>
          ))}
        </div>
      </section>

      <Disclaimer>{DISCLAIMER}</Disclaimer>
    </main>
  );
}

const pdfBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: "2.75rem",
  padding: "0 1.125rem",
  background: "var(--primary)",
  color: "var(--on-primary)",
  borderRadius: "var(--radius-md)",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  letterSpacing: "var(--tracking-snug)",
  boxShadow: "var(--shadow-sm)",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <dt style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-faint)" }}>{k}</dt>
      <dd style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-strong)" }}>{v}</dd>
    </div>
  );
}

function PlanCard({ layout, accent, recommended }: { layout: LayoutOption; accent: "clay" | "forest"; recommended: boolean }) {
  const svg = renderPlanSvg(layout);
  return (
    <div style={{ background: "var(--surface)", border: recommended ? "1px solid var(--clay-400)" : "1px solid var(--border-hair)", boxShadow: recommended ? "0 0 0 1px var(--clay-400), var(--shadow-sm)" : "var(--shadow-sm)", borderRadius: "var(--radius-lg)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--border-hair)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, background: accent === "forest" ? "var(--forest-500)" : "var(--clay-500)", color: "var(--sand-0)" }}>
            {layout.id}
          </span>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-lg)", color: "var(--text-strong)" }}>Denah {layout.id}</span>
          {recommended && <Badge tone="clay" uppercase>Direkomendasikan</Badge>}
        </div>
        <Badge tone={layout.fits ? "success" : "caution"} uppercase>{layout.fits ? "Muat" : "Sempit"}</Badge>
      </div>

      <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5, margin: 0, padding: "var(--space-4) var(--space-5) 0" }}>{layout.summary}</p>

      <div style={{ padding: "var(--space-4) var(--space-5)" }}>
        <div className="gr-blueprint" style={{ border: "1px solid var(--border-hair)", borderRadius: "var(--radius-md)", padding: 12 }} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 var(--space-5) var(--space-4)", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
          Footprint ± {round1(layout.footprint.widthM)} × {round1(layout.footprint.depthM)} m
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--plan-wet)", border: "1px solid var(--plan-wall)" }} /> area basah
        </span>
      </div>

      {layout.notes.map((n, i) => (
        <p key={i} style={{ fontSize: 12, color: "var(--caution-text)", background: "var(--caution-bg)", margin: 0, padding: "10px var(--space-5)", borderTop: "1px solid var(--caution-border)", lineHeight: 1.5 }}>
          {n}
        </p>
      ))}
    </div>
  );
}
