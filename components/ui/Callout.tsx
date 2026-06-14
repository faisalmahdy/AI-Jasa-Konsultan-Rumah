import React from "react";
import { Badge, type BadgeTone } from "./Badge";

/**
 * Griya — Callout. The feasibility/advisory box. `severity` maps to the product's
 * warning families: warning (Peringatan), tradeoff, info, success. A left accent bar
 * carries the colour; a mono uppercase tag + bold title + detail copy.
 */
export type Severity = "warning" | "tradeoff" | "info" | "success";

const SEVERITY: Record<Severity, { tone: BadgeTone; label: string; bar: string; bg: string; border: string }> = {
  warning: { tone: "danger", label: "Peringatan", bar: "var(--danger-500)", bg: "var(--danger-bg)", border: "var(--danger-border)" },
  tradeoff: { tone: "caution", label: "Tradeoff", bar: "var(--caution-500)", bg: "var(--caution-bg)", border: "var(--caution-border)" },
  info: { tone: "info", label: "Info", bar: "var(--info-500)", bg: "var(--info-bg)", border: "var(--info-border)" },
  success: { tone: "success", label: "Aman", bar: "var(--success-500)", bg: "var(--success-bg)", border: "var(--success-border)" },
};

interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  severity?: Severity;
  title?: string;
  label?: string;
}

export function Callout({ severity = "info", title, label, children, style, ...rest }: CalloutProps) {
  const s = SEVERITY[severity];
  return (
    <div
      role="note"
      style={{ display: "flex", background: s.bg, border: `1px solid ${s.border}`, borderRadius: "var(--radius-lg)", overflow: "hidden", ...style }}
      {...rest}
    >
      <div aria-hidden="true" style={{ width: 4, flex: "0 0 4px", background: s.bar }} />
      <div style={{ padding: "var(--space-4) var(--space-5)", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <Badge tone={s.tone} uppercase>{label ?? s.label}</Badge>
        </div>
        {title && (
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-strong)", margin: "0 0 0.2rem" }}>
            {title}
          </p>
        )}
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", lineHeight: "var(--leading-relaxed)", color: "var(--text-body)", margin: 0 }}>
          {children}
        </p>
      </div>
    </div>
  );
}
