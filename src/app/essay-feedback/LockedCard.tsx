"use client";

import { motion } from "framer-motion";

export default function LockedCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="bg-premium-tint border border-border rounded-2xl p-6 text-center"
    >
      {children}
    </motion.div>
  );
}
