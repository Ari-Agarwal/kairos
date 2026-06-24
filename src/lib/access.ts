export type FeatureKey =
  | "career_path_explorer"
  | "essay_feedback"
  | "unlimited_regenerations"
  | "strategic_timeline_advice";

export interface AccessUser {
  subscription_tier: "free" | "premium";
}

export function canAccessFeature(user: AccessUser | null | undefined, featureKey: FeatureKey): boolean {
  if (!user) return false;
  return user.subscription_tier === "premium";
}
