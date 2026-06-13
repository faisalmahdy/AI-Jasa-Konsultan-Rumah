"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatIdr } from "@/lib/format";
import type { ExtraRoom, Priority, Style, Orientation } from "@/lib/schemas";

const STYLE_OPTIONS: { value: Style; label: string }[] = [
  { value: "minimalis", label: "Minimalis" },
  { value: "minimalis_tropis", label: "Minimalis Tropis" },
  { value: "industrial", label: "Industrial" },
  { value: "modern_sederhana", label: "Modern Sederhana" },
];

const ORIENTATION_OPTIONS: { value: Orientation; label: string }[] = [
  { value: "utara", label: "Utara" },
  { value: "timur_laut", label: "Timur Laut" },
  { value: "timur", label: "Timur" },
  { value: "tenggara", label: "Tenggara" },
  { value: "selatan", label: "Selatan" },
  { value: "barat_daya", label: "Barat Daya" },
  { value: "barat", label: "Barat" },
  { value: "barat_laut", label: "Barat Laut" },
];

// Dapur is added automatically, so it's not offered here.
const EXTRA_ROOM_OPTIONS: { value: ExtraRoom; label: string }[] = [
  { value: "ruang_tamu", label: "Ruang Tamu" },
  { value: "ruang_keluarga", label: "Ruang Keluarga" },
  { value: "ruang_makan", label: "Ruang Makan" },
  { value: "garasi", label: "Garasi" },
  { value: "taman", label: "Taman" },
  { value: "mushola", label: "Mushola" },
  { value: "gudang", label: "Gudang" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "hemat_biaya", label: "Hemat biaya" },
  { value: "kamar_luas", label: "Kamar luas" },
  { value: "ruang_keluarga", label: "Ruang keluarga lega" },
  { value: "garasi", label: "Garasi" },
  { value: "taman", label: "Taman" },
  { value: "rumah_tumbuh", label: "Rumah tumbuh" },
];

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function HomePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientProfile, setClientProfile] = useState("Pegawai 30 tahun, first-time homebuilder");
  const [widthM, setWidthM] = useState("10");
  const [depthM, setDepthM] = useState("10");
  const [orientation, setOrientation] = useState<Orientation | "">("selatan");
  const [budgetIdr, setBudgetIdr] = useState("300000000");
  const [floors, setFloors] = useState("1");
  const [bedrooms, setBedrooms] = useState("3");
  const [bathrooms, setBathrooms] = useState("2");
  const [style, setStyle] = useState<Style>("minimalis");
  const [extraRooms, setExtraRooms] = useState<ExtraRoom[]>(["ruang_tamu", "ruang_keluarga"]);
  const [priorities, setPriorities] = useState<Priority[]>(["hemat_biaya"]);

  const budgetNum = Number(budgetIdr) || 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        clientProfile,
        land: { widthM, depthM, orientation: orientation || undefined },
        budgetIdr,
        floors,
        bedrooms,
        bathrooms,
        style,
        extraRooms,
        priorities,
      };
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Gagal membuat brief");
      }
      const { id } = await res.json();
      router.push(`/project/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Konsultan Pra-Desain Rumah</h1>
        <p className="mt-1 text-sm text-slate-600">
          Isi kebutuhan rumahmu. Sistem akan membuat cek kelayakan, 2 alternatif denah konsep,
          dan PDF brief untuk dibawa ke tukang atau kontraktor.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-7">
        <Field label="Profil klien">
          <input
            type="text"
            value={clientProfile}
            onChange={(e) => setClientProfile(e.target.value)}
            required
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Lebar tanah (m)">
            <input type="number" min="1" step="0.5" value={widthM} onChange={(e) => setWidthM(e.target.value)} required className={inputCls} />
          </Field>
          <Field label="Panjang tanah (m)">
            <input type="number" min="1" step="0.5" value={depthM} onChange={(e) => setDepthM(e.target.value)} required className={inputCls} />
          </Field>
        </div>

        <Field label="Orientasi tanah (opsional)">
          <select value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation | "")} className={inputCls}>
            <option value="">— tidak ditentukan —</option>
            {ORIENTATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Budget konstruksi (Rp)" hint={budgetNum > 0 ? formatIdr(budgetNum) : "belum termasuk tanah, izin, furnitur"}>
          <input type="number" min="0" step="1000000" value={budgetIdr} onChange={(e) => setBudgetIdr(e.target.value)} required className={inputCls} />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Jumlah lantai">
            <select value={floors} onChange={(e) => setFloors(e.target.value)} className={inputCls}>
              <option value="1">1 lantai</option>
              <option value="2">2 lantai</option>
            </select>
          </Field>
          <Field label="Kamar tidur">
            <input type="number" min="0" max="10" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} required className={inputCls} />
          </Field>
          <Field label="Kamar mandi">
            <input type="number" min="0" max="10" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} required className={inputCls} />
          </Field>
        </div>

        <Field label="Gaya">
          <select value={style} onChange={(e) => setStyle(e.target.value as Style)} className={inputCls}>
            {STYLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Ruang tambahan" hint="Dapur sudah otomatis disertakan">
          <div className="flex flex-wrap gap-2">
            {EXTRA_ROOM_OPTIONS.map((o) => (
              <Chip key={o.value} active={extraRooms.includes(o.value)} onClick={() => setExtraRooms((p) => toggle(p, o.value))}>
                {o.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Prioritas utama">
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map((o) => (
              <Chip key={o.value} active={priorities.includes(o.value)} onClick={() => setPriorities((p) => toggle(p, o.value))}>
                {o.label}
              </Chip>
            ))}
          </div>
        </Field>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {submitting ? "Membuat brief…" : "Buat Brief Pra-Desain"}
        </button>
      </form>

      <p className="mt-8 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
        Output adalah konsep awal untuk diskusi, bukan gambar kerja (DED) atau gambar siap bangun.
        Wajib direview tenaga ahli sebelum dibangun.
      </p>
    </main>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-800">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
      }`}
    >
      {children}
    </button>
  );
}
