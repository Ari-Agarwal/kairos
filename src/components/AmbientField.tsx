// Deterministic pseudo-random so server and client render identical markup (no hydration
// mismatch). Uses only integer ops (mulberry32-style) — Math.sin() drifts in its last decimal
// places between Node (SSR) and the browser, which broke hydration when tried here first.
function seededRandom(seed: number): number {
  let t = (Math.floor(seed * 1000) + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const STAR_COUNT = 36;

const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  left: `${(seededRandom(i * 3.1) * 100).toFixed(2)}%`,
  top: `${(seededRandom(i * 7.7 + 1) * 100).toFixed(2)}%`,
  size: seededRandom(i * 5.3 + 2) > 0.85 ? 2 : 1,
  duration: 3 + seededRandom(i * 2.2 + 3) * 4,
  delay: seededRandom(i * 9.4 + 4) * 5,
  max: 0.35 + seededRandom(i * 4.6 + 5) * 0.35,
}));

// A faint, perpetual starfield behind app screens — a quiet echo of the
// landing page hero, kept subtle enough to never compete with content.
export default function AmbientField() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {STARS.map((star, i) => (
        <span
          key={i}
          className="ambient-star absolute rounded-full bg-text-gray"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            ["--twinkle-duration" as string]: `${star.duration}s`,
            ["--twinkle-delay" as string]: `${star.delay}s`,
            ["--twinkle-max" as string]: star.max,
          }}
        />
      ))}
    </div>
  );
}
