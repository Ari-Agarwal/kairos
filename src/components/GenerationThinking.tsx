"use client";

// Section 1 "Showcase / demo polish": visual proof of AI "thinking" during
// generation. No real backend signal exists for these calls, so this is a
// client-side rotating sequence of what the model is plausibly weighing --
// purely cosmetic, tied to the generation's actual (unknown) duration via a
// fixed interval rather than any real progress event. Gated behind
// `motion-reduce:` per the Section 1 restraint check: reduced-motion users
// still get the text changes (they're informational, not decorative), just
// without the fade transition.

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const DEFAULT_MESSAGES = [
  "Checking deadlines...",
  "Weighing your interests...",
  "Cross-referencing scholarships...",
  "Sizing up admit odds...",
  "Lining up next steps...",
];

const ROTATE_MS = 2200;

export const MATCHES_THINKING = [
  "Checking your GPA and test scores...",
  "Weighing your intended major...",
  "Cross-referencing admit rates...",
  "Balancing reach, target, and safety...",
  "Factoring in your budget and location...",
];

export const TIMELINE_THINKING = [
  "Checking application deadlines...",
  "Weighing your grade level and pace...",
  "Cross-referencing test dates...",
  "Sequencing essays and recommendations...",
  "Lining up financial aid dates...",
];

export const NARRATIVE_THINKING = [
  "Reading back through your activities...",
  "Weighing your strongest throughline...",
  "Cross-referencing your career goals...",
  "Looking for what makes you, you...",
];

export default function GenerationThinking({
  messages = DEFAULT_MESSAGES,
  className = "text-text-gray text-sm",
}: {
  messages?: string[];
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % messages.length);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className={`${className} min-h-[1.5em]`} role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {messages[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
