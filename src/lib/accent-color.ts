// Optional student accent-color preference (Software_Timeline.md Section 15,
// "personalization beyond function"). Deliberately a short, locked list --
// each option only ever restyles the brand-accent hue (--primary/--amber in
// globals.css); it never touches --red (reach-tier/errors), --premium
// (premium tier), or --green (safety-tier), so tier distinction keeps
// reading by shade/label per CLAUDE.md's design rules, not by this choice.
export const ACCENT_COLORS = [
  { id: "forest", label: "Forest (default)", swatch: "#3C5E3B" },
  { id: "navy", label: "Navy", swatch: "#2C4A6E" },
  { id: "mustard", label: "Mustard", swatch: "#8C6A19" },
] as const;

export type AccentColorId = (typeof ACCENT_COLORS)[number]["id"];

export const DEFAULT_ACCENT: AccentColorId = "forest";

const ACCENT_IDS = new Set<string>(ACCENT_COLORS.map((c) => c.id));

export function isAccentColorId(value: unknown): value is AccentColorId {
  return typeof value === "string" && ACCENT_IDS.has(value);
}

export const ACCENT_COLOR_STORAGE_KEY = "kairos_accent_color";

// Applies immediately (data-accent on <html>) and caches to localStorage so
// a returning visitor doesn't flash back to the default before the profile
// fetch resolves.
export function applyAccentColor(id: AccentColorId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-accent", id);
  try {
    window.localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, id);
  } catch {
    // localStorage can throw in private-browsing/blocked-storage contexts --
    // the preference still applies for this page load, just isn't cached.
  }
}
