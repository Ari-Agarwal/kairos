"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;
const CAP = 92;
const TAU_MS = 12000; // time constant -- ~92% reached around 30s, matching real generation time

// Simulated progress: no real progress events exist for these AI calls (which
// now take 20-30s+ with extended thinking), so we approach a cap on a
// realistic time-based curve rather than a static spinner.
export default function GenerationProgress() {
  const [pct, setPct] = useState(4);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setPct(CAP * (1 - Math.exp(-elapsed / TAU_MS)));
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto mt-5">
      <div className="h-6 rounded-lg bg-bg border border-border overflow-hidden">
        <motion.div
          className="h-full rounded-lg bg-primary"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25, ease: EASE }}
        />
      </div>
    </div>
  );
}
