"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyAccentColor, isAccentColorId, ACCENT_COLOR_STORAGE_KEY, DEFAULT_ACCENT } from "@/lib/accent-color";

// Mounted once in the root layout. Applies the student's optional
// accent-color preference (Software_Timeline.md Section 15) app-wide via a
// data-accent attribute on <html>, which the palette overrides in
// globals.css key off of. Reads a cached value first (instant, no flash on
// repeat visits), then confirms against the real profile row in the
// background in case it changed on another device.
export default function AccentColorSync() {
  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(ACCENT_COLOR_STORAGE_KEY);
      if (isAccentColorId(cached)) {
        document.documentElement.setAttribute("data-accent", cached);
      }
    } catch {
      // ignore -- storage unavailable, background fetch below still applies it
    }

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("accent_color")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const value = isAccentColorId(data?.accent_color) ? data.accent_color : DEFAULT_ACCENT;
      applyAccentColor(value);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
