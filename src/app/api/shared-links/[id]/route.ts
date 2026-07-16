import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTrustedOrigin } from "@/lib/origin-check";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: token } = await params;

  // RLS ensures only the owning student can update their own rows.
  const { data, error } = await supabase
    .from("shared_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", token)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Link not found." }, { status: 404 });

  return NextResponse.json({ link: data });
}
