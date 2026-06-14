import React from "react";

/** Griya — brief form field group: clay icon tile + display title + optional hint. */
export function FormSection({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "var(--space-7)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5625rem", marginBottom: "var(--space-4)" }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--clay-50)",
            color: "var(--clay-600)",
            border: "1px solid var(--clay-200)",
          }}
        >
          {icon}
        </span>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-strong)", margin: 0 }}>{title}</h3>
        {hint && <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", marginLeft: "auto" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
