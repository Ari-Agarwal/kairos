import { describe, expect, it } from "vitest";
import { canAccessFeature, canRegenerate, isCounselor, weekStart, FREE_REGENERATION_WEEKLY_LIMIT } from "./access";

describe("canAccessFeature", () => {
  it("denies access for null/undefined users", () => {
    expect(canAccessFeature(null, "essay_feedback")).toBe(false);
    expect(canAccessFeature(undefined, "essay_feedback")).toBe(false);
  });

  it("denies access for free-tier users", () => {
    expect(canAccessFeature({ subscription_tier: "free" }, "essay_feedback")).toBe(false);
  });

  it("grants access for premium users", () => {
    expect(canAccessFeature({ subscription_tier: "premium" }, "essay_feedback")).toBe(true);
  });
});

describe("isCounselor", () => {
  it("denies null/undefined users", () => {
    expect(isCounselor(null)).toBe(false);
    expect(isCounselor(undefined)).toBe(false);
  });

  it("denies students", () => {
    expect(isCounselor({ role: "student" })).toBe(false);
  });

  it("grants counselors", () => {
    expect(isCounselor({ role: "counselor" })).toBe(true);
  });
});

describe("weekStart", () => {
  it("returns the same Monday for every day in that week", () => {
    const monday = weekStart(new Date("2026-06-29T12:00:00Z"));
    const wednesday = weekStart(new Date("2026-07-01T23:59:00Z"));
    const sunday = weekStart(new Date("2026-07-05T00:00:00Z"));
    expect(monday).toBe("2026-06-29");
    expect(wednesday).toBe("2026-06-29");
    expect(sunday).toBe("2026-06-29");
  });

  it("rolls over to the next Monday once the week ends", () => {
    expect(weekStart(new Date("2026-07-06T00:00:00Z"))).toBe("2026-07-06");
  });
});

describe("canRegenerate (regeneration cap enforcement)", () => {
  it("blocks free users at the weekly limit", () => {
    expect(canRegenerate({ subscription_tier: "free" }, FREE_REGENERATION_WEEKLY_LIMIT)).toBe(false);
  });

  it("blocks free users beyond the weekly limit", () => {
    expect(canRegenerate({ subscription_tier: "free" }, FREE_REGENERATION_WEEKLY_LIMIT + 5)).toBe(false);
  });

  it("allows free users under the weekly limit", () => {
    expect(canRegenerate({ subscription_tier: "free" }, FREE_REGENERATION_WEEKLY_LIMIT - 1)).toBe(true);
  });

  it("never blocks premium users regardless of count", () => {
    expect(canRegenerate({ subscription_tier: "premium" }, 999)).toBe(true);
  });
});
