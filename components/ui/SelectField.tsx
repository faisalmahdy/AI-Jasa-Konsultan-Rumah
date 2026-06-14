"use client";

import React from "react";

/** Griya — SelectField. Native <select> styled to match TextField, custom caret. */
interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  wrapStyle?: React.CSSProperties;
}

export function SelectField({ label, hint, children, id, wrapStyle, ...rest }: SelectFieldProps) {
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
      <span style={{ position: "relative", display: "block" }}>
        <select
          id={fieldId}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            width: "100%",
            height: "2.75rem",
            padding: "0 2.5rem 0 0.875rem",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            color: "var(--text-strong)",
            background: "var(--surface)",
            border: `1.5px solid ${focused ? "var(--clay-400)" : "var(--border)"}`,
            borderRadius: "var(--radius-md)",
            boxShadow: focused ? "0 0 0 3px var(--clay-100)" : "var(--shadow-xs)",
            outline: "none",
            cursor: "pointer",
            transition: "border-color var(--dur) var(--ease-out), box-shadow var(--dur) var(--ease-out)",
          }}
          {...rest}
        >
          {children}
        </select>
        <span aria-hidden="true" style={{ position: "absolute", top: "50%", right: "0.875rem", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)", fontSize: "0.7rem" }}>
          ▾
        </span>
      </span>
      {hint && <span style={{ display: "block", marginTop: "0.375rem", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{hint}</span>}
    </label>
  );
}
