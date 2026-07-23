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

// Section 1 "Craft & delight" audit: extending the same imagery treatment to
// every other bare-text empty state in the app.

export function HistoryEmptyArt() {
  // A clock face with no hands yet drawn in -- no past sessions logged, so
  // the record is still blank rather than "broken."
  return (
    <svg viewBox="0 0 160 100" className="w-full h-24" fill="none" aria-hidden="true">
      <circle cx="80" cy="50" r="26" stroke={STROKE} strokeWidth="1.5" />
      <path d="M80 50 V34" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M80 50 L94 56" stroke={DIM} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="80" cy="50" r="2" fill={ACCENT} />
    </svg>
  );
}

export function StudentsEmptyArt() {
  // Three simple figure outlines, unfilled -- no roster/results to show yet,
  // not an error state.
  return (
    <svg viewBox="0 0 160 100" className="w-full h-24" fill="none" aria-hidden="true">
      <circle cx="55" cy="38" r="10" stroke={STROKE} strokeWidth="1.5" />
      <path d="M38 78 C38 62 72 62 72 78" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="105" cy="34" r="12" stroke={ACCENT} strokeWidth="1.5" />
      <path d="M84 80 C84 60 126 60 126 80" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AllClearArt() {
  // A calm checkmark inside a loose circle -- used for genuinely positive
  // empty states (e.g. "no students flagged"), distinct from the neutral
  // "nothing here yet" arts above so it doesn't read as a gap.
  return (
    <svg viewBox="0 0 160 100" className="w-full h-24" fill="none" aria-hidden="true">
      <circle cx="80" cy="50" r="28" stroke={ACCENT} strokeWidth="1.5" />
      <path d="M68 50 L77 59 L94 40" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NotificationsEmptyArt() {
  // A bell with no dot -- nothing pending, drawn plainly.
  return (
    <svg viewBox="0 0 160 100" className="w-full h-24" fill="none" aria-hidden="true">
      <path d="M80 30 C68 30 62 40 62 52 V62 L56 70 H104 L98 62 V52 C98 40 92 30 80 30 Z" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M73 70 C73 76 76 80 80 80 C84 80 87 76 87 70" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="80" cy="22" r="2" fill={DIM} />
    </svg>
  );
}

export function ThroughlineEmptyArt() {
  // A dashed, unfinished thread connecting three faint points -- the
  // narrative throughline hasn't been built yet.
  return (
    <svg viewBox="0 0 160 100" className="w-full h-24" fill="none" aria-hidden="true">
      <path d="M30 70 Q65 20 80 50 T130 30" stroke={ACCENT} strokeWidth="1.5" strokeDasharray="4 5" strokeLinecap="round" />
      <circle cx="30" cy="70" r="3" fill={DIM} />
      <circle cx="80" cy="50" r="3" fill={ACCENT} />
      <circle cx="130" cy="30" r="3" fill={DIM} />
    </svg>
  );
}
