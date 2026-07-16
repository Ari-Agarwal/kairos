import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError, requireString, rejectScriptTags } from "@/lib/validate";

const BRAG_FIELDS = ["activities", "achievements", "anecdotes", "additional_context"] as const;
type BragField = (typeof BRAG_FIELDS)[number];

function validateBragSheet(raw: unknown): Record<BragField, string> {
  if (typeof raw !== "object" || raw === null) throw new ValidationError("brag_sheet must be an object.");
  const b = raw as Record<string, unknown>;
  const out: Partial<Record<BragField, string>> = {};
  for (const field of BRAG_FIELDS) {
    const v = b[field];
    if (v === undefined || v === null || v === "") {
      out[field] = "";
      continue;
    }
    if (typeof v !== "string") throw new ValidationError(`brag_sheet.${field} must be a string.`);
    if (v.length > 3000) throw new ValidationError(`brag_sheet.${field} must be 3000 characters or fewer.`);
    rejectScriptTags(v, `brag_sheet.${field}`);
    out[field] = v;
  }
  return out as Record<BragField, string>;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(supabase, `rec-patch:${user.id}`, 60, 60 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const b = body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if (b.recommender_name !== undefined) {
      const name = requireString(b.recommender_name, "recommender_name", 200);
      rejectScriptTags(name, "recommender_name");
      updates.recommender_name = name;
    }

    if (b.relationship !== undefined) {
      const rel = requireString(b.relationship, "relationship", 200);
      rejectScriptTags(rel, "relationship");
      updates.relationship = rel;
    }

    if (b.recommender_email !== undefined) {
      if (b.recommender_email === null || b.recommender_email === "") {
        updates.recommender_email = null;
      } else {
        const email = (b.recommender_email as string).trim();
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return NextResponse.json({ error: "recommender_email is not a valid email address." }, { status: 400 });
        }
        updates.recommender_email = email;
      }
    }

    if (b.status !== undefined) {
      if (!["requested", "reminded", "submitted"].includes(b.status as string)) {
        return NextResponse.json({ error: "status must be requested, reminded, or submitted." }, { status: 400 });
      }
      updates.status = b.status;
    }

    if (b.brag_sheet !== undefined) {
      updates.brag_sheet = validateBragSheet(b.brag_sheet);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("recommenders")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !data) return NextResponse.json({ error: "Recommender not found or update failed." }, { status: 404 });
    return NextResponse.json({ recommender: data });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("recommenders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
