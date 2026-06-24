// SCREEN 1 COMPLETE
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HeroSection } from "@/components/blocks/hero-section-5";

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

  return <HeroSection studentCount={studentCount} />;
}
