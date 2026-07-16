import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Idempotency: skip events we've already handled. Stripe can deliver the same
  // event more than once (retries on timeout/non-2xx). The handlers below are
  // idempotent on their own, but this avoids redundant work and is required for
  // any future non-idempotent handler.
  const { data: alreadyProcessed, error: alreadyProcessedError } = await supabase
    .from("processed_stripe_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();
  if (alreadyProcessedError) console.error("stripe webhook idempotency check failed:", alreadyProcessedError);
  if (alreadyProcessed) return NextResponse.json({ received: true, duplicate: true });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (userId) {
        await supabase.from("profiles").update({ subscription_tier: "premium" }).eq("user_id", userId);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customer = await getStripe().customers.retrieve(subscription.customer as string);
      const email = "deleted" in customer ? null : customer.email;
      if (email) {
        const { data, error: listUsersError } = await supabase.auth.admin.listUsers();
        if (listUsersError) console.error("stripe webhook listUsers failed:", listUsersError);
        const match = data.users.find((u: { id: string; email?: string }) => u.email === email);
        if (match) {
          await supabase.from("profiles").update({ subscription_tier: "free" }).eq("user_id", match.id);
        }
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customer = await getStripe().customers.retrieve(invoice.customer as string);
      const email = "deleted" in customer ? null : customer.email;
      if (email) {
        const { data, error: listUsersError2 } = await supabase.auth.admin.listUsers();
        if (listUsersError2) console.error("stripe webhook listUsers failed:", listUsersError2);
        const match = data.users.find((u: { id: string; email?: string }) => u.email === email);
        if (match) {
          await supabase.from("profiles").update({ subscription_tier: "free" }).eq("user_id", match.id);
        }
      }
      break;
    }
  }

  // Mark handled. ignoreDuplicates so a concurrent redelivery that raced past
  // the check above can't error here; the unique PK still guarantees one record.
  await supabase
    .from("processed_stripe_events")
    .upsert({ event_id: event.id, type: event.type }, { onConflict: "event_id", ignoreDuplicates: true });

  return NextResponse.json({ received: true });
}
