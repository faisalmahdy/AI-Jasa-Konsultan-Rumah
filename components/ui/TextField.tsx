"use client";

import React from "react";

/**
 * Griya — TextField. Labelled text/number input with optional hint + adornments
 * ("Rp", "m"). Label above, hint below. Focus draws a clay ring; numbers use mono.
 */
interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  invalid?: boolean;
  wrapStyle?: React.CSSProperties;
}

export function TextField({
  label,
  hint,
  prefix = null,
  suffix = null,
  type = "text",
  id,
  invalid = false,
  wrapStyle,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = React.useState(false);
  const reactId = React.useId();
  const fieldId = id || reactId;
  return (
    <label htmlFor={fieldId} style={{ display: "block", ...wrapStyle }}>
      {label && (
        <span style={{ display: "block", marginBottom: "0.375rem", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-strong)" }}>
          {label}
        </span>
      )}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          height: "2.75rem",
          padding: "0 0.875rem",
          background: "var(--surface)",
          border: `1.5px solid ${invalid ? "var(--danger-500)" : focused ? "var(--clay-400)" : "var(--border)"}`,
          borderRadius: "var(--radius-md)",
          boxShadow: focused ? "0 0 0 3px var(--clay-100)" : "var(--shadow-xs)",
          transition: "border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out)",
        }}
      >
        {prefix && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{prefix}</span>}
        <input
          id={fieldId}
          type={type}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: type === "number" ? "var(--font-mono)" : "var(--font-sans)",
            fontSize: "var(--text-base)",
            color: "var(--text-strong)",
          }}
          {...rest}
        />
        {suffix && <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{suffix}</span>}
      </span>
      {hint && (
        <span style={{ display: "block", marginTop: "0.375rem", fontSize: "var(--text-xs)", color: invalid ? "var(--danger-text)" : "var(--text-muted)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}
