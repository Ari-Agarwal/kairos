import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/api/stripe/webhook", "/auth/callback", "/preview-heroes", "/terms", "/privacy", "/about", "/methodology", "/notify", "/notify/join", "/api/waitlist", "/admin/waitlist"];

// Prefix-matched public paths — for routes with dynamic segments that must
// stay reachable by an unauthenticated visitor (share links, recommender
// pages). Token/existence validation happens inside each route itself;
// the proxy's job is only to not block the request before it gets there.
// Deliberately narrow: only the specific public sub-routes, never a bare
// "/api/recommendations/" prefix — that would also unauth-gate the
// authenticated CRUD routes ([id] list/update/delete) at the proxy layer,
// leaving their own internal getUser()/401 check as the only remaining
// guard instead of defense-in-depth.
const PUBLIC_PATH_PREFIXES = ["/shared/", "/api/shared/", "/recommender/", "/api/war-room/parent/"];
const PUBLIC_PATH_PATTERNS = [/^\/api\/recommendations\/[^/]+\/talking-points$/];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.includes(path) ||
    path.startsWith("/_next") ||
    PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)) ||
    PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(path));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/counselor")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    const { data: counselor, error: counselorError } = await supabase
      .from("counselors")
      .select("counselor_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (counselorError) console.error("proxy counselor lookup failed:", counselorError);
    if (!counselor) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|models/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|gltf|ico|woff|woff2)$).*)",
  ],
};
