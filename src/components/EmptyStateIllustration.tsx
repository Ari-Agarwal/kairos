// Line-art illustrations for first-run/empty list states, matching
// OnboardingIllustration.tsx's established style (sparse inline SVG using
// the locked palette tokens, not a stock photo or generic icon) -- Section
// 15's brief was to extend onboarding's "every screen gets imagery" standard
// to empty states, which read as unfinished/blank otherwise.

const STROKE = "var(--border)";
const ACCENT = "var(--primary)";
const DIM = "var(--text-gray)";

export function MatchesEmptyArt() {
  // A bullseye/target with one ring lit -- matches haven't been generated
  // yet, so only the center is drawn in; the outer rings are still faint.
  return (
    <svg viewBox="0 0 160 100" className="w-full h-24" fill="none" aria-hidden="true">
      <circle cx="80" cy="50" r="30" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="80" cy="50" r="19" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="80" cy="50" r="8" stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="80" cy="50" r="2.5" fill={ACCENT} />
      <path d="M80 8 V16" stroke={DIM} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M118 50 H126" stroke={DIM} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ScholarshipsEmptyArt() {
  // An award ribbon, undecorated -- no scholarships in this category (yet),
  // drawn plainly rather than with a checkmark or star to avoid implying
  // an achievement that hasn't happened.
  return (
    <svg viewBox="0 0 160 100" className="w-full h-24" fill="none" aria-hidden="true">
      <circle cx="80" cy="38" r="20" stroke={ACCENT} strokeWidth="1.5" />
      <path d="M68 55 L60 84 L80 74 L100 84 L92 55" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="70" y1="34" x2="90" y2="34" stroke={DIM} strokeWidth="1.3" />
      <line x1="70" y1="42" x2="84" y2="42" stroke={DIM} strokeWidth="1.3" />
    </svg>
  );
}
