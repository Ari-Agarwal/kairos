import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

// In Expo Go this resolves to an exp:// URL; in dev/production builds it
// uses the "kairosadmissions" scheme from app.json. Whichever form it takes,
// it must be listed in the Supabase dashboard's auth redirect allowlist
// (Software_Timeline.md, Phase 2 post-approval bullet) or Supabase will
// bounce the callback to the site URL instead of back into the app.
const redirectTo = AuthSession.makeRedirectUri();

export interface AuthResult {
  error: string | null;
  cancelled?: boolean;
}

// Same Google provider the web app's "Continue with Google" uses
// (src/app/login/page.tsx), just with the authorize page opened in an
// in-app browser session and the callback deep-linked back to us.
export async function signInWithGoogle(): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    return { error: error?.message ?? "Could not start Google sign-in." };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return { error: null, cancelled: true };
  return createSessionFromUrl(result.url);
}

async function createSessionFromUrl(url: string): Promise<AuthResult> {
  // react-native-url-polyfill is loaded by src/lib/supabase.ts.
  const parsed = new URL(url);
  const errorDescription = parsed.searchParams.get("error_description");
  if (errorDescription) return { error: errorDescription };

  const code = parsed.searchParams.get("code");
  if (!code) return { error: "Sign-in callback was missing its auth code." };

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return { error: error ? error.message : null };
}

export function appleSignInAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync();
}

// Native Sign in with Apple -> Supabase id-token exchange. Requires the
// Apple provider to be enabled in the Supabase dashboard with the app's
// bundle ID (com.kairosadmissions.app) as an authorized client ID.
export async function signInWithApple(): Promise<AuthResult> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "ERR_REQUEST_CANCELED") return { error: null, cancelled: true };
    return { error: err.message ?? "Apple sign-in failed." };
  }

  if (!credential.identityToken) {
    return { error: "Apple sign-in returned no identity token." };
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
  });
  return { error: error ? error.message : null };
}
