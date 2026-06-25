// SCREEN 4 COMPLETE
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import NavShell from "@/components/NavShell";
import FactorCard from "./FactorCard";

const CATEGORY_STYLES: Record<string, string> = {
  reach: "bg-red-tint text-red",
  target: "bg-amber-tint text-amber-text-on-tint",
  safety: "bg-green-tint text-green",
};

const FACTOR_LABELS: Record<string, string> = {
  gpa_comparison: "GPA",
  course_rigor: "Course Rigor",
  ec_strength: "Extracurricular Strength",
  major_fit: "Major Fit",
};

function barWidth(text: string): number {
  const lower = text.toLowerCase();
  if (lower.includes("unavailable") || lower.includes("missing")) return 0;
  if (lower.includes("strong") || lower.includes("well above") || lower.includes("excellent")) return 90;
  if (lower.includes("moderate") || lower.includes("typical") || lower.includes("within")) return 60;
  if (lower.includes("limited") || lower.includes("below")) return 30;
  return 50;
}

export default async function BreakdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("school_matches")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!match) notFound();

  const factors = match.factors as Record<string, string>;

  return (
    <NavShell>
      <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
        <Link href="/matches" className="text-text-gray text-sm hover:text-text mb-4 inline-block">
          ← Back to matches
        </Link>

        <h1 className="font-serif text-2xl text-text mb-1">
          How we calculated {match.percentage}%
        </h1>
        <div className="flex items-center gap-2 mb-8">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${CATEGORY_STYLES[match.category]}`}>
            {match.category}
          </span>
          <span className="text-text-gray text-sm">{match.school_name}</span>
        </div>

        <div className="space-y-6">
          {Object.entries(FACTOR_LABELS).map(([key, label], i) => {
            const text = factors?.[key] ?? "Not available";
            const width = barWidth(text);
            const missing = width === 0;
            return (
              <FactorCard key={key} label={label} text={text} width={width} missing={missing} index={i} />
            );
          })}
        </div>
      </div>
    </NavShell>
  );
}
