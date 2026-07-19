"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

const EASE = [0.16, 1, 0.3, 1] as const;

// Approved Jul 17 (Software_Timeline.md) but never actually wired up: a
// slide-fade transition between major screens. template.tsx (unlike
// layout.tsx) remounts on every navigation, so keying on pathname gives each
// route its own enter animation with no extra plumbing. MotionConfig in
// layout.tsx (reducedMotion="user") makes this automatically inert for
// prefers-reduced-motion users -- no separate check needed here.
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      className="flex-1 flex flex-col"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
