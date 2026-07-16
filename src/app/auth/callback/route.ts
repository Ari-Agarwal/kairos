import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const code = searchParams.get("code");
  // Behind a reverse proxy (e.g. a tunnel used for on-device mobile testing),
  // request.url reflects the server's own bind address, not the public host
  // the browser is actually using — prefer the forwarded headers when present
  // so the redirect lands back on the host the user is really on.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestOrigin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profileError) console.error("auth callback profile query failed:", profileError);
        return NextResponse.redirect(`${origin}${profile ? "/dashboard" : "/onboarding"}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
