"use client";

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
  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full"
    >
      <h1 className="font-serif text-2xl text-text mb-3">Plans</h1>
      <p className="text-text-gray text-sm leading-relaxed mb-8">
        Telos Free is built to be genuinely useful on its own — a real school list, a real
        timeline, and honest guidance — because access to this shouldn&apos;t depend on what you
        can afford. Premium adds deeper, more personal support for students who want to go further.
      </p>

      {isPremium ? (
        <div className="bg-premium-tint border border-border rounded-2xl p-6 text-center">
          <p className="text-premium font-medium">You&apos;re on Premium. Thanks for supporting Telos.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-6 text-center mb-8">
          <p className="text-text font-medium">Premium is on the way.</p>
          <p className="text-text-gray text-sm mt-1">
            We&apos;re putting the finishing touches on it. Everything in the free tier is
            yours in the meantime.
          </p>
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
            initial={{ opacity: 1 }}
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
