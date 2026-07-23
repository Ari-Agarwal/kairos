// Shared phrasing convention for "why we're suggesting this" trace text on
// items that one feature inserts into another (cross-feature coalescence).
//
// Convention: "Suggested by your <Source Feature>. <detail>" — matches the
// phrasing already used by Narrative Builder -> Timeline inserts, which we
// standardize the rest of the app on.
export function crossFeatureWhyText(sourceFeature: string, detail: string): string {
  const trimmed = detail.trim();
  return `Suggested by your ${sourceFeature}. ${trimmed}`;
}
