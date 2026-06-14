"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectVersion } from "@/lib/schemas";
import {
  formatIdr,
  round1,
  STYLE_LABEL,
  PRIORITY_LABEL,
  EXTRA_ROOM_LABEL,
  BUDGET_VERDICT_LABEL,
} from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";

interface ReviseResponse {
  ok?: boolean;
  applied?: boolean;
  understanding?: string;
  changes?: string[];
  unsupported?: string[];
  needsClarification?: string | null;
  visualChanged?: boolean;
  error?: string;
}

const EXAMPLES = [
  "Tambah 1 kamar tidur dan 1 kamar mandi",
  "Kamar utama di belakang biar lebih privat",
  "Ganti gaya ke minimalis tropis, warna lebih cerah",
  "Tambah carport dan mushola",
];

export default function RevisionSection({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [request, setRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<ReviseResponse | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);

  const loadVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`);
      const data = await res.json();
      if (res.ok) setVersions(data.versions ?? []);
    } catch {
      /* non-fatal: history just won't show */
    }
  }, [projectId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  async function submit() {
    const text = request.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setLast(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: text }),
      });
      const data: ReviseResponse = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Gagal memproses revisi");
      setLast(data);
      if (data.applied) {
        setRequest("");
        await loadVersions();
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses revisi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Revision input */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border-hair)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", padding: "var(--space-5)" }}>
        <label style={{ display: "block", marginBottom: "var(--space-2)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-strong)" }}>
          Tulis perubahan yang diminta klien (Bahasa Indonesia):
        </label>
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="mis. tambah 1 kamar tidur, kamar utama di belakang, warna lebih cerah"
          style={{
            width: "100%",
            resize: "vertical",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--border)",
            background: "var(--surface)",
            padding: "0.625rem 0.875rem",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--text-strong)",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
          <Button onClick={submit} loading={loading} disabled={!request.trim()}>
            {loading ? "Memproses…" : "Terapkan Revisi (AI)"}
          </Button>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setRequest(ex)}
              disabled={loading}
              style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--text-muted)", background: "var(--surface-sunk)", border: "1px solid var(--border-hair)", borderRadius: "var(--radius-full)", padding: "0.25rem 0.625rem", cursor: loading ? "not-allowed" : "pointer" }}
            >
              {ex}
            </button>
          ))}
        </div>
        <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-2xs)", color: "var(--text-faint)", lineHeight: 1.6 }}>
          AI hanya menerjemahkan permintaan menjadi perubahan brief. Denah & kelayakan tetap
          dihitung otomatis (deterministik), bukan dikarang AI.
        </p>
      </div>

      {error && (
        <p style={{ padding: "0.625rem 0.875rem", borderRadius: "var(--radius-md)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger-text)", fontSize: "var(--text-sm)" }}>
          {error}
        </p>
      )}

      {/* Last revision result */}
      {last && (
        <div style={{ borderRadius: "var(--radius-lg)", border: `1px solid ${last.applied ? "var(--success-border)" : "var(--caution-border)"}`, background: last.applied ? "var(--success-bg)" : "var(--caution-bg)", padding: "var(--space-4) var(--space-5)" }}>
          {last.understanding && (
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-body)", margin: 0 }}>
              <strong style={{ color: "var(--text-strong)" }}>Dipahami sebagai:</strong> {last.understanding}
            </p>
          )}
          {last.needsClarification && (
            <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--caution-text)" }}>
              <strong>Perlu klarifikasi:</strong> {last.needsClarification}
            </p>
          )}
          {last.applied && last.changes && last.changes.length > 0 && (
            <ul style={{ margin: "var(--space-2) 0 0", paddingLeft: "1.25rem", fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: 1.6 }}>
              {last.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          {last.applied && (!last.changes || last.changes.length === 0) && (
            <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Tidak ada perubahan pada brief (mungkin sudah sesuai permintaan).
            </p>
          )}
          {last.unsupported && last.unsupported.length > 0 && (
            <div style={{ marginTop: "var(--space-2)" }}>
              <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", margin: 0 }}>Tidak bisa di tahap konsep:</p>
              <ul style={{ margin: "2px 0 0", paddingLeft: "1.25rem", fontSize: "var(--text-xs)", color: "var(--text-faint)", lineHeight: 1.55 }}>
                {last.unsupported.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}
          {last.visualChanged && (
            <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Penyesuaian visual disimpan — klik “Buat ulang” di panel Visual untuk menerapkannya.
            </p>
          )}
        </div>
      )}

      {versions.length > 0 && <VersionCompare versions={versions} />}
    </div>
  );
}

function VersionCompare({ versions }: { versions: ProjectVersion[] }) {
  const last = versions.length - 1;
  const [a, setA] = useState(0);
  const [b, setB] = useState(last);

  useEffect(() => {
    setB(versions.length - 1);
    setA(versions.length >= 2 ? versions.length - 2 : 0);
  }, [versions.length]);

  const va = versions[Math.min(a, last)];
  const vb = versions[Math.min(b, last)];

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border-hair)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xs)", padding: "var(--space-5)" }}>
      <h4 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-strong)", margin: "0 0 var(--space-4)" }}>
        Riwayat & Perbandingan Versi
      </h4>

      <ol style={{ margin: "0 0 var(--space-4)", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {versions.map((v) => (
          <li key={v.versionNumber} style={{ fontSize: "var(--text-sm)", display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 6 }}>
            <Badge tone={v.versionNumber === 1 ? "neutral" : "clay"} uppercase>{`Versi ${v.versionNumber}`}</Badge>
            {v.requestText && <span style={{ color: "var(--text-muted)" }}>“{v.requestText}”</span>}
            {v.versionNumber !== 1 && v.changes.length > 0 && (
              <span style={{ color: "var(--text-faint)", fontSize: "var(--text-xs)" }}>· {v.changes.join("; ")}</span>
            )}
          </li>
        ))}
      </ol>

      {versions.length >= 2 && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: "var(--space-3)", fontSize: "var(--text-xs)" }}>
            <VersionSelect label="Bandingkan" value={a} setValue={setA} versions={versions} />
            <span style={{ color: "var(--text-faint)" }}>dengan</span>
            <VersionSelect label="" value={b} setValue={setB} versions={versions} />
          </div>
          <CompareTable va={va} vb={vb} />
        </>
      )}
    </div>
  );
}

function VersionSelect({ label, value, setValue, versions }: { label: string; value: number; setValue: (n: number) => void; versions: ProjectVersion[] }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {label && <span style={{ color: "var(--text-muted)" }}>{label}</span>}
      <select
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)", padding: "0.25rem 0.5rem", fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--text-strong)" }}
      >
        {versions.map((v, i) => (
          <option key={v.versionNumber} value={i}>
            Versi {v.versionNumber}
            {v.versionNumber === 1 ? " (asli)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function briefRows(v: ProjectVersion): { k: string; val: string }[] {
  const b = v.brief;
  return [
    { k: "Tanah", val: `${b.land.widthM} × ${b.land.depthM} m` },
    { k: "Budget", val: formatIdr(b.budgetIdr) },
    { k: "Lantai", val: String(b.floors) },
    { k: "Gaya", val: STYLE_LABEL[b.style] },
    { k: "Kamar tidur", val: String(b.bedrooms) },
    { k: "Kamar mandi", val: String(b.bathrooms) },
    { k: "Ruang tambahan", val: b.extraRooms.length ? b.extraRooms.map((r) => EXTRA_ROOM_LABEL[r]).join(", ") : "—" },
    { k: "Prioritas", val: b.priorities.length ? b.priorities.map((p) => PRIORITY_LABEL[p]).join(", ") : "—" },
    { k: "Status budget", val: BUDGET_VERDICT_LABEL[v.feasibility.budgetVerdict] },
    { k: "Luas bangunan", val: `± ${round1(v.feasibility.estimatedBuildAreaM2)} m²` },
    { k: "Jumlah peringatan", val: String(v.feasibility.warnings.length) },
  ];
}

function CompareTable({ va, vb }: { va: ProjectVersion; vb: ProjectVersion }) {
  const rowsA = briefRows(va);
  const rowsB = briefRows(vb);
  const cellBase: React.CSSProperties = { padding: "0.3rem 0.75rem 0.3rem 0", fontSize: "var(--text-sm)" };
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...cellBase, textAlign: "left" }} />
            <th style={{ ...cellBase, textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Versi {va.versionNumber}</th>
            <th style={{ ...cellBase, textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Versi {vb.versionNumber}</th>
          </tr>
        </thead>
        <tbody>
          {rowsA.map((row, i) => {
            const changed = row.val !== rowsB[i].val;
            return (
              <tr key={row.k} style={{ background: changed ? "var(--clay-50)" : "transparent" }}>
                <td style={{ ...cellBase, paddingLeft: "0.5rem", fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-faint)" }}>{row.k}</td>
                <td style={{ ...cellBase, color: "var(--text-body)" }}>{row.val}</td>
                <td style={{ ...cellBase, fontWeight: changed ? 700 : 400, color: changed ? "var(--clay-700)" : "var(--text-body)" }}>{rowsB[i].val}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
