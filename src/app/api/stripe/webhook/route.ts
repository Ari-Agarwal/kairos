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
        const { data } = await supabase.auth.admin.listUsers();
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
        const { data } = await supabase.auth.admin.listUsers();
        const match = data.users.find((u: { id: string; email?: string }) => u.email === email);
        if (match) {
          await supabase.from("profiles").update({ subscription_tier: "free" }).eq("user_id", match.id);
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
