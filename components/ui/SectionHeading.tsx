import React from "react";

/** Griya — numbered section heading: mono clay eyebrow + icon + display title. */
export function SectionHeading({
  eyebrow,
  icon,
  title,
  style,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: "var(--space-5)", ...style }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--clay-600)", marginBottom: "0.5rem" }}>
        {eyebrow}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <span style={{ color: "var(--sand-900)", display: "inline-flex" }}>{icon}</span>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--sand-900)", margin: 0 }}>
          {title}
        </h2>
      </div>
    </div>
  );
}
