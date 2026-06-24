"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (!data.session) {
      setConfirmationSent(true);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  async function handleOAuth(provider: "google" | "azure") {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  if (confirmationSent) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-serif text-3xl text-text mb-6">Metam</h1>
          <div className="bg-card border border-border rounded-2xl p-6">
            <p className="text-text font-medium mb-2">Check your email</p>
            <p className="text-text-gray text-sm leading-relaxed">
              We sent a confirmation link to <span className="text-text">{email}</span>. Click
              it to activate your account, then log in below.
            </p>
          </div>
          <p className="text-center text-text-gray text-sm mt-4">
            Already confirmed?{" "}
            <Link href="/login" className="text-primary hover:text-primary-hover">
              Log in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl text-text mb-6 text-center">Metam</h1>
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-text-gray mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-red text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium py-2.5 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-text-gray text-xs">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-2">
          <button
            onClick={() => handleOAuth("google")}
            className="w-full rounded-xl border border-border text-text hover:bg-card transition-colors font-medium py-2.5"
          >
            Continue with Google
          </button>
          <button
            onClick={() => handleOAuth("azure")}
            className="w-full rounded-xl border border-border text-text hover:bg-card transition-colors font-medium py-2.5"
          >
            Continue with Microsoft
          </button>
        </div>

        <p className="text-center text-text-gray text-sm mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:text-primary-hover">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
