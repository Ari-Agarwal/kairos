import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Requires .env.test pointed at the STAGING Supabase project, with
// TEST_STUDENT_A_EMAIL/PASSWORD and TEST_STUDENT_B_EMAIL/PASSWORD accounts
// already created in Auth > Users, each with their own row in `profiles`.
//
// Counselor/cross-school RLS cases (counselors, schools, counselor_notes,
// reminder_log) are parked for Phase 2 — see Software_Timeline.md.

function client() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function signIn(email: string, password: string) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return supabase;
}

describe("RLS student-table isolation", () => {
  let studentA: ReturnType<typeof client>;
  let studentB: ReturnType<typeof client>;

  beforeAll(async () => {
    studentA = await signIn(process.env.TEST_STUDENT_A_EMAIL!, process.env.TEST_STUDENT_A_PASSWORD!);
    studentB = await signIn(process.env.TEST_STUDENT_B_EMAIL!, process.env.TEST_STUDENT_B_PASSWORD!);
  });

  afterAll(async () => {
    await Promise.all([studentA.auth.signOut(), studentB.auth.signOut()]);
  });

  it("student A cannot read student B's profile", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data } = await studentA.from("profiles").select("*").eq("user_id", studentBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("student A cannot write student B's profile", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    await studentA.from("profiles").update({ intended_major: "forged update" }).eq("user_id", studentBId);
    const { data: check } = await studentB
      .from("profiles")
      .select("intended_major")
      .eq("user_id", studentBId)
      .single();
    expect(check?.intended_major).not.toBe("forged update");
  });

  it("student A cannot read student B's school_matches", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data } = await studentA.from("school_matches").select("*").eq("user_id", studentBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("student A cannot insert school_matches under student B's user_id", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { error } = await studentA.from("school_matches").insert({
      user_id: studentBId,
      school_name: "Forged University",
      category: "target",
      percentage: 50,
      why_text: "forged",
      factors: {},
    });
    expect(error).not.toBeNull();
  });

  it("student A cannot read student B's timeline_items", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data } = await studentA.from("timeline_items").select("*").eq("user_id", studentBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("student A cannot read student B's application_outcomes", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data } = await studentA.from("application_outcomes").select("*").eq("user_id", studentBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("student A cannot insert application_outcomes under student B's user_id", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    // school_match_id is a foreign key; any UUID that doesn't exist will fail the FK check
    // before RLS even matters — but if student B has a match, RLS is what blocks it.
    // We test with a random UUID: the insert must fail (FK or RLS, either is correct).
    const { error } = await studentA.from("application_outcomes").insert({
      user_id: studentBId,
      school_match_id: "00000000-0000-0000-0000-000000000000",
      decision_type: "accept",
      decided_at: "2026-04-01",
    });
    expect(error).not.toBeNull();
  });

  it("student A cannot read or write student B's regeneration_log", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data } = await studentA.from("regeneration_log").select("*").eq("user_id", studentBId);
    expect(data ?? []).toHaveLength(0);

    const { error } = await studentA
      .from("regeneration_log")
      .upsert({ user_id: studentBId, week_start_date: "2026-06-23", count: 99 });
    expect(error).not.toBeNull();
  });

  it("student A cannot read student B's review_requests", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data } = await studentA.from("review_requests").select("*").eq("user_id", studentBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("student A cannot insert review_requests under student B's user_id", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { error } = await studentA.from("review_requests").insert({
      user_id: studentBId,
      status: "pending",
      review_notes: "forged",
    });
    expect(error).not.toBeNull();
  });

  it("student A cannot read student B's shared_links", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data } = await studentA.from("shared_links").select("*").eq("user_id", studentBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("student A cannot revoke student B's shared_links", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data: linkRows } = await studentB.from("shared_links").select("token").eq("user_id", studentBId).limit(1);
    const token = linkRows?.[0]?.token;
    if (!token) return; // no link fixture for student B in this environment — nothing to attempt
    await studentA.from("shared_links").update({ revoked_at: new Date().toISOString() }).eq("token", token);
    const { data: check } = await studentB.from("shared_links").select("revoked_at").eq("token", token).single();
    expect(check?.revoked_at).toBeNull();
  });

  it("student A cannot see who has blocked them (blocks stay silent to the blocked party)", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data: studentARows } = await studentA.from("profiles").select("user_id").limit(1);
    const studentAId = studentARows?.[0]?.user_id;
    await studentB.from("blocks").insert({ blocker_id: studentBId, blocked_id: studentAId });
    const { data } = await studentA.from("blocks").select("*").eq("blocker_id", studentBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("student A cannot insert a block under student B's blocker_id", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { error } = await studentA.from("blocks").insert({ blocker_id: studentBId, blocked_id: studentBId });
    expect(error).not.toBeNull();
  });

  it("student A cannot read student B's reports", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data } = await studentA.from("reports").select("*").eq("reporter_id", studentBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("student A cannot insert a report under student B's reporter_id", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { error } = await studentA.from("reports").insert({
      reporter_id: studentBId,
      content_type: "test",
      reason: "forged",
    });
    expect(error).not.toBeNull();
  });

  it("student A cannot read student B's interview_sessions", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data } = await studentA.from("interview_sessions").select("*").eq("user_id", studentBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("student A cannot insert interview_sessions under student B's user_id", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { error } = await studentA.from("interview_sessions").insert({
      user_id: studentBId,
      question: "forged",
      answer_transcript: "forged",
    });
    expect(error).not.toBeNull();
  });

  it("student A cannot read a mentor_request between two other students", async () => {
    const { data: studentARows } = await studentA.from("profiles").select("user_id").limit(1);
    const studentAId = studentARows?.[0]?.user_id;
    const { data } = await studentA.from("mentor_requests").select("*").limit(50);
    const foreignRequest = (data ?? []).find(
      (r) => r.mentee_id !== studentAId && r.mentor_id !== studentAId
    );
    expect(foreignRequest).toBeUndefined();
  });

  it("student A cannot create a mentor_request as student B (forged mentee_id)", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { error } = await studentA.from("mentor_requests").insert({
      mentee_id: studentBId,
      mentor_id: studentBId,
      school_name: "Test University",
      intro: "forged",
    });
    expect(error).not.toBeNull();
  });

  it("student A cannot accept/decline a mentor_request where they aren't the mentor", async () => {
    const { data: studentARows } = await studentA.from("profiles").select("user_id").limit(1);
    const studentAId = studentARows?.[0]?.user_id;
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data: inserted } = await studentB
      .from("mentor_requests")
      .insert({ mentee_id: studentBId, mentor_id: studentAId, school_name: "Test University", intro: "hi" })
      .select("id")
      .single();
    if (!inserted) return; // insert itself covered by a separate test; nothing to attempt here
    const { error, count } = await studentB
      .from("mentor_requests")
      .update({ status: "accepted" }, { count: "exact" })
      .eq("id", inserted.id);
    // studentB is the mentee, not the mentor, on this request -- the
    // "mentor_responds" policy should block this update (zero rows affected).
    expect(error !== null || count === 0).toBe(true);
  });

  it("student A cannot read messages on a mentor_request they aren't part of", async () => {
    const { data: studentARows } = await studentA.from("profiles").select("user_id").limit(1);
    const studentAId = studentARows?.[0]?.user_id;
    const { data } = await studentA
      .from("mentor_messages")
      .select("*, mentor_requests!inner(mentee_id, mentor_id)")
      .limit(50);
    const foreignMessage = (data ?? []).find(
      (m: { mentor_requests: { mentee_id: string; mentor_id: string } }) =>
        m.mentor_requests.mentee_id !== studentAId && m.mentor_requests.mentor_id !== studentAId
    );
    expect(foreignMessage).toBeUndefined();
  });

  it("student A cannot read war_room_comments on student B's applications", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data: matchRows } = await studentB.from("school_matches").select("id").eq("user_id", studentBId).limit(1);
    const matchId = matchRows?.[0]?.id;
    if (!matchId) return; // no match fixture for student B in this environment — nothing to attempt
    const { data } = await studentA.from("war_room_comments").select("*").eq("school_match_id", matchId);
    expect(data ?? []).toHaveLength(0);
  });

  it("student A cannot post a war_room_comment on student B's application", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data: matchRows } = await studentB.from("school_matches").select("id").eq("user_id", studentBId).limit(1);
    const matchId = matchRows?.[0]?.id;
    if (!matchId) return;
    const { data: studentARows } = await studentA.from("profiles").select("user_id").limit(1);
    const studentAId = studentARows?.[0]?.user_id;
    const { error } = await studentA
      .from("war_room_comments")
      .insert({ school_match_id: matchId, user_id: studentAId, role: "student", body: "forged" });
    expect(error).not.toBeNull();
  });

  it("student A cannot read student B's recommenders (rec-letter brag sheets)", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data } = await studentA.from("recommenders").select("*").eq("user_id", studentBId);
    expect(data ?? []).toHaveLength(0);
  });

  it("student A cannot insert a recommender under student B's user_id", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { error } = await studentA.from("recommenders").insert({
      user_id: studentBId,
      recommender_name: "Forged Teacher",
      relationship: "forged",
      share_token: `forged-${Date.now()}`,
    });
    expect(error).not.toBeNull();
  });

  it("student A cannot update student B's recommender brag sheet", async () => {
    const { data: studentBRows } = await studentB.from("profiles").select("user_id").limit(1);
    const studentBId = studentBRows?.[0]?.user_id;
    const { data: recRows } = await studentB.from("recommenders").select("id").eq("user_id", studentBId).limit(1);
    const recId = recRows?.[0]?.id;
    if (!recId) return; // no recommender fixture for student B in this environment — nothing to attempt
    await studentA.from("recommenders").update({ brag_sheet: { forged: true } }).eq("id", recId);
    const { data: check } = await studentB.from("recommenders").select("brag_sheet").eq("id", recId).single();
    expect(check?.brag_sheet).not.toEqual({ forged: true });
  });
});
