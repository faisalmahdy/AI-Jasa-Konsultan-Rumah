import React from "react";

/** Griya — Card. Warm paper surface, hairline border first, soft shadow second. */
type Tone = "paper" | "sunk" | "clay" | "forest";
type Pad = "none" | "sm" | "md" | "lg";
type Elev = "none" | "xs" | "sm" | "md" | "lg";

const TONES: Record<Tone, { bg: string; border: string }> = {
  paper: { bg: "var(--surface)", border: "var(--border-hair)" },
  sunk: { bg: "var(--surface-sunk)", border: "var(--border-hair)" },
  clay: { bg: "var(--clay-50)", border: "var(--clay-200)" },
  forest: { bg: "var(--forest-50)", border: "var(--forest-200)" },
};
const PADS: Record<Pad, string> = { none: "0", sm: "var(--space-4)", md: "var(--space-5)", lg: "var(--space-6)" };
const SHADOWS: Record<Elev, string> = { none: "none", xs: "var(--shadow-xs)", sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)" };

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  eyebrow?: string;
  title?: string;
  padding?: Pad;
  elevation?: Elev;
}

export function Card({ children, tone = "paper", eyebrow, title, padding = "lg", elevation = "sm", style, ...rest }: CardProps) {
  const t = TONES[tone];
  return (
    <div
      style={{
        display: "block",
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: "var(--radius-lg)",
        padding: PADS[padding],
        boxShadow: SHADOWS[elevation],
        textAlign: "left",
        ...style,
      }}
      {...rest}
    >
      {eyebrow && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-2xs)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          {eyebrow}
        </div>
      )}
      {title && (
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--text-strong)", letterSpacing: "var(--tracking-tight)", margin: "0 0 0.75rem" }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
