import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

// Public, no-login portfolio page (Section 16). Token-gated the same way as
// /shared/[token] and /recommender/[token] -- resolved through the
// service-role client, never through auth.uid()/RLS, since the visitor has
// no session.
//
// Deliberately opt-in via profiles.public_portfolio_enabled, a flag of its
// own rather than a reuse of share_narrative_with_counselor -- that flag
// exposes narrative/essay work to a school counselor inside the product;
// this page is reachable by anyone with the link, so it gets its own
// explicit consent and a narrower set of fields.
//
// Exposed: first name, extracurriculars, stated interests, and narrative
// throughline + core values (only if the student has a narrative profile).
// Never exposed: GPA, test scores, class rank, financial data, essay
// content, school matches/tiers, or anything counselor-facing.
async function getPortfolio(token: string) {
  if (token.length !== 64 || !/^[0-9a-f]+$/.test(token)) return null;

  const service = createServiceClient();

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("user_id, display_name, extracurriculars, interests, public_portfolio_enabled")
    .eq("public_portfolio_token", token)
    .single();

  if (profileError) console.error("public portfolio profile lookup failed:", profileError);
  if (!profile) return null;
  if (!profile.public_portfolio_enabled) return "disabled" as const;

  const { data: narrative, error: narrativeError } = await service
    .from("narrative_profiles")
    .select("throughline, core_values")
    .eq("user_id", profile.user_id)
    .maybeSingle();

  if (narrativeError) console.error("public portfolio narrative lookup failed:", narrativeError);

  const displayName: string = profile.display_name?.trim() || "Student";
  const firstName = displayName.split(" ")[0];

  return {
    first_name: firstName,
    extracurriculars: (profile.extracurriculars ?? []) as string[],
    interests: profile.interests ?? null,
    throughline: narrative?.throughline ?? null,
    core_values: (narrative?.core_values ?? null) as string[] | null,
  };
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPortfolio(token);

  if (!data) notFound();

  if (data === "disabled") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-5">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-sm text-center">
          <p className="font-serif text-xl text-text mb-2">Portfolio unavailable</p>
          <p className="text-text-gray text-sm">
            This student has turned off their public portfolio.
          </p>
        </div>
      </div>
    );
  }

  const { first_name, extracurriculars, interests, throughline, core_values } = data;

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="mb-10">
          <p className="text-text-gray text-xs uppercase tracking-widest mb-2">Student Portfolio</p>
          <h1 className="font-serif text-3xl text-text mb-1">{first_name}</h1>
        </div>

        {throughline && (
          <section className="mb-8">
            <h2 className="font-serif text-xl text-text mb-3">Throughline</h2>
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-text text-sm leading-relaxed">{throughline}</p>
              {core_values && core_values.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {core_values.map((v, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="font-serif text-xl text-text mb-3">Activities</h2>
          {extracurriculars.length === 0 ? (
            <p className="text-text-gray text-sm">Nothing listed yet.</p>
          ) : (
            <ul className="space-y-2">
              {extracurriculars.map((ec, i) => (
                <li key={i} className="bg-card border border-border rounded-xl px-5 py-3 text-text text-sm">
                  {ec}
                </li>
              ))}
            </ul>
          )}
        </section>

        {interests && (
          <section className="mb-10">
            <h2 className="font-serif text-xl text-text mb-3">Interests</h2>
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-text text-sm leading-relaxed">{interests}</p>
            </div>
          </section>
        )}

        <p className="text-text-gray text-xs text-center border-t border-border pt-6">
          This is a public portfolio shared by {first_name}. It never includes grades, test scores,
          financial details, essays, or school lists. Powered by Kairos.
        </p>
      </div>
    </div>
  );
}
