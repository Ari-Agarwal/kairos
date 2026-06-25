"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function FactorCard({
  label,
  text,
  width,
  missing,
  index,
}: {
  label: string;
  text: string;
  width: number;
  missing: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay: index * 0.08 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <p className="text-text font-medium text-sm mb-3">{label}</p>
      <div className="w-full h-2.5 rounded-full bg-bg border border-border mb-3 overflow-hidden">
        {!missing && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.15 + index * 0.08 }}
            className="h-full bg-primary rounded-full"
          />
        )}
      </div>
      <p className="text-text-gray text-sm leading-relaxed">{text}</p>
      {missing && (
        <Link href="/profile?edit=true" className="text-primary text-xs hover:text-primary-hover mt-2 inline-block">
          Add this to your profile →
        </Link>
      )}
    </motion.div>
  );
}
