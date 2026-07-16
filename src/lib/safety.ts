import type { SupabaseClient } from "@supabase/supabase-js";

// Any user-to-user contact feature (mentor loop, war room) must check this
// before showing content from userB to userA -- silent by design, the
// blocked party is never told they were blocked.
export async function isBlocked(
  supabase: SupabaseClient,
  userAId: string,
  userBId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("blocks")
    .select("id")
    .or(`and(blocker_id.eq.${userAId},blocked_id.eq.${userBId}),and(blocker_id.eq.${userBId},blocked_id.eq.${userAId})`)
    .limit(1)
    .maybeSingle();
  if (error) console.error("isBlocked query failed:", error);
  return data !== null;
}

export async function createBlock(supabase: SupabaseClient, blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new Error("Cannot block yourself.");
  return supabase.from("blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
}

export interface ReportInput {
  reporterId: string;
  reportedUserId: string | null;
  contentType: string;
  contentId: string | null;
  reason: string;
}

export async function createReport(supabase: SupabaseClient, input: ReportInput) {
  return supabase.from("reports").insert({
    reporter_id: input.reporterId,
    reported_user_id: input.reportedUserId,
    content_type: input.contentType,
    content_id: input.contentId,
    reason: input.reason,
  });
}
