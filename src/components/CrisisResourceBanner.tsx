"use client";

import { motion, useReducedMotion } from "framer-motion";

export interface CrisisResource {
  heading: string;
  message: string;
  lifeline: string;
  textline: string;
}

// Shared, calm, non-alarming crisis-resource banner for AI-facing surfaces
// (essay feedback/brainstorm, narrative builder, mock interview). Rendered
// ABOVE the normal AI response when the server detects crisis language via
// `containsCrisisLanguage` (src/lib/crisis-check.ts) -- never replaces the
// normal feature output. See Software_Timeline.md Section 12.
export function CrisisResourceBanner({ resource }: { resource: CrisisResource | null | undefined }) {
  const reduceMotion = useReducedMotion();
  if (!resource) return null;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mb-4 rounded-xl border border-[#DC4C3F]/30 bg-[#DC4C3F]/5 px-4 py-3 sm:px-5 sm:py-4"
      role="status"
    >
      <p className="font-serif text-sm font-semibold text-[#3C2A28] sm:text-base">{resource.heading}</p>
      <p className="mt-1 text-sm text-[#5A4442]">{resource.message}</p>
      <div className="mt-2 space-y-0.5 text-sm font-medium text-[#3C2A28]">
        <p>{resource.lifeline}</p>
        <p>{resource.textline}</p>
      </div>
    </motion.div>
  );
}
