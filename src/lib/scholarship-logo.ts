import { createServiceClient } from "@/lib/supabase/server";

// Mirrors lib/college-photo.ts's Wikipedia-summary approach exactly (same
// free/no-key rationale, same "reject a loose match" verification), applied
// to scholarship sponsor organizations instead of schools -- most named
// sponsors (Coca-Cola Scholars Foundation, QuestBridge, FBLA, DECA,
// YoungArts, PDK, etc.) have a Wikipedia page with an infobox logo/image.
const WIKI_API_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKI_SEARCH_BASE = "https://en.wikipedia.org/w/api.php";
const USER_AGENT = "Kairos-College-Guidance/1.0 (https://kairosadmissions.com; contact via app)";
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days -- an org's logo essentially never changes

export interface ScholarshipLogo {
  imageUrl: string;
  width: number | null;
  height: number | null;
  attributionText: string;
  attributionUrl: string;
}

function bareName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesMatch(query: string, result: string): boolean {
  const q = bareName(query);
  const r = bareName(result);
  return q === r || q.includes(r) || r.includes(q);
}

interface WikiSummary {
  type?: string;
  title?: string;
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
  content_urls?: { desktop?: { page?: string } };
}

async function fetchSummary(title: string): Promise<WikiSummary | null> {
  const res = await fetch(`${WIKI_API_BASE}/${encodeURIComponent(title)}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

async function searchBestTitle(organizationName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "opensearch",
    search: organizationName,
    limit: "1",
    namespace: "0",
    format: "json",
  });
  const res = await fetch(`${WIKI_SEARCH_BASE}?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const title = data?.[1]?.[0];
  return typeof title === "string" ? title : null;
}

async function fetchFromWikipedia(organizationName: string): Promise<ScholarshipLogo | null> {
  let summary = await fetchSummary(organizationName);

  if (!summary || summary.type === "disambiguation" || (!summary.thumbnail && !summary.originalimage)) {
    const bestTitle = await searchBestTitle(organizationName);
    if (bestTitle && bestTitle !== organizationName) {
      summary = await fetchSummary(bestTitle);
    }
  }

  if (!summary || summary.type === "disambiguation") return null;
  if (!summary.title || !namesMatch(organizationName, summary.title)) return null;

  const image = summary.thumbnail ?? summary.originalimage;
  if (!image) return null;

  return {
    imageUrl: image.source,
    width: image.width ?? null,
    height: image.height ?? null,
    attributionText: "Logo via Wikipedia",
    attributionUrl: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title)}`,
  };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// Cached in Supabase (same pattern as getCollegePhoto), keyed by normalized
// organization name, shared across all students. Returns null both when
// there's genuinely no usable logo and when the lookup fails -- callers
// should just omit the logo either way, never block on it.
export async function getScholarshipLogo(organizationName: string): Promise<ScholarshipLogo | null> {
  const key = normalizeName(organizationName);
  const supabase = createServiceClient();

  const { data: cached, error: cachedError } = await supabase
    .from("scholarship_logo_cache")
    .select("*")
    .eq("organization_name", key)
    .maybeSingle();

  if (cachedError) console.error("getScholarshipLogo cache query failed:", cachedError);

  const isFresh = cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS;
  if (isFresh) {
    return cached.found
      ? {
          imageUrl: cached.image_url,
          width: cached.width,
          height: cached.height,
          attributionText: cached.attribution_text,
          attributionUrl: cached.attribution_url,
        }
      : null;
  }

  let logo: ScholarshipLogo | null = null;
  try {
    logo = await fetchFromWikipedia(organizationName);
  } catch (err) {
    console.error("Wikipedia scholarship logo lookup failed:", err);
    if (cached) {
      return cached.found
        ? {
            imageUrl: cached.image_url,
            width: cached.width,
            height: cached.height,
            attributionText: cached.attribution_text,
            attributionUrl: cached.attribution_url,
          }
        : null;
    }
    return null;
  }

  await supabase.from("scholarship_logo_cache").upsert({
    organization_name: key,
    image_url: logo?.imageUrl ?? null,
    width: logo?.width ?? null,
    height: logo?.height ?? null,
    attribution_text: logo?.attributionText ?? null,
    attribution_url: logo?.attributionUrl ?? null,
    found: logo !== null,
    fetched_at: new Date().toISOString(),
  });

  return logo;
}
