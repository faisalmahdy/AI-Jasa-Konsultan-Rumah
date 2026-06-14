import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

/** Griya app header — logo lockup + a quiet "Gratis" trust pill. Sticky, sand-blur. */
export function Header() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(20px, 5vw, 48px)",
        height: 68,
        borderBottom: "1px solid var(--border-hair)",
        background: "color-mix(in srgb, var(--sand-50) 86%, transparent)",
        backdropFilter: "saturate(140%) blur(8px)",
        WebkitBackdropFilter: "saturate(140%) blur(8px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <Link href="/" style={{ display: "inline-flex", textDecoration: "none" }} aria-label="Griya — beranda">
        <Logo wordmark />
      </Link>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "var(--forest-600)",
          background: "var(--forest-50)",
          border: "1px solid var(--forest-200)",
          borderRadius: 999,
          padding: "4px 10px",
        }}
      >
        <ShieldCheck size={13} /> Gratis
      </span>
    </header>
  );
}
