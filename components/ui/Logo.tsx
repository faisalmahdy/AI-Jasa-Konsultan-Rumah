/**
 * Griya — brand mark. A geometric roof + plot + foundation pin on a clay tile.
 * Ported from assets/logo-mark.svg. `wordmark` adds the "Griya" lockup in display 800.
 */
export function Logo({ size = 34, wordmark = false }: { size?: number; wordmark?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" role="img" aria-label="Griya">
        <rect width="40" height="40" rx="10" fill="#C2613F" />
        <path d="M9 21.5 L20 11 L31 21.5" stroke="#FBF1EC" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 21 L12 29.5 L28 29.5 L28 21" stroke="#FBF1EC" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="25.4" r="2.1" fill="#FBF1EC" />
      </svg>
      {wordmark && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "-0.03em",
            color: "var(--sand-900)",
          }}
        >
          Griya
        </span>
      )}
    </span>
  );
}
