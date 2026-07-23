import { NextResponse } from "next/server";
import { isTrustedOrigin } from "@/lib/origin-check";
import { isPasswordPwned } from "@/lib/pwned-password-check";

// App-level equivalent of Supabase Auth's Pro-only "Leaked Password Protection".
// Called by the client right before supabase.auth.signUp() / updateUser({password})
// so we can reject known-compromised passwords for free, without a Supabase
// dashboard toggle that requires the Pro plan.
export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }
  // Bound input size before hashing -- no legitimate password is anywhere
  // near this long, and it keeps the request cheap to hash.
  if (password.length > 512) {
    return NextResponse.json({ error: "Password is too long." }, { status: 400 });
  }

  const { pwned } = await isPasswordPwned(password);
  return NextResponse.json({ pwned });
}
