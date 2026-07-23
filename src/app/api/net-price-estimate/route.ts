import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/origin-check";
import { requireString, rejectScriptTags, ValidationError } from "@/lib/validate";
import { getCollegeStats } from "@/lib/college-scorecard";
import { getNetPriceEstimate } from "@/lib/net-price-estimate";
import { getAllScholarships, getFitTier, type ScholarshipProfile } from "@/lib/scholarships";

// Financial aid buildout, items 1 + 2 (Software_Timeline.md): a rough
// estimated net price range for a matched school, plus (item 2, a data join,
// not a new AI call) the tracked scholarships that could help close the
// resulting estimated gap. Hard-gated on the student having actually opted
// into financial_aid_info_consent AND given a usable income bracket -- never
// called, and never returns anything, for a student who left this blank.
export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `net-price-estimate:${user.id}`, 15, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let schoolName: string;
  try {
    const body = await req.json();
    schoolName = requireString(body.schoolName, "School name", 200);
    rejectScriptTags(schoolName, "School name");
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "financial_aid_info_consent, financial_aid_income_bracket, financial_aid_state, financial_aid_family_size, first_gen, financial_aid_need, intended_major, extracurriculars"
    )
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("net-price-estimate profile query failed:", profileError);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  if (
    !profile.financial_aid_info_consent ||
    !profile.financial_aid_income_bracket ||
    profile.financial_aid_income_bracket === "prefer_not_to_say"
  ) {
    return NextResponse.json(
      { error: "Add your income bracket and family size on your Profile to see a cost estimate." },
      { status: 403 }
    );
  }

  const familySize = profile.financial_aid_family_size ?? 1;

  const stats = await getCollegeStats(schoolName);

  const estimate = await getNetPriceEstimate({
    userId: user.id,
    schoolName,
    incomeBracket: profile.financial_aid_income_bracket,
    familySize,
    state: profile.financial_aid_state ?? null,
    stats,
  });

  if (!estimate) {
    return NextResponse.json({ error: "Failed to generate a cost estimate. Please try again." }, { status: 502 });
  }

  // Item 2: aid-gap-closing scholarships -- a data join over the existing
  // fit-tier logic, not a new AI call. "Gap" here is deliberately the high
  // end of the estimated range (the more conservative, less-aid scenario),
  // so a scholarship surfaced here is genuinely relevant even in a worse-case
  // outcome, not just the optimistic one.
  const scholarshipProfile: ScholarshipProfile = {
    first_gen: profile.first_gen,
    financial_aid_need: profile.financial_aid_need,
    intended_major: (profile.intended_major as string[] | null) ?? null,
    extracurriculars: (profile.extracurriculars as string[] | null) ?? null,
  };

  const gapClosingScholarships = getAllScholarships()
    .map((s) => ({ scholarship: s, fit: getFitTier(s, scholarshipProfile) }))
    .filter((s) => s.fit.tier === "Strong Fit" || s.fit.tier === "Possible")
    .sort((a, b) => (a.fit.tier === b.fit.tier ? 0 : a.fit.tier === "Strong Fit" ? -1 : 1))
    .slice(0, 5)
    .map((s) => ({
      name: s.scholarship.name,
      award_amount: s.scholarship.award_amount ?? null,
      deadline_window: s.scholarship.deadline_window,
      source_url: s.scholarship.source_url,
      fit_tier: s.fit.tier,
      fit_reason: s.fit.reason,
    }));

  return NextResponse.json({
    estimate: {
      low: estimate.low,
      high: estimate.high,
      aidGenerosity: estimate.aidGenerosity,
      rationale: estimate.rationale,
      fetchedAt: estimate.fetchedAt,
    },
    stickerPrice: stats?.costOfAttendance ?? null,
    gapClosingScholarships,
  });
}
