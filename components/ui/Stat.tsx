import React from "react";

/** Griya — Stat. A labelled figure block for feasibility numbers. Value is mono. */
type StatTone = "default" | "clay" | "forest" | "danger" | "caution" | "info";

const VALUE_COLOR: Record<StatTone, string> = {
  default: "var(--text-strong)",
  clay: "var(--clay-600)",
  forest: "var(--forest-600)",
  danger: "var(--danger-500)",
  caution: "var(--caution-text)",
  info: "var(--info-600)",
};

interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: string;
  tone?: StatTone;
  align?: "left" | "center";
}

export function Stat({ label, value, unit, sub, tone = "default", align = "left", style, ...rest }: StatProps) {
  return (
    <div style={{ textAlign: align, ...style }} {...rest}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", justifyContent: align === "center" ? "center" : "flex-start" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xl)", fontWeight: 700, lineHeight: 1, letterSpacing: "var(--tracking-snug)", color: VALUE_COLOR[tone] }}>
          {value}
        </span>
        {unit && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "0.3rem" }}>{sub}</div>}
    </div>
  );
}
