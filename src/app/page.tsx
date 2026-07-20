// SCREEN 1 COMPLETE
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { HeroSection } from "@/components/blocks/hero-section-5";

export default async function IntroPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: counselor, error: counselorError } = await supabase
      .from("counselors")
      .select("counselor_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (counselorError) console.error("intro counselor query failed:", counselorError);
    if (counselor) redirect("/counselor");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError) console.error("intro profile query failed:", profileError);
    redirect(profile ? "/dashboard" : "/onboarding");
  }

  const { data: studentCountData, error: studentCountError } = await supabase.rpc("get_student_count");
  if (studentCountError) console.error("student count rpc failed:", studentCountError);
  const studentCount = studentCountData ?? 0;

  return (
    <>
      <HeroSection studentCount={studentCount} />
      <footer className="text-center py-6 text-text-gray text-xs">
        <Link href="/terms" className="hover:text-text">Terms</Link>
        {" · "}
        <Link href="/privacy" className="hover:text-text">Privacy</Link>
      </footer>
    </>
  );
}
