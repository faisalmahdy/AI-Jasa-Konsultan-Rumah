"use client";

import React from "react";

/**
 * Griya — Chip. Toggleable pill for multi-select brief inputs (extra rooms,
 * priorities). Active = clay-soft fill + clay border + check; idle = paper + hairline.
 */
interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children?: React.ReactNode;
  active?: boolean;
  icon?: React.ReactNode;
}

export function Chip({ children, active = false, icon = null, disabled = false, style, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        height: "2.25rem",
        padding: "0 0.875rem",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--fw-semibold)" as unknown as number,
        lineHeight: 1,
        color: active ? "var(--clay-800)" : "var(--text-body)",
        background: active ? "var(--clay-50)" : "var(--surface)",
        border: active ? "1.5px solid var(--clay-400)" : "1.5px solid var(--border)",
        borderRadius: "var(--radius-full)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: active ? "var(--shadow-xs)" : "none",
        transition: "all var(--dur) var(--ease-out)",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {active && (
        <span
          aria-hidden="true"
          style={{
            width: "1rem",
            height: "1rem",
            marginLeft: "-0.15rem",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "var(--clay-500)",
            color: "var(--sand-0)",
            fontSize: "0.7rem",
            fontWeight: "var(--fw-bold)" as unknown as number,
          }}
        >
          ✓
        </span>
      )}
      {!active && icon}
      <span>{children}</span>
    </button>
  );
}
