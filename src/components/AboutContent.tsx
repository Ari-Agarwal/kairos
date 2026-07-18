import Link from "next/link";
import { User } from "lucide-react";

const STATS = [
  { value: "400,000+", label: "academically strong students who fail to enroll in any college each year" },
  { value: "200,000+", label: "more who enroll in schools well below what their record supports" },
  { value: "$4,000–$12,000", label: "typical cost of a private admissions consultant package" },
  { value: "$0", label: "cost to start with Kairos" },
];

export function AboutContent({ showLogo }: { showLogo: boolean }) {
  return (
    <div className="px-5 md:px-8 py-12 max-w-2xl mx-auto w-full">
      {showLogo && (
        <Link href="/" className="font-serif text-lg text-primary">
          Kairos
        </Link>
      )}
      <h1 className={`font-serif text-3xl text-text mb-4 ${showLogo ? "mt-6" : ""}`}>Our mission</h1>
      <p className="font-serif text-xl text-text mb-8 leading-relaxed">
        Every student deserves the caliber of college guidance today only wealthy families can
        afford. Kairos gives every student a real, data-backed read on where they stand and
        where they could go, for free.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-10">
        {STATS.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl px-5 py-5">
            <p className="font-serif text-2xl text-text mb-1">{s.value}</p>
            <p className="text-text-gray text-xs leading-relaxed">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4 text-text-gray text-sm leading-relaxed">
        <p>
          Each year, an estimated 400,000 academically strong students from low-income
          backgrounds don&apos;t enroll in any college, and another 200,000 enroll in schools
          well below what their academic record supports. Researchers call this
          &quot;undermatching,&quot; and studies of admissions outcomes find it shows up
          consistently, not as an isolated exception.
        </p>
        <p>
          Matching a student to the right school takes real analysis: grades, coursework,
          and extracurriculars checked against actual admissions outcomes, then an honest
          read on where that student stands relative to each school. Private admissions
          consultants do this analysis for a living, usually for $4,000–$12,000 per package,
          with hourly rates between $300 and $600 (sometimes up to $1,000/hour).
        </p>
        <p>
          Kairos runs the same analysis, using a student&apos;s actual profile and real
          admissions data to generate a school list, a personalized timeline, and essay
          feedback. It&apos;s free to start.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 flex items-start gap-4 mb-2">
        <div className="shrink-0 w-16 h-16 rounded-full bg-secondary-tint border border-border flex items-center justify-center overflow-hidden">
          {/* Placeholder — swap for the real headshot, e.g.:
              <img src="/ari-headshot.jpg" alt="Ari Agarwal" className="w-full h-full object-cover" /> */}
          <User className="w-7 h-7 text-text-gray" />
        </div>
        <div>
          <p className="text-text font-medium text-sm">Ari Agarwal</p>
          <p className="text-text-gray text-xs mb-2">Founder, Kairos</p>
          <p className="text-text-gray text-sm leading-relaxed">
            {/* Draft copy — replace with your own. */}
            I started Kairos after watching students around me with strong grades and test
            scores get no real guidance on where that could actually take them. I wanted to
            build the tool I wished existed: honest, data-backed, and free to start.
          </p>
        </div>
      </div>

      {showLogo && (
        <div className="mt-10 flex gap-4 text-xs text-text-gray">
          <Link href="/terms" className="hover:text-text">Terms</Link>
          <Link href="/privacy" className="hover:text-text">Privacy</Link>
        </div>
      )}
    </div>
  );
}
