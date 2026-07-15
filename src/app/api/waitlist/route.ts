import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError, requireString, rejectScriptTags } from "@/lib/validate";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9()\-.\s]{7,20}$/;
const GRAD_YEARS = ["freshman", "sophomore", "junior", "senior"] as const;

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

    let grad_year: string | null = null;
    if (b.grad_year !== undefined && b.grad_year !== null && b.grad_year !== "") {
      const gy = requireString(b.grad_year, "grad_year", 20).toLowerCase();
      if (!GRAD_YEARS.includes(gy as (typeof GRAD_YEARS)[number])) {
        return NextResponse.json({ error: "Invalid grad_year." }, { status: 400 });
      }
      grad_year = gy;
    }

    const sms_consent = contact_type === "phone" && b.sms_consent === true;

    let source: string | null = null;
    if (b.source !== undefined && b.source !== null && b.source !== "") {
      source = requireString(b.source, "source", 60);
      rejectScriptTags(source, "source");
    }

    const { error } = await service.from("waitlist_signups").insert({
      contact,
      contact_type,
      grad_year,
      sms_consent,
      source,
    });

    if (error) {
      // Unique index on (contact_type, contact) — treat a repeat signup as success.
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, already_signed_up: true });
      }
      return NextResponse.json({ error: "Could not save signup." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
