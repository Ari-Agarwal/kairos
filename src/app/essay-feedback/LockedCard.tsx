"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function LockedCard({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-premium-tint border border-border rounded-2xl p-6 text-center"
    >
      {children}
    </motion.div>
  );
}
