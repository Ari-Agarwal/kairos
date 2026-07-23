"use client";

import { useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline (?) explainer for a non-obvious mechanic. Keyboard-focusable and
 * click-toggleable, not hover-only, so it works for touch and keyboard users.
 * Keep `text` to 1-3 short sentences.
 */
export default function InfoTooltip({
  text,
  label = "More info",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={wrapperRef}
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center size-4 rounded-full text-text-gray hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
      >
        <Info className="size-3.5" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-xl border border-border bg-card px-3 py-2 text-xs leading-relaxed text-text-gray shadow-md"
        >
          {text}
        </span>
      )}
    </span>
  );
}
