"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const ROWS = [
  { label: "Profile and timeline", free: true, premium: true },
  { label: "School match list", free: true, premium: true },
  { label: "Tailored advice", free: true, premium: true },
  { label: "Regenerations", free: "3/week", premium: "Unlimited" },
  { label: "Career path explorer", free: false, premium: true },
  { label: "Essay feedback", free: false, premium: true },
];

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span className="text-text-gray text-sm">{value}</span>;
  return value ? <span className="text-green">✓</span> : <span className="text-text-gray">—</span>;
}

export default function UpgradeClient({ isPremium }: { isPremium: boolean }) {
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(plan: "monthly" | "yearly") {
    setLoadingPlan(plan);
    setError(null);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      setError("Couldn't start checkout. Please try again.");
      setLoadingPlan(null);
      return;
    }
    const { url } = await res.json();
    window.location.href = url;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full"
    >
      <h1 className="font-serif text-2xl text-text mb-3">Free vs Premium</h1>
      <p className="text-text-gray text-sm leading-relaxed mb-8">
        Telos&apos;s free tier is built to be genuinely useful on its own, profile, timeline, and a
        real school list, because access shouldn&apos;t depend on what you can afford. Premium adds
        deeper, more personal guidance for students who want to go further.
      </p>

      {isPremium ? (
        <div className="bg-premium-tint border border-border rounded-2xl p-6 text-center">
          <p className="text-premium font-medium">You&apos;re on Premium. Thanks for supporting Telos.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => handleCheckout("monthly")}
              disabled={loadingPlan !== null}
              className="flex-1 rounded-xl bg-premium hover:opacity-90 transition-opacity text-bg font-medium py-3 disabled:opacity-50"
            >
              {loadingPlan === "monthly" ? "Redirecting..." : "$12/month"}
            </button>
            <button
              onClick={() => handleCheckout("yearly")}
              disabled={loadingPlan !== null}
              className="flex-1 rounded-xl border border-premium text-premium hover:bg-premium-tint transition-colors font-medium py-3 disabled:opacity-50 relative"
            >
              {loadingPlan === "yearly" ? "Redirecting..." : "$120/year"}
              <span className="block text-[10px]">Saves $24</span>
            </button>
          </div>
          {error && <p className="text-red text-sm mb-6">{error}</p>}
        </>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-3 px-5 py-3 border-b border-border text-text-gray text-xs font-medium">
          <span>Feature</span>
          <span className="text-center">Free</span>
          <span className="text-center">Premium</span>
        </div>
        {ROWS.map((row, i) => (
          <motion.div
            key={row.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: EASE, delay: 0.1 + i * 0.04 }}
            className="grid grid-cols-3 px-5 py-3 border-b border-border last:border-b-0"
          >
            <span className="text-text text-sm">{row.label}</span>
            <span className="text-center"><Cell value={row.free} /></span>
            <span className="text-center"><Cell value={row.premium} /></span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
