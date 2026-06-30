"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "azure" | null>(null);

  function showError(message: string) {
    setError(message);
    setErrorKey((k) => k + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      showError(error.message);
      return;
    }
    if (data.user) {
      const { data: counselor } = await supabase
        .from("counselors")
        .select("counselor_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (counselor) {
        router.push("/counselor");
        router.refresh();
        return;
      }
      await supabase
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("user_id", data.user.id);
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleOAuth(provider: "google" | "azure") {
    setError(null);
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setOauthLoading(null);
      showError(error.message);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <Link href="/" className="block text-center mb-6">
          <h1 className="font-serif text-3xl text-text">Telos</h1>
        </Link>
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-text-gray mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary transition-colors"
            />
          </div>
          {error && (
            <p key={errorKey} role="alert" className="text-red text-sm animate-auth-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium py-2.5 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Log In"}
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
            disabled={oauthLoading !== null}
            className="w-full rounded-xl border border-border text-text hover:bg-card transition-colors font-medium py-2.5 disabled:opacity-50"
          >
            {oauthLoading === "google" ? "Redirecting..." : "Continue with Google"}
          </button>
          <button
            onClick={() => handleOAuth("azure")}
            disabled={oauthLoading !== null}
            className="w-full rounded-xl border border-border text-text hover:bg-card transition-colors font-medium py-2.5 disabled:opacity-50"
          >
            {oauthLoading === "azure" ? "Redirecting..." : "Continue with Microsoft"}
          </button>
        </div>

        <p className="text-center text-text-gray text-sm mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:text-primary-hover">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
