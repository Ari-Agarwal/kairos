import Stripe from "stripe";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { POST } from "./route";

// Requires .env.test pointed at STAGING with STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
// set to TEST-MODE Stripe keys, and TEST_STUDENT_A_EMAIL seeded as a real auth user
// whose profiles.user_id we look up below. This hits the route handler in-process —
// no live server or `stripe listen` required.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const service = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let testUserId: string;

function signedRequest(payload: object) {
  const body = JSON.stringify(payload);
  const header = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: { "stripe-signature": header },
  });
}

function checkoutCompletedEvent(eventId: string, userId: string) {
  return {
    id: eventId,
    type: "checkout.session.completed",
    data: { object: { client_reference_id: userId } },
  };
}

async function resetTier() {
  await service.from("profiles").update({ subscription_tier: "free" }).eq("user_id", testUserId);
}

describe("Stripe webhook handler", () => {
  beforeAll(async () => {
    const { data, error } = await service.auth.admin.listUsers();
    if (error) throw error;
    const match = data.users.find((u) => u.email === process.env.TEST_STUDENT_A_EMAIL);
    if (!match) throw new Error("seed TEST_STUDENT_A_EMAIL as a real auth user before running this test");
    testUserId = match.id;
  });

  afterEach(async () => {
    await resetTier();
  });

  it("rejects a request with no signature header", async () => {
    const res = await POST(
      new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" })
    );
    expect(res.status).toBe(400);
  });

  it("rejects a forged/invalid signature", async () => {
    const res = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: "{}",
        headers: { "stripe-signature": "t=1,v1=forged" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("grants premium on checkout.session.completed", async () => {
    const res = await POST(signedRequest(checkoutCompletedEvent("evt_test_grant_1", testUserId)));
    expect(res.status).toBe(200);

    const { data } = await service.from("profiles").select("subscription_tier").eq("user_id", testUserId).single();
    expect(data?.subscription_tier).toBe("premium");
  });

  it("does not double-apply a replayed event (idempotency)", async () => {
    const event = checkoutCompletedEvent("evt_test_grant_2", testUserId);
    await POST(signedRequest(event));
    await POST(signedRequest(event));

    const { data } = await service.from("profiles").select("subscription_tier").eq("user_id", testUserId).single();
    // Documents current behavior: re-applying the same grant is harmless because the
    // operation is idempotent in effect (sets the same value twice), even though there
    // is no explicit processed-event-id guard yet. If a future event type has a
    // non-idempotent side effect (e.g. incrementing a counter), this test won't catch
    // it — that needs its own dedicated idempotency-guard test once one is added.
    expect(data?.subscription_tier).toBe("premium");
  });
});
