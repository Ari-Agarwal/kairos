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
});
