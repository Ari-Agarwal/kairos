import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NavShell from "@/components/NavShell";
import ProfileCompletenessModal from "@/components/ProfileCompletenessModal";
import { Features } from "@/components/blocks/features-6";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ matchError?: string }>;
}) {
  const { matchError } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const { data: studentCount } = await supabase.rpc("get_student_count");

  const { count: activeMatchCount } = await supabase
    .from("school_matches")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_active", true);

  const name = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";

  return (
    <NavShell>
      <ProfileCompletenessModal profile={profile} />
      <div className="px-5 md:px-8 py-10 max-w-2xl mx-auto w-full">
        <h1 className="font-serif text-3xl text-text mb-2">Welcome, {name}.</h1>
        <p className="text-text-gray text-sm mb-8">
          {profile.grade_level} · GPA {profile.gpa} · {profile.intended_major || "Major undecided"}
        </p>

        {matchError === "true" && (
          <div className="bg-red-tint border border-border rounded-2xl px-5 py-4 mb-6">
            <p className="text-red text-sm">
              We couldn&apos;t generate your school matches just now. Head to the Matches tab and
              tap &quot;Regenerate List&quot; to try again.
            </p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl px-6 py-6 mb-8">
          <p className="font-serif text-xl text-primary mb-4">
            {(studentCount ?? 0).toLocaleString()} students helped so far
          </p>
          <div className="space-y-4 text-text-gray text-sm leading-relaxed">
            <p>
              Each year, an estimated 400,000 academically strong students from low-income
              backgrounds fail to enroll in any college, while another 200,000 enroll in
              institutions well below what their academic records would otherwise support.
              Researchers refer to this as &quot;undermatching.&quot; It is not an isolated
              anomaly but a structural pattern, one that recurs predictably among capable
              students year after year.
            </p>
            <p>
              The cause is straightforward. Matching a student to the right institution requires
              genuine analysis: an evaluation of grades, coursework, and extracurricular record
              against real admissions outcomes, followed by an honest account of where that
              student actually stands. This analysis is neither rare nor unusual, but it is
              expensive. Private admissions consultants typically charge between $4,000 and
              $12,000 for a comprehensive package, with hourly consultations ranging from $300 to
              $600, and in some cases reaching $1,000 per hour. In other words, the students who
              need this guidance the most are the students who can afford it the least.
            </p>
            <p>
              Telos was built to sever that connection between cost and access. It performs the
              same quality of analysis, weighing a student&apos;s actual profile against real
              admissions patterns, and returns a list of schools that reflects genuine potential
              rather than guesswork. It is free to start, on the idea that clarity about
              one&apos;s future should never be a privilege reserved for those who can pay for
              it.
            </p>
          </div>
        </div>

        <Features activeMatchCount={activeMatchCount ?? 0} />
      </div>
    </NavShell>
  );
}
