// SCREEN 1 COMPLETE
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function IntroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    redirect(profile ? "/dashboard" : "/onboarding");
  }

  const { data: studentCountData } = await supabase.rpc("get_student_count");
  const studentCount = studentCountData ?? 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-serif text-3xl text-primary mb-8">Metam</h1>

      <h2 className="font-serif text-3xl md:text-4xl text-text max-w-2xl leading-tight mb-5">
        College guidance shouldn&apos;t depend on what you can afford.
      </h2>

      <p className="text-text-gray max-w-md mb-10 leading-relaxed">
        Stop guessing what to do next. Metam gives you total clarity, a personalized path
        built from your grades, goals, and interests, so you always know exactly what to
        focus on.
      </p>

      <div className="bg-card border border-border rounded-2xl px-8 py-5 mb-10 max-w-sm">
        <p className="font-serif text-2xl text-primary mb-1">
          {studentCount.toLocaleString()} students helped so far
        </p>
        <p className="text-text-gray text-sm">Real profiles, real plans, growing every week.</p>
      </div>

      <Link
        href="/signup"
        className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-white font-medium px-8 py-3"
      >
        Get Started
      </Link>
    </div>
  );
}
