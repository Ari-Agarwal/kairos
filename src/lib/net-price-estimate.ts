import { createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, NET_PRICE_ESTIMATE_PROMPT, extractJson } from "@/lib/anthropic";
import { logAiUsage } from "@/lib/ai-usage-log";
import type { CollegeStats } from "@/lib/college-scorecard";

// Financial aid buildout, item 1 (Software_Timeline.md). Rough, AI-reasoned
// net price RANGE per school -- NOT a real per-school Net Price Calculator
// (no unified API for that exists), so this is explicitly a qualitative
// estimate, always shown with a disclaimer pointing to the school's own
// official NPC as the authoritative source.
//
// Cached the same way college_stats_cache / career_path_cache are: keyed by
// the INPUTS (school + income bracket + family size + state), never by
// student, since the estimate should be identical for any student sharing
// those inputs. This also means the estimate never touches or stores
// anything that identifies a specific student.
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days -- aid policy/sticker price shifts at most annually

export interface NetPriceEstimate {
  low: number;
  high: number;
  aidGenerosity: "low" | "moderate" | "high" | null;
  rationale: string;
  fetchedAt: string;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function cacheKey(schoolName: string, incomeBracket: string, familySize: number, state: string | null): string {
  return [normalize(schoolName), incomeBracket, String(familySize), state ? normalize(state) : "unknown"].join("::");
}

export async function getNetPriceEstimate(params: {
  userId: string;
  schoolName: string;
  incomeBracket: string;
  familySize: number;
  state: string | null;
  stats: CollegeStats | null;
}): Promise<NetPriceEstimate | null> {
  const { userId, schoolName, incomeBracket, familySize, state, stats } = params;
  const key = cacheKey(schoolName, incomeBracket, familySize, state);
  const supabase = createServiceClient();

  const { data: cached, error: cacheReadError } = await supabase
    .from("financial_aid_net_price_cache")
    .select("*")
    .eq("cache_key", key)
    .maybeSingle();
  if (cacheReadError) console.error("getNetPriceEstimate cache read failed:", cacheReadError);

  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) {
    return {
      low: cached.estimated_net_price_low,
      high: cached.estimated_net_price_high,
      aidGenerosity: cached.aid_generosity ?? null,
      rationale: cached.rationale,
      fetchedAt: cached.fetched_at,
    };
  }

  const userMessage = `School: ${schoolName}
Sticker cost of attendance: ${stats?.costOfAttendance ? `$${stats.costOfAttendance.toLocaleString()}/yr` : "not known"}
School-wide average net price after aid: ${stats?.avgNetPrice ? `$${stats.avgNetPrice.toLocaleString()}/yr` : "not known"}
Public/private: ${stats?.ownership ?? "not known"}
Family income bracket: ${incomeBracket}
Family size: ${familySize}
Family's home state: ${state ?? "not given"}`;

  const t0 = Date.now();
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 768,
      thinking: { type: "disabled" },
      system: NET_PRICE_ESTIMATE_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    logAiUsage("net-price-estimate", userId, MODEL, t0, response);
    if (response.stop_reason === "max_tokens") {
      throw new Error("Response truncated at max_tokens for net price estimate");
    }
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = extractJson<{
      estimated_net_price_low: number;
      estimated_net_price_high: number;
      aid_generosity?: "low" | "moderate" | "high";
      rationale: string;
    }>(text);

    const low = Math.max(0, Math.round(parsed.estimated_net_price_low));
    const high = Math.max(low, Math.round(parsed.estimated_net_price_high));
    const fetchedAt = new Date().toISOString();

    const { error: cacheWriteError } = await supabase.from("financial_aid_net_price_cache").upsert({
      cache_key: key,
      school_name: schoolName,
      income_bracket: incomeBracket,
      family_size: familySize,
      state,
      estimated_net_price_low: low,
      estimated_net_price_high: high,
      aid_generosity: parsed.aid_generosity ?? null,
      rationale: parsed.rationale,
      fetched_at: fetchedAt,
    });
    if (cacheWriteError) console.error("getNetPriceEstimate cache write failed:", cacheWriteError);

    return { low, high, aidGenerosity: parsed.aid_generosity ?? null, rationale: parsed.rationale, fetchedAt };
  } catch (err) {
    logAiUsage("net-price-estimate", userId, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    console.error("getNetPriceEstimate AI call failed:", err);
    // Fall back to stale cache rather than nothing, if we have it.
    if (cached) {
      return {
        low: cached.estimated_net_price_low,
        high: cached.estimated_net_price_high,
        aidGenerosity: cached.aid_generosity ?? null,
        rationale: cached.rationale,
        fetchedAt: cached.fetched_at,
      };
    }
    return null;
  }
}
