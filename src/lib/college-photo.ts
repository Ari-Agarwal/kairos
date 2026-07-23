import { createServiceClient } from "@/lib/supabase/server";

// Wikipedia REST API (free, no key, no billing account) -- researched Jul 17
// as the recommended source over Google Places Photos (real option, but
// $7/1,000 requests) and generic stock photo APIs (not the actual named
// school). Virtually every 4-year US college/university has a Wikipedia page
// with an infobox photo, covering close to the same population College
// Scorecard already covers.
const WIKI_API_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary";
const WIKI_MEDIA_BASE = "https://en.wikipedia.org/api/rest_v1/page/media-list";
const WIKI_SEARCH_BASE = "https://en.wikipedia.org/w/api.php";
// Required by Wikipedia's API usage policy -- unauthenticated/anonymous
// User-Agents are more aggressively rate-limited and can be blocked outright.
const USER_AGENT = "Kairos-College-Guidance/1.0 (https://kairosadmissions.com; contact via app)";
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days -- campus photos essentially never change

export interface CollegePhoto {
  imageUrl: string;
  width: number | null;
  height: number | null;
  attributionText: string; // e.g. "Photo via Wikipedia"
  attributionUrl: string; // link back to the Wikipedia page, per CC-BY-SA attribution requirements
}

function bareName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Same "don't trust a loose match" guard as College Scorecard's namesMatch --
// a generically-named school could resolve to an unrelated Wikipedia page.
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

// The summary endpoint needs a close-to-exact title -- for a school name that
// doesn't resolve directly (e.g. missing "University of" ordering), fall back
// to Wikipedia's own search to find the best-matching real title before
// giving up.
async function searchBestTitle(schoolName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "opensearch",
    search: schoolName,
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

interface WikiMediaItem {
  type?: string;
  title?: string;
  srcset?: { src: string; scale?: string }[];
  original?: { source: string; width: number; height: number };
}

// Second, distinct image from the same Wikipedia page -- the "campus vibe"
// slot. Pulled from the page's media list (all images on the page, not just
// the infobox one) and filtered down to real photos: skip icons/logos/maps/
// seals and skip whichever file is already used as the primary photo.
async function fetchSecondaryFromWikipedia(title: string, primaryImageUrl: string): Promise<WikiMediaItem | null> {
  const res = await fetch(`${WIKI_MEDIA_BASE}/${encodeURIComponent(title)}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const items: WikiMediaItem[] = Array.isArray(data?.items) ? data.items : [];

  const primaryFile = decodeURIComponent(primaryImageUrl.split("/").pop() ?? "");
  const SKIP_PATTERN = /(logo|icon|seal|crest|coat.?of.?arms|\.svg$|locator|map)/i;

  for (const item of items) {
    if (item.type !== "image") continue;
    const fileName = item.title?.replace(/^File:/, "") ?? "";
    if (!fileName || SKIP_PATTERN.test(fileName)) continue;
    if (decodeURIComponent(fileName) === primaryFile) continue;
    const src = item.original?.source ?? item.srcset?.[item.srcset.length - 1]?.src;
    if (!src) continue;
    return {
      title: item.title,
      original: item.original ?? { source: src.startsWith("http") ? src : `https:${src}`, width: 0, height: 0 },
    };
  }
  return null;
}

async function fetchFromWikipedia(schoolName: string): Promise<{ primary: CollegePhoto; secondary: CollegePhoto | null } | null> {
  let summary = await fetchSummary(schoolName);

  if (!summary || summary.type === "disambiguation" || (!summary.thumbnail && !summary.originalimage)) {
    const bestTitle = await searchBestTitle(schoolName);
    if (bestTitle && bestTitle !== schoolName) {
      summary = await fetchSummary(bestTitle);
    }
  }

  if (!summary || summary.type === "disambiguation") return null;
  if (!summary.title || !namesMatch(schoolName, summary.title)) return null;

  const image = summary.originalimage ?? summary.thumbnail;
  if (!image) return null;

  const attributionUrl = summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title)}`;

  const primary: CollegePhoto = {
    imageUrl: image.source,
    width: image.width ?? null,
    height: image.height ?? null,
    attributionText: `Photo via Wikipedia`,
    attributionUrl,
  };

  let secondary: CollegePhoto | null = null;
  try {
    const secondaryItem = await fetchSecondaryFromWikipedia(summary.title, image.source);
    if (secondaryItem?.original) {
      secondary = {
        imageUrl: secondaryItem.original.source,
        width: secondaryItem.original.width || null,
        height: secondaryItem.original.height || null,
        attributionText: `Photo via Wikipedia`,
        attributionUrl,
      };
    }
  } catch (err) {
    console.error("Wikipedia secondary college photo lookup failed:", err);
  }

  return { primary, secondary };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function rowToPhoto(row: {
  image_url: string; width: number | null; height: number | null; attribution_text: string; attribution_url: string;
}): CollegePhoto {
  return {
    imageUrl: row.image_url,
    width: row.width,
    height: row.height,
    attributionText: row.attribution_text,
    attributionUrl: row.attribution_url,
  };
}

export interface CollegePhotoResult {
  primary: CollegePhoto | null;
  // "Campus vibe" secondary image, when a second distinct usable photo exists
  // on the same Wikipedia page. null (never fabricated) when there isn't one.
  secondary: CollegePhoto | null;
}

// Cached in Supabase (same pattern as getCollegeStats) -- keyed by normalized
// school name, shared across all students, so we don't re-hit Wikipedia on
// every page view. Returns null both when there's genuinely no usable photo
// and when the lookup fails -- callers should just omit the photo either way.
export async function getCollegePhoto(schoolName: string): Promise<CollegePhoto | null> {
  const result = await getCollegePhotos(schoolName);
  return result.primary;
}

// Full result including the secondary "campus vibe" slot (Section 1 backlog).
export async function getCollegePhotos(schoolName: string): Promise<CollegePhotoResult> {
  const key = normalizeName(schoolName);
  const supabase = createServiceClient();

  const { data: cached, error: cachedError } = await supabase
    .from("college_photo_cache")
    .select("*")
    .eq("school_name", key)
    .maybeSingle();

  if (cachedError) console.error("getCollegePhoto cache query failed:", cachedError);

  const isFresh = cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS;
  if (isFresh) {
    return {
      primary: cached.found ? rowToPhoto(cached) : null,
      secondary: cached.found && cached.secondary_image_url
        ? rowToPhoto({
            image_url: cached.secondary_image_url,
            width: cached.secondary_width,
            height: cached.secondary_height,
            attribution_text: cached.attribution_text,
            attribution_url: cached.attribution_url,
          })
        : null,
    };
  }

  let fetched: { primary: CollegePhoto; secondary: CollegePhoto | null } | null = null;
  try {
    fetched = await fetchFromWikipedia(schoolName);
  } catch (err) {
    console.error("Wikipedia college photo lookup failed:", err);
    if (cached) {
      return {
        primary: cached.found ? rowToPhoto(cached) : null,
        secondary: cached.found && cached.secondary_image_url
          ? rowToPhoto({
              image_url: cached.secondary_image_url,
              width: cached.secondary_width,
              height: cached.secondary_height,
              attribution_text: cached.attribution_text,
              attribution_url: cached.attribution_url,
            })
          : null,
      };
    }
    return { primary: null, secondary: null };
  }

  await supabase.from("college_photo_cache").upsert({
    school_name: key,
    image_url: fetched?.primary.imageUrl ?? null,
    width: fetched?.primary.width ?? null,
    height: fetched?.primary.height ?? null,
    attribution_text: fetched?.primary.attributionText ?? null,
    attribution_url: fetched?.primary.attributionUrl ?? null,
    secondary_image_url: fetched?.secondary?.imageUrl ?? null,
    secondary_width: fetched?.secondary?.width ?? null,
    secondary_height: fetched?.secondary?.height ?? null,
    found: fetched !== null,
    fetched_at: new Date().toISOString(),
  });

  return { primary: fetched?.primary ?? null, secondary: fetched?.secondary ?? null };
}
