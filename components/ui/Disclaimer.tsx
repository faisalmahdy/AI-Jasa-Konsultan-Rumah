import React from "react";

/**
 * Griya — Disclaimer. The load-bearing "concept, not a buildable drawing (DED)" note.
 * Quiet but unmissable: a caution-tinted strip with a small mono mark.
 */
interface DisclaimerProps extends React.HTMLAttributes<HTMLParagraphElement> {
  pin?: boolean;
}

export function Disclaimer({ children, pin = false, style, ...rest }: DisclaimerProps) {
  return (
    <p
      role="note"
      style={{
        display: "flex",
        gap: "0.625rem",
        alignItems: "flex-start",
        padding: "0.75rem 1rem",
        background: "var(--caution-bg)",
        border: "1px solid var(--caution-border)",
        borderRadius: pin ? "0" : "var(--radius-md)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)",
        lineHeight: "var(--leading-relaxed)",
        color: "var(--caution-text)",
        margin: 0,
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true" style={{ flex: "0 0 auto", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-2xs)", lineHeight: 1.5, marginTop: "0.05rem", letterSpacing: "0.04em" }}>
        !
      </span>
      <span>{children}</span>
    </p>
  );
}
