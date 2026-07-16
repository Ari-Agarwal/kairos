"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

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

export default function UpgradeClient({
  isPremium,
  notifyRequested,
}: {
  isPremium: boolean;
  notifyRequested: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const supabase = createClient();
  const [notified, setNotified] = useState(notifyRequested);
  const [saving, setSaving] = useState(false);

  async function handleNotifyMe() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ premium_notify_requested: true })
        .eq("user_id", user.id);
    }
    setNotified(true);
    setSaving(false);
  }
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full"
    >
      <h1 className="font-serif text-2xl text-text mb-3">Plans</h1>
      <p className="text-text-gray text-sm leading-relaxed mb-8">
        Kairos Free is built to be genuinely useful on its own, a real school list, a real
        timeline, and honest guidance. Premium adds deeper, more personal support for students
        who want to go further.
      </p>

      {isPremium ? (
        <div className="bg-premium-tint border border-border rounded-2xl p-6 text-center">
          <p className="text-premium font-medium">You&apos;re on Premium. Thanks for supporting Kairos.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-6 text-center mb-8">
          <p className="text-text font-medium">Premium isn&apos;t open to new sign-ups yet.</p>
          <p className="text-text-gray text-sm mt-1 mb-4">
            We&apos;re rolling it out gradually. Everything in the free tier is yours in the
            meantime.
          </p>
          <button
            onClick={handleNotifyMe}
            disabled={notified || saving}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-5 py-2.5 text-sm disabled:opacity-60"
          >
            {notified ? "We'll notify you" : saving ? "Saving..." : "Notify me when ready"}
          </button>
        </div>
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
            initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: reduceMotion ? 0 : 0.15 + i * 0.05 }}
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
