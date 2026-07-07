import { createClient } from "@/lib/supabase/server";
import NavShell from "@/components/NavShell";
import { AboutContent } from "@/components/AboutContent";

export const metadata = { title: "About — Kairos" };

export default async function AboutPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return (
      <NavShell>
        <AboutContent showLogo={false} />
      </NavShell>
    );
  }

  return <AboutContent showLogo={true} />;
}
