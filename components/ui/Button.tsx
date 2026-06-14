"use client";

import React from "react";

/**
 * Griya — Button. Clay-solid for the main commitment, forest for confirm,
 * secondary outline, ghost for tertiary. Darkens on hover, nudges 1px on press.
 */
type Variant = "primary" | "accent" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

const SIZES: Record<Size, React.CSSProperties> = {
  sm: { padding: "0 0.75rem", height: "2rem", fontSize: "var(--text-sm)", gap: "0.375rem", borderRadius: "var(--radius-sm)" },
  md: { padding: "0 1.125rem", height: "2.75rem", fontSize: "var(--text-sm)", gap: "0.5rem", borderRadius: "var(--radius-md)" },
  lg: { padding: "0 1.5rem", height: "3.25rem", fontSize: "var(--text-base)", gap: "0.625rem", borderRadius: "var(--radius-md)" },
};

const VARIANTS: Record<Variant, { bg: string; color: string; border: string; shadow: string; hover: string }> = {
  primary: { bg: "var(--primary)", color: "var(--on-primary)", border: "1px solid transparent", shadow: "var(--shadow-sm)", hover: "var(--primary-hover)" },
  accent: { bg: "var(--accent)", color: "var(--on-accent)", border: "1px solid transparent", shadow: "var(--shadow-sm)", hover: "var(--accent-hover)" },
  secondary: { bg: "var(--surface)", color: "var(--text-strong)", border: "1px solid var(--border)", shadow: "var(--shadow-xs)", hover: "var(--surface-sunk)" },
  ghost: { bg: "transparent", color: "var(--clay-700)", border: "1px solid transparent", shadow: "none", hover: "var(--clay-50)" },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft = null,
  iconRight = null,
  fullWidth = false,
  loading = false,
  disabled = false,
  type = "button",
  style,
  ...rest
}: ButtonProps) {
  const s = SIZES[size];
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      style={{
        display: fullWidth ? "flex" : "inline-flex",
        width: fullWidth ? "100%" : "auto",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        fontFamily: "var(--font-sans)",
        fontSize: s.fontSize,
        fontWeight: "var(--fw-semibold)" as unknown as number,
        lineHeight: 1,
        letterSpacing: "var(--tracking-snug)",
        color: v.color,
        background: v.bg,
        border: v.border,
        borderRadius: s.borderRadius,
        boxShadow: v.shadow,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.55 : 1,
        transition: "background var(--dur) var(--ease-out), transform var(--dur-fast) var(--ease-out), box-shadow var(--dur) var(--ease-out)",
        whiteSpace: "nowrap",
        ...style,
      }}
      onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.background = v.hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = v.bg; e.currentTarget.style.transform = "translateY(0)"; }}
      onMouseDown={(e) => { if (!isDisabled) e.currentTarget.style.transform = "translateY(1px)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      {children && <span>{children}</span>}
      {!loading && iconRight}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: "1em",
        height: "1em",
        borderRadius: "50%",
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        display: "inline-block",
        animation: "gr-spin 0.7s linear infinite",
      }}
    />
  );
}
