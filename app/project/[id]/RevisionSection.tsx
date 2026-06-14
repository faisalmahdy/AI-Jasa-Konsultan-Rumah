"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
        router.refresh(); // re-render the server page with the new plan
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses revisi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Revision input */}
      <div className="rounded-xl border border-slate-200 p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Tulis perubahan yang diminta klien (Bahasa Indonesia):
        </label>
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="mis. tambah 1 kamar tidur, kamar utama di belakang, warna lebih cerah"
          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={submit}
            disabled={loading || !request.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {loading ? "Memproses…" : "Terapkan Revisi (AI)"}
          </button>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setRequest(ex)}
              disabled={loading}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-500 hover:border-slate-400 disabled:opacity-60"
            >
              {ex}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          AI hanya menerjemahkan permintaan menjadi perubahan brief. Denah & kelayakan tetap
          dihitung otomatis (deterministik), bukan dikarang AI.
        </p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* Last revision result */}
      {last && (
        <div
          className={`rounded-xl border p-4 ${last.applied ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}
        >
          {last.understanding && (
            <p className="text-sm text-slate-800">
              <span className="font-semibold">Dipahami sebagai:</span> {last.understanding}
            </p>
          )}
          {last.needsClarification && (
            <p className="mt-2 text-sm text-amber-800">
              <span className="font-semibold">Perlu klarifikasi:</span> {last.needsClarification}
            </p>
          )}
          {last.applied && last.changes && last.changes.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
              {last.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          {last.applied && (!last.changes || last.changes.length === 0) && (
            <p className="mt-2 text-sm text-slate-600">
              Tidak ada perubahan pada brief (mungkin sudah sesuai permintaan).
            </p>
          )}
          {last.unsupported && last.unsupported.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-slate-600">Tidak bisa di tahap konsep:</p>
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-500">
                {last.unsupported.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}
          {last.visualChanged && (
            <p className="mt-2 text-xs text-slate-500">
              Penyesuaian visual disimpan — klik “Buat ulang” di panel Visual untuk menerapkannya.
            </p>
          )}
        </div>
      )}

      {/* History + compare */}
      {versions.length > 0 && <VersionCompare versions={versions} />}
    </div>
  );
}

function VersionCompare({ versions }: { versions: ProjectVersion[] }) {
  const last = versions.length - 1;
  const [a, setA] = useState(0);
  const [b, setB] = useState(last);

  // Keep selections valid as new versions arrive.
  useEffect(() => {
    setB(versions.length - 1);
    setA(versions.length >= 2 ? versions.length - 2 : 0);
  }, [versions.length]);

  const va = versions[Math.min(a, last)];
  const vb = versions[Math.min(b, last)];

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-900">Riwayat & Perbandingan Versi</h3>

      <ol className="mb-4 space-y-2">
        {versions.map((v) => (
          <li key={v.versionNumber} className="text-sm">
            <span className="font-semibold text-slate-800">
              Versi {v.versionNumber}
              {v.versionNumber === 1 ? " (asli)" : ""}
            </span>
            {v.requestText && <span className="text-slate-500"> — “{v.requestText}”</span>}
            {v.changes.length > 0 && v.versionNumber !== 1 && (
              <span className="text-slate-400"> · {v.changes.join("; ")}</span>
            )}
          </li>
        ))}
      </ol>

      {versions.length >= 2 && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
            <VersionSelect label="Bandingkan" value={a} setValue={setA} versions={versions} />
            <span className="text-slate-400">dengan</span>
            <VersionSelect label="" value={b} setValue={setB} versions={versions} />
          </div>
          <CompareTable va={va} vb={vb} />
        </>
      )}
    </div>
  );
}

function VersionSelect({
  label,
  value,
  setValue,
  versions,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  versions: ProjectVersion[];
}) {
  return (
    <label className="flex items-center gap-1.5">
      {label && <span className="text-slate-500">{label}</span>}
      <select
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
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
    {
      k: "Ruang tambahan",
      val: b.extraRooms.length ? b.extraRooms.map((r) => EXTRA_ROOM_LABEL[r]).join(", ") : "—",
    },
    {
      k: "Prioritas",
      val: b.priorities.length ? b.priorities.map((p) => PRIORITY_LABEL[p]).join(", ") : "—",
    },
    { k: "Status budget", val: BUDGET_VERDICT_LABEL[v.feasibility.budgetVerdict] },
    { k: "Luas bangunan", val: `± ${round1(v.feasibility.estimatedBuildAreaM2)} m²` },
    { k: "Jumlah peringatan", val: String(v.feasibility.warnings.length) },
  ];
}

function CompareTable({ va, vb }: { va: ProjectVersion; vb: ProjectVersion }) {
  const rowsA = briefRows(va);
  const rowsB = briefRows(vb);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th className="py-1 pr-3 font-medium" />
            <th className="py-1 pr-3 font-semibold text-slate-700">Versi {va.versionNumber}</th>
            <th className="py-1 font-semibold text-slate-700">Versi {vb.versionNumber}</th>
          </tr>
        </thead>
        <tbody>
          {rowsA.map((row, i) => {
            const changed = row.val !== rowsB[i].val;
            return (
              <tr key={row.k} className={changed ? "bg-amber-50" : ""}>
                <td className="py-1 pr-3 text-xs text-slate-500">{row.k}</td>
                <td className="py-1 pr-3 text-slate-700">{row.val}</td>
                <td className={`py-1 ${changed ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                  {rowsB[i].val}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
