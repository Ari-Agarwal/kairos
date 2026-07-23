import { createHash } from "crypto";

// Free, keyless equivalent of Supabase Auth's "Leaked Password Protection"
// (a Pro-plan-only toggle) -- checks a password against HaveIBeenPwned's
// Pwned Passwords API using k-anonymity: only the first 5 chars of the
// SHA-1 hash ever leave the server, never the password or the full hash.
// See https://haveibeenpwned.com/API/v3#PwnedPasswords
export async function isPasswordPwned(password: string): Promise<{ pwned: boolean; count: number }> {
  const sha1 = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      // Don't let a slow HIBP response hang signup indefinitely.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`pwned-password-check: HIBP returned ${res.status}, failing open`);
      return { pwned: false, count: 0 };
    }
    const body = await res.text();
    for (const line of body.split("\n")) {
      const [hashSuffix, countStr] = line.trim().split(":");
      if (hashSuffix === suffix) {
        return { pwned: true, count: parseInt(countStr, 10) || 0 };
      }
    }
    return { pwned: false, count: 0 };
  } catch (err) {
    // Fail open: never block a legitimate signup because HIBP is down/unreachable.
    console.error("pwned-password-check: request failed, failing open", err);
    return { pwned: false, count: 0 };
  }
}
