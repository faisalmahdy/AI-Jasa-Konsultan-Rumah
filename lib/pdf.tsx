import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Rect,
  Line,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ProjectBundle, LayoutOption, Warning, VisualVersion } from "./schemas";
import { buildPlanDrawing, PLAN_COLORS } from "./plan-render";
import { VIEW_LABEL, VIEW_ORDER } from "./prompt";
import { readImagePng } from "./image-store";
import { DISCLAIMER, VISUAL_MISMATCH_DISCLAIMER, QUESTIONS_FOR_TUKANG } from "./content";
import {
  formatIdr,
  round1,
  STYLE_LABEL,
  PRIORITY_LABEL,
  ORIENTATION_LABEL,
  BUDGET_VERDICT_LABEL,
} from "./format";

/**
 * react-pdf brief compiler (locked in eng review). 5 A4 pages. The disclaimer is a
 * `fixed` footer so it appears on EVERY page by construction. The plan SVG is rendered
 * from the SAME buildPlanDrawing() the web uses, so PDF and screen match.
 *
 * Degradation: if no visual exists (thin MVP, or image gen failed/capped in stage 3),
 * the PDF still ships with both floor plans. A visual is never required.
 */

const SEVERITY_COLOR: Record<Warning["severity"], string> = {
  warning: "#b91c1c",
  tradeoff: "#b45309",
  info: "#0369a1",
};
const SEVERITY_LABEL: Record<Warning["severity"], string> = {
  warning: "PERINGATAN",
  tradeoff: "TRADEOFF",
  info: "INFO",
};

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontSize: 10, color: "#0f172a", fontFamily: "Helvetica" },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6 },
  sub: { fontSize: 9, color: "#64748b", marginBottom: 10 },
  row: { flexDirection: "row", marginBottom: 3 },
  key: { width: 150, color: "#475569" },
  val: { flex: 1, fontFamily: "Helvetica-Bold" },
  li: { flexDirection: "row", marginBottom: 4 },
  bullet: { width: 12 },
  liText: { flex: 1, lineHeight: 1.35 },
  card: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, padding: 8, marginBottom: 8 },
  cardTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  cardDetail: { fontSize: 9, color: "#334155", marginTop: 2, lineHeight: 1.35 },
  badge: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#fff", paddingVertical: 1.5, paddingHorizontal: 4, borderRadius: 2, marginBottom: 3, alignSelf: "flex-start" },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 6 },
  footerText: { fontSize: 7, color: "#64748b", lineHeight: 1.3 },
  pageNum: { position: "absolute", bottom: 24, right: 44, fontSize: 7, color: "#94a3b8" },
  planCaption: { fontSize: 9, color: "#475569", marginTop: 6, lineHeight: 1.35 },
  note: { fontSize: 9, color: "#b45309", marginTop: 4, lineHeight: 1.35 },
});

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{DISCLAIMER}</Text>
    </View>
  );
}

function PageNum() {
  return (
    <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.row}>
      <Text style={s.key}>{k}</Text>
      <Text style={s.val}>{v}</Text>
    </View>
  );
}

function PlanSvg({ layout, maxW, maxH }: { layout: LayoutOption; maxW: number; maxH: number }) {
  const fitScale = Math.min(maxW / layout.footprint.widthM, maxH / layout.footprint.depthM);
  const d = buildPlanDrawing(layout, fitScale);
  return (
    <Svg width={d.width} height={d.height} viewBox={`0 0 ${d.width} ${d.height}`}>
      {d.rects.map((r, i) => (
        <Rect
          key={`r${i}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          fill={r.wet ? PLAN_COLORS.wet : PLAN_COLORS.dry}
          stroke={PLAN_COLORS.stroke}
          strokeWidth={1}
        />
      ))}
      <Rect x={0} y={0} width={d.width} height={d.height} fill="none" stroke={PLAN_COLORS.border} strokeWidth={2} />
      {d.lines.map((l, i) => (
        <Line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={PLAN_COLORS.opening} strokeWidth={l.width} />
      ))}
      {d.labels.map((t, i) => (
        <Text
          key={`t${i}`}
          x={t.x}
          y={t.y}
          style={{ fontSize: t.size, fontFamily: t.bold ? "Helvetica-Bold" : "Helvetica" }}
          fill={t.bold ? PLAN_COLORS.text : PLAN_COLORS.dim}
          textAnchor="middle"
        >
          {t.text}
        </Text>
      ))}
    </Svg>
  );
}

function PlanPage({ bundle, layout }: { bundle: ProjectBundle; layout: LayoutOption }) {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.h1}>Denah Alternatif {layout.id}</Text>
      <Text style={s.sub}>{layout.summary}</Text>
      <View style={{ alignItems: "center", marginVertical: 8 }}>
        <PlanSvg layout={layout} maxW={480} maxH={470} />
      </View>
      <Text style={s.planCaption}>
        Footprint sekitar {round1(layout.footprint.widthM)} × {round1(layout.footprint.depthM)} m
        (luas bangun ± {round1(layout.buildAreaM2)} m²). Ruang berwarna biru = area basah
        (kamar mandi / dapur), sudah dikelompokkan. Ukuran indikatif.
      </Text>
      {layout.notes.map((n, i) => (
        <Text key={i} style={s.note}>
          • {n}
        </Text>
      ))}
      <Footer />
      <PageNum />
    </Page>
  );
}

interface VisualImage {
  visual: VisualVersion;
  imageDataUrl: string;
}

function BriefDocument({
  bundle,
  visualImages,
}: {
  bundle: ProjectBundle;
  visualImages: VisualImage[];
}) {
  const { brief, feasibility } = bundle;

  return (
    <Document title={`Brief Pra-Desain — ${brief.clientProfile}`}>
      {/* Page 1 — Ringkasan klien */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Brief Pra-Desain Rumah</Text>
        <Text style={s.sub}>
          Paket diskusi awal untuk dibawa ke tukang / kontraktor. Dibuat {bundle.createdAt.slice(0, 10)}.
        </Text>

        <Text style={s.h2}>Ringkasan Kebutuhan</Text>
        <KV k="Profil klien" v={brief.clientProfile} />
        <KV k="Ukuran tanah" v={`${brief.land.widthM} × ${brief.land.depthM} m (${feasibility.lotAreaM2} m²)`} />
        {brief.land.orientation && <KV k="Orientasi" v={ORIENTATION_LABEL[brief.land.orientation]} />}
        <KV k="Budget konstruksi" v={formatIdr(brief.budgetIdr)} />
        <KV k="Jumlah lantai" v={String(brief.floors)} />
        <KV k="Kamar tidur" v={String(brief.bedrooms)} />
        <KV k="Kamar mandi" v={String(brief.bathrooms)} />
        <KV k="Gaya" v={STYLE_LABEL[brief.style]} />
        {brief.priorities.length > 0 && (
          <KV k="Prioritas" v={brief.priorities.map((p) => PRIORITY_LABEL[p]).join(", ")} />
        )}

        <Text style={s.h2}>Asumsi</Text>
        {feasibility.assumptions.map((a, i) => (
          <View key={i} style={s.li}>
            <Text style={s.bullet}>•</Text>
            <Text style={s.liText}>{a}</Text>
          </View>
        ))}

        <Footer />
        <PageNum />
      </Page>

      {/* Page 2 — Feasibility */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Cek Kelayakan & Budget</Text>
        <Text style={s.sub}>
          Status budget: {BUDGET_VERDICT_LABEL[feasibility.budgetVerdict]}. Estimasi biaya konstruksi{" "}
          {formatIdr(feasibility.estimatedCost.lowIdr)} – {formatIdr(feasibility.estimatedCost.highIdr)} untuk
          ± {feasibility.estimatedBuildAreaM2} m² bangunan.
        </Text>

        <Text style={s.h2}>Peringatan & Tradeoff</Text>
        {feasibility.warnings.map((w, i) => (
          <View key={i} style={s.card}>
            <Text style={[s.badge, { backgroundColor: SEVERITY_COLOR[w.severity] }]}>
              {SEVERITY_LABEL[w.severity]}
            </Text>
            <Text style={s.cardTitle}>{w.title}</Text>
            <Text style={s.cardDetail}>{w.detail}</Text>
          </View>
        ))}

        <Footer />
        <PageNum />
      </Page>

      {/* Pages 3 & 4 — Denah A & B */}
      {bundle.layouts.map((layout) => (
        <PlanPage key={layout.id} bundle={bundle} layout={layout} />
      ))}

      {/* Page 5 — Visual + pertanyaan untuk tukang */}
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Tampak / Visual & Pertanyaan untuk Tukang</Text>
        <Text style={s.sub}>Bawa pertanyaan ini saat berdiskusi dengan tukang atau kontraktor.</Text>

        <Text style={s.h2}>Visual Konsep 3D</Text>
        {visualImages.length > 0 ? (
          <>
            {visualImages.map(({ visual, imageDataUrl }) => (
              <View key={visual.id} style={s.card} wrap={false}>
                <Text style={s.cardTitle}>{VIEW_LABEL[visual.type]} (konsep)</Text>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={imageDataUrl} style={{ marginTop: 6, marginBottom: 6, width: 380, height: 250, objectFit: "contain" }} />
              </View>
            ))}
            <Text style={s.cardDetail}>{VISUAL_MISMATCH_DISCLAIMER}</Text>
          </>
        ) : (
          <View style={s.card}>
            <Text style={s.cardTitle}>Visual belum dibuat</Text>
            <Text style={s.cardDetail}>
              Brief ini fokus pada kebutuhan ruang, kelayakan, dan denah. Tampak/3D konsep dapat
              ditambahkan dari halaman proyek. Denah dan ukuran tetap mengacu pada gambar 2D di atas.
            </Text>
          </View>
        )}

        <Text style={s.h2}>Pertanyaan untuk Tukang / Kontraktor</Text>
        {QUESTIONS_FOR_TUKANG.map((q, i) => (
          <View key={i} style={s.li}>
            <Text style={s.bullet}>{i + 1}.</Text>
            <Text style={s.liText}>{q}</Text>
          </View>
        ))}

        <Footer />
        <PageNum />
      </Page>
    </Document>
  );
}

/** Render the brief to a PDF buffer. Used by the download route and tests. */
export function renderBriefPdf(bundle: ProjectBundle): Promise<Buffer> {
  // Include EVERY accepted view (in display order) for the handoff package. If nothing is
  // accepted, fall back to the single most recent candidate. Degrades to no image at all.
  const accepted = VIEW_ORDER.flatMap((view) =>
    bundle.visuals.filter((v) => v.type === view && v.status === "accepted"),
  );
  const chosen = accepted.length
    ? accepted
    : [...bundle.visuals].reverse().filter((v) => v.status === "candidate").slice(0, 1);

  const visualImages: VisualImage[] = [];
  for (const visual of chosen) {
    const png = readImagePng(visual.id);
    if (png) visualImages.push({ visual, imageDataUrl: `data:image/png;base64,${png.toString("base64")}` });
  }
  return renderToBuffer(<BriefDocument bundle={bundle} visualImages={visualImages} />);
}
