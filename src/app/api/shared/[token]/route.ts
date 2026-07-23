import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

// Public endpoint — no auth cookie required. Token validation and all data
// access go through the service-role client; no anon/public Supabase policy
// exists on shared_links or the underlying tables.
//
// Exposed fields are deliberately limited to what a parent or counselor
// needs to understand the student's college list:
//   - name (display only), grade, high school, intended major
//   - school matches: name, tier, percentage, rationale
//   - upcoming timeline items: title, due date, schools tagged, completion status
//
// NOT exposed: email, GPA, test scores, financial data, class rank,
// AP count, career goals, first-gen status, budget, essay content.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || typeof token !== "string" || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  const service = createServiceClient();

  // Keyed by token, not a user id -- the caller isn't authenticated. Loose
  // enough for a parent/counselor to check in repeatedly, tight enough to
  // stop a leaked link from being scraped on a loop.
  const rl = await checkRateLimit(service, `shared-view:${token}`, 60, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });

  const { data: link, error: linkErr } = await service
    .from("shared_links")
    .select("user_id, expires_at, revoked_at")
    .eq("token", token)
    .single();

  if (linkErr || !link) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  if (link.revoked_at !== null) {
    return NextResponse.json({ error: "This link has been revoked." }, { status: 410 });
  }

  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "This link has expired." }, { status: 410 });
  }

  const userId = link.user_id;

  const [profileRes, matchesRes, timelineRes, timelineTotalRes, timelineDoneRes] = await Promise.all([
    service
      .from("profiles")
      .select("grade_level, intended_major, current_school, display_name")
      .eq("user_id", userId)
      .single(),
    service
      .from("school_matches")
      .select("id, school_name, category, percentage, why_text")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("category"),
    service
      .from("timeline_items")
      .select("title, due_date, school_tags, completed")
      .eq("user_id", userId)
      .eq("completed", false)
      .order("due_date", { ascending: true })
      .limit(20),
    service.from("timeline_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
    service.from("timeline_items").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
  ]);

  if (profileRes.error) console.error("shared token profile query failed:", profileRes.error);
  if (matchesRes.error) console.error("shared token matches query failed:", matchesRes.error);
  if (timelineRes.error) console.error("shared token timeline query failed:", timelineRes.error);
  if (timelineTotalRes.error) console.error("shared token timeline total query failed:", timelineTotalRes.error);
  if (timelineDoneRes.error) console.error("shared token timeline done query failed:", timelineDoneRes.error);

  const timelineTotal = timelineTotalRes.count ?? 0;
  const timelineDone = timelineDoneRes.count ?? 0;
  const timelineProgressPct = timelineTotal > 0 ? Math.round((timelineDone / timelineTotal) * 100) : null;

  // Reads straight off profiles.display_name rather than an
  // auth.admin.getUserById() round-trip -- same fix as the recommender page
  // for the same unreliable fan-out pattern.
  const displayName: string = profileRes.data?.display_name?.trim() || "Student";

  // This token's own prior reactions, so a returning parent sees what they
  // already left rather than a blank form. Scoped to this token only --
  // a token never sees another share link's reactions.
  const matchIds = (matchesRes.data ?? []).map((m) => m.id);
  let reactionsByMatch: Record<string, { reaction: string | null; comment: string | null }> = {};
  if (matchIds.length > 0) {
    const { data: reactionsData, error: reactionsErr } = await service
      .from("shared_list_reactions")
      .select("school_match_id, reaction, comment, created_at")
      .eq("share_token", token)
      .in("school_match_id", matchIds)
      .order("created_at", { ascending: false });

    if (reactionsErr) console.error("shared token reactions query failed:", reactionsErr);

    reactionsByMatch = {};
    for (const r of reactionsData ?? []) {
      if (!reactionsByMatch[r.school_match_id]) {
        reactionsByMatch[r.school_match_id] = { reaction: r.reaction, comment: r.comment };
      }
    }
  }

  return NextResponse.json({
    student: {
      display_name: displayName,
      grade_level: profileRes.data?.grade_level ?? null,
      current_school: profileRes.data?.current_school ?? null,
      intended_major: profileRes.data?.intended_major ?? null,
    },
    matches: matchesRes.data ?? [],
    reactions: reactionsByMatch,
    upcoming_tasks: timelineRes.data ?? [],
    timeline_progress_pct: timelineProgressPct,
  });
}
