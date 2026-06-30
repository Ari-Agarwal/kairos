import { createClient } from "@/lib/supabase/server";
import NavShell from "@/components/NavShell";
import { AboutContent } from "@/components/AboutContent";

export const metadata = { title: "About — Kairos" };

export default async function AboutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: studentCount } = await supabase.rpc("get_student_count");

  if (user) {
    return (
      <NavShell>
        <AboutContent studentCount={studentCount ?? 0} showLogo={false} />
      </NavShell>
    );
  }

  return <AboutContent studentCount={studentCount ?? 0} showLogo={true} />;
}
