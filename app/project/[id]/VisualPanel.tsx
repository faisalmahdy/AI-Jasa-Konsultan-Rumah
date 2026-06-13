"use client";

import { useState } from "react";
import type { VisualVersion } from "@/lib/schemas";
import { VIEW_LABEL, type ViewType } from "@/lib/prompt";
import { VISUAL_MISMATCH_DISCLAIMER } from "@/lib/content";

const VIEWS: ViewType[] = ["front_elevation", "exterior_3d"];

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
    <div className="space-y-4">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {VIEWS.map((view) => {
          const ofView = visuals.filter((v) => v.type === view);
          const latest = ofView[ofView.length - 1];
          const count = ofView.length;
          return (
            <div key={view} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">{VIEW_LABEL[view]}</h3>
                <button
                  onClick={() => generate(view)}
                  disabled={loading !== null}
                  className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {loading === view ? "Membuat…" : count > 0 ? "Buat ulang" : "Generate AI"}
                </button>
              </div>

              {latest ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={latest.imageUrl}
                    alt={VIEW_LABEL[view]}
                    className="w-full rounded-lg border border-slate-200"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span
                      className={`text-xs ${latest.status === "accepted" ? "font-semibold text-green-700" : "text-slate-500"}`}
                    >
                      {latest.status === "accepted" ? "Dipakai di PDF" : `Konsep (dibuat ${count}×)`}
                    </span>
                    {latest.status !== "accepted" && (
                      <button
                        onClick={() => accept(latest.id)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:border-slate-500"
                      >
                        Gunakan di PDF
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Belum ada gambar. Klik Generate untuk membuat konsep {VIEW_LABEL[view].toLowerCase()} via AI.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">{VISUAL_MISMATCH_DISCLAIMER}</p>
    </div>
  );
}
