// CSRF guard for cookie-authenticated state-changing routes: reject requests
// whose Origin doesn't match our own host (browsers always send Origin on
// cross-site fetch/XHR; same-site requests pass through).
//
// Compares against the request's own Host header rather than only a fixed
// NEXT_PUBLIC_SITE_URL, so this doesn't need updating (and can't silently
// start rejecting every request) whenever the app is served from a Vercel
// preview URL, a custom domain, or a www/bare-domain variant that doesn't
// byte-match whatever NEXT_PUBLIC_SITE_URL happens to be set to.
export function isTrustedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin navigations/non-browser clients omit it
  const host = req.headers.get("host");
  const allowed = [process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"].filter(Boolean);
  if (allowed.some((a) => origin === a)) return true;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
