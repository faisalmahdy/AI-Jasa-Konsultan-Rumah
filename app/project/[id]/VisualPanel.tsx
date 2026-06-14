"use client";

import { useState } from "react";
import type { VisualVersion } from "@/lib/schemas";
import { VIEW_LABEL, VIEW_ORDER, type ViewType } from "@/lib/prompt";
import { VISUAL_MISMATCH_DISCLAIMER } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer } from "@/components/ui/Disclaimer";

const VIEWS: ViewType[] = VIEW_ORDER;

export default function VisualPanel({
  projectId,
  initialVisuals,
}: {
  projectId: string;
  initialVisuals: VisualVersion[];
}) {
  const [visuals, setVisuals] = useState<VisualVersion[]>(initialVisuals);
  const [loading, setLoading] = useState<ViewType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function post(body: Record<string, unknown>) {
    const res = await fetch(`/api/projects/${projectId}/visual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Terjadi kesalahan");
    return data as { visuals: VisualVersion[] };
  }

  async function generate(view: ViewType) {
    setLoading(view);
    setError(null);
    try {
      const { visuals } = await post({ action: "generate", viewType: view });
      setVisuals(visuals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat gambar");
    } finally {
      setLoading(null);
    }
  }

  async function accept(visualId: string) {
    setError(null);
    try {
      const { visuals } = await post({ action: "accept", visualId });
      setVisuals(visuals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {error && (
        <p style={{ padding: "0.625rem 0.875rem", borderRadius: "var(--radius-md)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger-text)", fontSize: "var(--text-sm)" }}>
          {error}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-4)" }}>
        {VIEWS.map((view) => {
          const ofView = visuals.filter((v) => v.type === view);
          const latest = ofView[ofView.length - 1];
          const count = ofView.length;
          const accepted = latest?.status === "accepted";
          return (
            <div key={view} style={{ background: "var(--surface)", border: "1px solid var(--border-hair)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", padding: "var(--space-4)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: "var(--space-3)" }}>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-strong)", margin: 0 }}>{VIEW_LABEL[view]}</h4>
                <Button size="sm" variant={count > 0 ? "secondary" : "primary"} onClick={() => generate(view)} disabled={loading !== null}>
                  {loading === view ? "Membuat…" : count > 0 ? "Buat ulang" : "Generate AI"}
                </Button>
              </div>

              {latest ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={latest.imageUrl} alt={VIEW_LABEL[view]} style={{ width: "100%", borderRadius: "var(--radius-md)", border: "1px solid var(--border-hair)", display: "block" }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "var(--space-2)" }}>
                    <Badge tone={accepted ? "forest" : "neutral"} dot={accepted}>
                      {accepted ? "Dikunci · masuk PDF" : `Masuk PDF · konsep (${count}×)`}
                    </Badge>
                    {!accepted && (
                      <Button size="sm" variant="ghost" onClick={() => accept(latest.id)}>
                        Kunci versi ini
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                  Belum dibuat. Klik Generate untuk membuat {VIEW_LABEL[view].toLowerCase()} via AI dari denah.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: "var(--text-2xs)", lineHeight: 1.6, color: "var(--text-faint)", margin: 0 }}>
        Semua tampak yang kamu buat otomatis ikut saat unduh PDF (satu gambar terbaru per tampak).
        “Kunci versi ini” hanya untuk mempertahankan pilihan saat membuat ulang.
      </p>
      <Disclaimer>{VISUAL_MISMATCH_DISCLAIMER}</Disclaimer>
    </div>
  );
}
