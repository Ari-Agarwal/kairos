import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kairosadmissions.vercel.app";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/profile", "/matches", "/timeline", "/essay-feedback", "/counselor", "/api"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
