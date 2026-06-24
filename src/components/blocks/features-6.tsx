import Link from "next/link";
import { Target, CalendarClock, PenLine, Unlock } from "lucide-react";

const FEATURES = [
  {
    icon: Target,
    title: "Matches",
    description: "A real list of reach, target, and safety schools, built from your actual profile.",
    href: "/matches",
  },
  {
    icon: CalendarClock,
    title: "Timeline",
    description: "Every deadline and a clear sense of what to focus on next.",
    href: "/timeline",
  },
  {
    icon: PenLine,
    title: "Essay Feedback",
    description: "Direct, honest feedback on your drafts, not generic praise.",
    href: "/essay-feedback",
  },
  {
    icon: Unlock,
    title: "Free to Start",
    description: "Genuinely useful on its own, because access shouldn't depend on what you can afford.",
    href: "/upgrade",
  },
];

const PREVIEW_SCHOOLS = [
  { name: "Northeastern University", category: "target" as const, percentage: 47 },
  { name: "University of Michigan", category: "reach" as const, percentage: 28 },
  { name: "Rutgers University", category: "safety" as const, percentage: 81 },
];

const CATEGORY_STYLES: Record<string, string> = {
  reach: "bg-red-tint text-red",
  target: "bg-amber-tint text-amber-text-on-tint",
  safety: "bg-green-tint text-green",
};

export function Features({ activeMatchCount }: { activeMatchCount?: number }) {
  return (
    <section className="py-16 md:py-28">
      <div className="mx-auto max-w-5xl space-y-12 px-1">
        <div className="relative grid items-center gap-4 md:grid-cols-2 md:gap-12">
          <h2 className="font-serif text-4xl text-text">Everything in one place</h2>
          <p className="text-text-gray max-w-sm sm:ml-auto">
            Your matches, your timeline, and your feedback, all built around your actual
            profile and updated as you grow.
          </p>
        </div>

        <div className="relative rounded-3xl border border-border bg-card p-3 md:-mx-8 lg:col-span-3">
          <div className="rounded-2xl border border-border bg-bg p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <p className="text-text-gray text-xs">Built from your profile</p>
              <span className="text-text-gray text-xs">15 schools</span>
            </div>
            <div className="space-y-3">
              {PREVIEW_SCHOOLS.map((school) => (
                <div key={school.name} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div>
                    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mb-1.5 capitalize ${CATEGORY_STYLES[school.category]}`}>
                      {school.category}
                    </span>
                    <p className="font-serif text-sm text-text">{school.name}</p>
                  </div>
                  <span className="font-serif text-xl text-primary">{school.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description, href }) => (
            <Link key={title} href={href} className="space-y-3 group">
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-primary" />
                <h3 className="text-sm font-medium text-text group-hover:text-primary transition-colors">
                  {title}
                </h3>
              </div>
              <p className="text-text-gray text-sm leading-relaxed">
                {title === "Matches" && activeMatchCount !== undefined
                  ? `${activeMatchCount} active schools`
                  : description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
