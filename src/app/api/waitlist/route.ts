import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError, requireString, rejectScriptTags } from "@/lib/validate";
import { sendWaitlistConfirmation, sendReferralMilestoneEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9()\-.\s]{7,20}$/;
const REF_CODE_RE = /^[A-Za-z0-9]{4,20}$/;
const REF_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const SPOTS_PER_REFERRAL = 10; // docs/Launch_Plan.md §3.5's queue-jump reward

function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < 7; i++) {
    code += REF_CODE_ALPHABET[Math.floor(Math.random() * REF_CODE_ALPHABET.length)];
  }
  return code;
}

// Effective position = signup-order rank, minus 10 spots per confirmed referral —
// otherwise a referrer's rank never moves (rank-by-created_at is fixed once set),
// which would make the "you moved up" framing/email literally false.
async function computePosition(
  service: SupabaseClient,
  createdAt: string,
  referralCode: string | null
): Promise<number | null> {
  const { count: rawRank } = await service
    .from("waitlist_signups")
    .select("id", { count: "exact", head: true })
    .lte("created_at", createdAt);
  if (rawRank === null) return null;

  let referralCount = 0;
  if (referralCode) {
    const { count } = await service
      .from("waitlist_signups")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", referralCode);
    referralCount = count ?? 0;
  }

  return Math.max(1, rawRank - SPOTS_PER_REFERRAL * referralCount);
}

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = createServiceClient();

  // No authenticated user for a public signup — rate-limit by client IP instead.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(service, `waitlist:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const b = body as Record<string, unknown>;

    if (b.contact_type !== "email" && b.contact_type !== "phone") {
      return NextResponse.json({ error: "contact_type must be email or phone." }, { status: 400 });
    }
    const contact_type = b.contact_type;

    const rawContact = requireString(b.contact, "contact", 254);
    rejectScriptTags(rawContact, "contact");
    const contact = rawContact.trim().toLowerCase();

    if (contact_type === "email" && !EMAIL_RE.test(contact)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (contact_type === "phone" && !PHONE_RE.test(contact)) {
      return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
    }

    let source: string | null = null;
    if (b.source !== undefined && b.source !== null && b.source !== "") {
      source = requireString(b.source, "source", 60);
      rejectScriptTags(source, "source");
    }

    let referred_by: string | null = null;
    let referrer: { contact: string; contact_type: string; created_at: string } | null = null;
    if (b.ref !== undefined && b.ref !== null && b.ref !== "") {
      const rawRef = requireString(b.ref, "ref", 20).toUpperCase();
      // Only credit a referral if the code actually belongs to an existing signup.
      if (REF_CODE_RE.test(rawRef)) {
        const { data } = await service
          .from("waitlist_signups")
          .select("referral_code, contact, contact_type, created_at")
          .eq("referral_code", rawRef)
          .maybeSingle();
        if (data) {
          referred_by = data.referral_code;
          referrer = data;
        }
      }
    }

    // Retry on the rare referral_code collision (7 chars, 33-symbol alphabet).
    let insertedId: string | null = null;
    let alreadySignedUp = false;
    for (let attempt = 0; attempt < 5 && !insertedId && !alreadySignedUp; attempt++) {
      const { data, error } = await service
        .from("waitlist_signups")
        .insert({ contact, contact_type, source, referred_by, referral_code: generateReferralCode() })
        .select("id")
        .single();

      if (!error) {
        insertedId = data.id;
        break;
      }
      if (error.code === "23505") {
        // Could be the (contact_type, contact) unique index (repeat signup) or a
        // referral_code collision — only the former should short-circuit as success.
        const { data: existing } = await service
          .from("waitlist_signups")
          .select("id")
          .eq("contact_type", contact_type)
          .eq("contact", contact)
          .maybeSingle();
        if (existing) {
          alreadySignedUp = true;
          break;
        }
        continue; // referral_code collision — retry with a fresh code
      }
      return NextResponse.json({ error: "Could not save signup." }, { status: 500 });
    }

    if (alreadySignedUp) {
      return NextResponse.json({ ok: true, already_signed_up: true });
    }
    if (!insertedId) {
      return NextResponse.json({ error: "Could not save signup." }, { status: 500 });
    }

    const { data: inserted } = await service
      .from("waitlist_signups")
      .select("referral_code, created_at")
      .eq("id", insertedId)
      .single();

    const position = inserted
      ? await computePosition(service, inserted.created_at, inserted.referral_code)
      : null;

    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // Email delivery failures shouldn't fail the signup itself — log and move on.
    if (contact_type === "email" && inserted?.referral_code && position !== null) {
      const referralLink = `${origin}/notify/join?ref=${inserted.referral_code}`;
      sendWaitlistConfirmation(contact, position, referralLink).catch((err) =>
        console.error("waitlist confirmation email failed:", err)
      );
    }

    if (referrer && referrer.contact_type === "email") {
      const referrerPosition = await computePosition(service, referrer.created_at, referred_by);
      if (referrerPosition !== null) {
        const referrerLink = `${origin}/notify/join?ref=${referred_by}`;
        sendReferralMilestoneEmail(referrer.contact, referrerPosition, referrerLink).catch((err) =>
          console.error("referral milestone email failed:", err)
        );
      }
    }

    return NextResponse.json({
      ok: true,
      referral_code: inserted?.referral_code ?? null,
      position,
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
