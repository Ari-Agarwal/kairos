// CSRF guard for cookie-authenticated state-changing routes: reject requests
// whose Origin doesn't match our own host (browsers always send Origin on
// cross-site fetch/XHR; same-site requests pass through).
export function isTrustedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin navigations/non-browser clients omit it
  const allowed = [process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"].filter(Boolean);
  return allowed.some((a) => origin === a);
}
