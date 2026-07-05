"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const EASE_OUT_CUBIC = (t: number) => 1 - Math.pow(1 - t, 3);

export default function CountUp({
  value,
  suffix = "",
  duration = 0.8,
  className,
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const start = performance.now();
    const from = 0;
    function tick(now: number) {
      const elapsed = (now - start) / 1000;
      const t = Math.min(elapsed / duration, 1);
      setDisplay(Math.round(from + (value - from) * EASE_OUT_CUBIC(t)));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration, reduceMotion]);

  return (
    <span className={className}>
      {reduceMotion ? value : display}
      {suffix}
    </span>
  );
}
