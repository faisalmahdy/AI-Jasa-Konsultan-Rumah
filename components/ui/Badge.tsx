import React from "react";

/** Griya — Badge. Small status pill; tones map to the brand's semantic hues. */
export type BadgeTone = "neutral" | "clay" | "forest" | "danger" | "caution" | "info" | "success";

const TONES: Record<BadgeTone, { soft: [string, string]; solid: [string, string] }> = {
  neutral: { soft: ["var(--sand-100)", "var(--sand-700)"], solid: ["var(--sand-700)", "var(--sand-0)"] },
  clay: { soft: ["var(--clay-50)", "var(--clay-700)"], solid: ["var(--clay-500)", "var(--sand-0)"] },
  forest: { soft: ["var(--forest-50)", "var(--forest-700)"], solid: ["var(--forest-500)", "var(--sand-0)"] },
  danger: { soft: ["var(--danger-bg)", "var(--danger-text)"], solid: ["var(--danger-500)", "var(--sand-0)"] },
  caution: { soft: ["var(--caution-bg)", "var(--caution-text)"], solid: ["var(--caution-500)", "var(--sand-0)"] },
  info: { soft: ["var(--info-bg)", "var(--info-text)"], solid: ["var(--info-500)", "var(--sand-0)"] },
  success: { soft: ["var(--success-bg)", "var(--success-text)"], solid: ["var(--success-500)", "var(--sand-0)"] },
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: "soft" | "solid";
  uppercase?: boolean;
  dot?: boolean;
}

export function Badge({ children, tone = "neutral", variant = "soft", uppercase = false, dot = false, style, ...rest }: BadgeProps) {
  const [bg, fg] = TONES[tone][variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: uppercase ? "0.2rem 0.5rem" : "0.25rem 0.6rem",
        background: bg,
        color: fg,
        fontFamily: uppercase ? "var(--font-mono)" : "var(--font-sans)",
        fontSize: uppercase ? "var(--text-2xs)" : "var(--text-xs)",
        fontWeight: (uppercase ? "var(--fw-bold)" : "var(--fw-semibold)") as unknown as number,
        letterSpacing: uppercase ? "var(--tracking-caps)" : "var(--tracking-normal)",
        textTransform: uppercase ? "uppercase" : "none",
        lineHeight: 1.2,
        borderRadius: "var(--radius-full)",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {dot && <span aria-hidden="true" style={{ width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: "currentColor" }} />}
      {children}
    </span>
  );
}
