"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  Ruler,
  LayoutGrid,
  FileText,
  User,
  LandPlot,
  Wallet,
  Building2,
  Sofa,
  Star,
  ArrowRight,
} from "lucide-react";
import { formatIdr } from "@/lib/format";
import type { ExtraRoom, Priority, Style, Orientation } from "@/lib/schemas";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { FormSection } from "@/components/ui/FormSection";

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

const HERO_FEATURES: [React.ReactNode, string][] = [
  [<Ruler key="r" size={15} />, "Cek kelayakan tanah & budget"],
  [<LayoutGrid key="l" size={15} />, "2 denah konsep otomatis"],
  [<FileText key="f" size={15} />, "PDF siap dibawa ke tukang"],
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
    <main style={{ paddingInline: "clamp(20px, 5vw, 32px)" }}>
      {/* Hero */}
      <section style={{ textAlign: "center", maxWidth: 640, margin: "0 auto", padding: "clamp(40px,7vw,72px) 0 var(--space-8)" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--clay-700)",
            background: "var(--clay-50)",
            border: "1px solid var(--clay-200)",
            borderRadius: 999,
            padding: "5px 12px",
            marginBottom: "var(--space-5)",
          }}
        >
          <Compass size={13} /> Konsultan Pra-Desain Rumah
        </span>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(34px,6vw,56px)", lineHeight: 1.02, letterSpacing: "-0.03em", color: "var(--sand-900)", margin: "0 0 var(--space-4)" }}>
          Rancang sebelum
          <br />
          kamu bangun.
        </h1>
        <p style={{ fontSize: "clamp(16px,2.2vw,18px)", lineHeight: 1.55, color: "var(--text-muted)", margin: "0 auto", maxWidth: "30em" }}>
          Isi kebutuhan rumahmu. Dalam sekejap kamu dapat cek kelayakan, dua alternatif denah
          konsep, dan PDF brief untuk dibawa ke tukang atau kontraktor.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: "var(--space-6)", flexWrap: "wrap" }}>
          {HERO_FEATURES.map(([ic, t]) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
              <span style={{ color: "var(--forest-600)", display: "inline-flex" }}>{ic}</span> {t}
            </span>
          ))}
        </div>
      </section>

      {/* Form card */}
      <form
        onSubmit={onSubmit}
        style={{
          maxWidth: 640,
          margin: "0 auto",
          background: "var(--surface)",
          border: "1px solid var(--border-hair)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "clamp(24px,4vw,40px)",
        }}
      >
        <FormSection icon={<User size={16} />} title="Profil klien">
          <TextField value={clientProfile} onChange={(e) => setClientProfile(e.target.value)} placeholder="mis. Pegawai 30 tahun" required />
        </FormSection>

        <FormSection icon={<LandPlot size={16} />} title="Tanah">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <TextField label="Lebar" type="number" min="1" step="0.5" suffix="m" value={widthM} onChange={(e) => setWidthM(e.target.value)} required />
            <TextField label="Panjang" type="number" min="1" step="0.5" suffix="m" value={depthM} onChange={(e) => setDepthM(e.target.value)} required />
          </div>
          <SelectField label="Orientasi (opsional)" value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation | "")}>
            <option value="">— tidak ditentukan —</option>
            {ORIENTATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </SelectField>
        </FormSection>

        <FormSection icon={<Wallet size={16} />} title="Budget konstruksi">
          <TextField
            type="number"
            min="0"
            step="1000000"
            prefix="Rp"
            value={budgetIdr}
            onChange={(e) => setBudgetIdr(e.target.value)}
            required
            hint={budgetNum > 0 ? `${formatIdr(budgetNum)} · belum termasuk tanah, izin, furnitur` : "belum termasuk tanah, izin, furnitur"}
          />
        </FormSection>

        <FormSection icon={<Building2 size={16} />} title="Ruang">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <SelectField label="Lantai" value={floors} onChange={(e) => setFloors(e.target.value)}>
              <option value="1">1 lantai</option>
              <option value="2">2 lantai</option>
            </SelectField>
            <TextField label="Kamar tidur" type="number" min="0" max="10" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} required />
            <TextField label="Kamar mandi" type="number" min="0" max="10" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} required />
          </div>
          <SelectField label="Gaya" value={style} onChange={(e) => setStyle(e.target.value as Style)}>
            {STYLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </SelectField>
        </FormSection>

        <FormSection icon={<Sofa size={16} />} title="Ruang tambahan" hint="Dapur otomatis disertakan">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--gap-chip)" }}>
            {EXTRA_ROOM_OPTIONS.map((o) => (
              <Chip key={o.value} active={extraRooms.includes(o.value)} onClick={() => setExtraRooms((p) => toggle(p, o.value))}>
                {o.label}
              </Chip>
            ))}
          </div>
        </FormSection>

        <FormSection icon={<Star size={16} />} title="Prioritas utama">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--gap-chip)" }}>
            {PRIORITY_OPTIONS.map((o) => (
              <Chip key={o.value} active={priorities.includes(o.value)} onClick={() => setPriorities((p) => toggle(p, o.value))}>
                {o.label}
              </Chip>
            ))}
          </div>
        </FormSection>

        {error && (
          <p style={{ marginBottom: "var(--space-4)", padding: "0.625rem 0.875rem", borderRadius: "var(--radius-md)", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger-text)", fontSize: "var(--text-sm)" }}>
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting} iconRight={submitting ? null : <ArrowRight size={18} />}>
          {submitting ? "Membuat brief…" : "Buat Brief Pra-Desain"}
        </Button>

        <div style={{ marginTop: "var(--space-5)" }}>
          <Disclaimer>
            Output adalah konsep awal untuk diskusi, bukan gambar kerja (DED) atau gambar siap
            bangun. Wajib direview tenaga ahli sebelum dibangun.
          </Disclaimer>
        </div>
      </form>
      <div style={{ height: "var(--space-10)" }} />
    </main>
  );
}
