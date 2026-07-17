// One line-art illustration per onboarding round (Section 11 requirement:
// every onboarding screen needs imagery specific to its own topic, not a
// generic decorative graphic reused across steps). Kept as inline SVG rather
// than a generated/stock image so it can use the locked palette tokens
// directly and stays crisp at any size -- matches the sparse line-art style
// already established by the landing hero (hero-path.tsx).

const STROKE = "var(--border)";
const ACCENT = "var(--primary)";
const DIM = "var(--text-gray)";

function DiscoveryArt() {
  // Two overlapping speech-bubble hearts -- the get-to-know-you round is a
  // conversation about who the student is, not a form field, so it gets a
  // warmer, more personal mark than the compass/checklist rounds that follow.
  return (
    <svg viewBox="0 0 160 100" className="w-full h-24" fill="none" aria-hidden="true">
      <path
        d="M56 34 C56 24 44 24 44 34 C44 24 32 24 32 34 C32 42 44 52 44 52 C44 52 56 42 56 34 Z"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M62 60 H120 C124 60 127 63 127 67 V80 C127 84 124 87 120 87 H82 L70 96 V87 H62 C58 87 55 84 55 80 V67 C55 63 58 60 62 60 Z"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="66" y1="70" x2="116" y2="70" stroke={DIM} strokeWidth="1.3" />
      <line x1="66" y1="78" x2="100" y2="78" stroke={DIM} strokeWidth="1.3" />
    </svg>
  );
}

function BasicsArt() {
  // A mortarboard over a stacked transcript -- "the basics" round collects
  // name, grade, GPA, and current school.
  return (
    <svg viewBox="0 0 160 100" className="w-full h-24" fill="none" aria-hidden="true">
      <rect x="44" y="52" width="72" height="40" rx="4" stroke={STROKE} strokeWidth="1.5" />
      <line x1="54" y1="64" x2="96" y2="64" stroke={DIM} strokeWidth="1.5" />
      <line x1="54" y1="72" x2="106" y2="72" stroke={DIM} strokeWidth="1.5" />
      <line x1="54" y1="80" x2="88" y2="80" stroke={DIM} strokeWidth="1.5" />
      <path d="M80 18 L128 34 L80 50 L32 34 Z" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M56 40 V56 C56 60 104 60 104 56 V40" stroke={ACCENT} strokeWidth="1.5" />
      <line x1="128" y1="34" x2="128" y2="54" stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="128" cy="57" r="2.5" fill={ACCENT} />
    </svg>
  );
}

function MajorArt() {
  // A compass with radiating paths -- "major & interests" is about pointing
  // toward a direction, not a fixed destination (undecided is a valid answer).
  return (
    <svg viewBox="0 0 160 100" className="w-full h-24" fill="none" aria-hidden="true">
      <circle cx="80" cy="50" r="30" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="80" cy="50" r="3" fill={ACCENT} />
      <path d="M80 50 L94 28" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M80 50 L66 66" stroke={DIM} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="80" y1="14" x2="80" y2="22" stroke={DIM} strokeWidth="1.5" />
      <line x1="80" y1="78" x2="80" y2="86" stroke={DIM} strokeWidth="1.5" />
      <line x1="44" y1="50" x2="36" y2="50" stroke={DIM} strokeWidth="1.5" />
      <line x1="124" y1="50" x2="132" y2="50" stroke={DIM} strokeWidth="1.5" />
    </svg>
  );
}

function ActivitiesArt() {
  // A trophy flanked by simple activity marks -- extracurriculars, drawn as
  // varied achievement rather than one specific sport so it doesn't imply
  // athletics is the default answer.
  return (
    <svg viewBox="0 0 160 100" className="w-full h-24" fill="none" aria-hidden="true">
      <path
        d="M64 26 H96 V42 C96 54 88 60 80 60 C72 60 64 54 64 42 Z"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M64 30 H52 C52 40 58 46 64 46" stroke={STROKE} strokeWidth="1.5" />
      <path d="M96 30 H108 C108 40 102 46 96 46" stroke={STROKE} strokeWidth="1.5" />
      <line x1="80" y1="60" x2="80" y2="72" stroke={ACCENT} strokeWidth="1.5" />
      <rect x="68" y="72" width="24" height="8" rx="2" stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="30" cy="70" r="7" stroke={DIM} strokeWidth="1.5" />
      <path d="M120 64 L127 78 L113 78 Z" stroke={DIM} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function TestScoresArt() {
  // A checklist / scantron sheet with a pencil -- test scores are the most
  // literal, form-like round, so the imagery mirrors that directly.
  return (
    <svg viewBox="0 0 160 100" className="w-full h-24" fill="none" aria-hidden="true">
      <rect x="46" y="18" width="52" height="66" rx="3" stroke={STROKE} strokeWidth="1.5" />
      {[30, 42, 54, 66].map((y) => (
        <g key={y}>
          <circle cx="56" cy={y} r="3" stroke={DIM} strokeWidth="1.3" />
          <line x1="64" y1={y} x2="88" y2={y} stroke={DIM} strokeWidth="1.3" />
        </g>
      ))}
      <circle cx="56" cy="42" r="3" fill={ACCENT} stroke={ACCENT} />
      <path d="M100 70 L124 46 L132 54 L108 78 L98 80 Z" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="118" y1="52" x2="126" y2="60" stroke={ACCENT} strokeWidth="1.5" />
    </svg>
  );
}

export function ChatIntakeArt() {
  // Two speech bubbles -- the conversational-intake alternative to the
  // round-by-round form, so it needs its own topic (a dialogue, not a form).
  return (
    <svg viewBox="0 0 160 100" className="w-full h-20" fill="none" aria-hidden="true">
      <path
        d="M28 30 H96 C100 30 103 33 103 37 V56 C103 60 100 63 96 63 H50 L36 74 V63 H28 C24 63 21 60 21 56 V37 C21 33 24 30 28 30 Z"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="34" y1="42" x2="90" y2="42" stroke={DIM} strokeWidth="1.3" />
      <line x1="34" y1="50" x2="76" y2="50" stroke={DIM} strokeWidth="1.3" />
      <path
        d="M132 22 H144 C147 22 149 24 149 27 V38 C149 41 147 43 144 43 H140 V50 L132 43 H120 C117 43 115 41 115 38 V27 C115 24 117 22 120 22 Z"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="122" y1="30" x2="142" y2="30" stroke={ACCENT} strokeWidth="1.3" />
      <line x1="122" y1="35" x2="134" y2="35" stroke={ACCENT} strokeWidth="1.3" />
    </svg>
  );
}

export function CareerQuizArt() {
  // A signpost with branching arrows -- narrowing down an undecided major
  // means picking a direction among several, not answering a form question.
  return (
    <svg viewBox="0 0 160 80" className="w-full h-16" fill="none" aria-hidden="true">
      <line x1="80" y1="18" x2="80" y2="66" stroke={STROKE} strokeWidth="1.5" />
      <path d="M80 26 H120 L112 34 L120 42 H80" stroke={ACCENT} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M80 40 H48 L56 32 M48 40 L56 48" stroke={DIM} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="80" cy="70" r="4" stroke={STROKE} strokeWidth="1.5" />
    </svg>
  );
}

const ILLUSTRATIONS = [DiscoveryArt, BasicsArt, MajorArt, ActivitiesArt, TestScoresArt];

export default function OnboardingIllustration({ step }: { step: number }) {
  const Art = ILLUSTRATIONS[step] ?? BasicsArt;
  return (
    <div className="mb-4 flex justify-center">
      <Art />
    </div>
  );
}
