import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeInstance;
}

export const PRICE_IDS = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID!,
  yearly: process.env.STRIPE_ANNUAL_PRICE_ID!,
};
