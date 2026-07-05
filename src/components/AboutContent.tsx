import Link from "next/link";

const STATS = [
  { value: "400,000+", label: "academically strong students who fail to enroll in any college each year" },
  { value: "200,000+", label: "more who enroll in schools well below what their record supports" },
  { value: "$4,000–$12,000", label: "typical cost of a private admissions consultant package" },
  { value: "$0", label: "cost to start with Kairos" },
];

export function AboutContent({
  studentCount,
  showLogo,
}: {
  studentCount: number;
  showLogo: boolean;
}) {
  return (
    <div className="px-5 md:px-8 py-12 max-w-2xl mx-auto w-full">
      {showLogo && (
        <Link href="/" className="font-serif text-lg text-primary">
          Kairos
        </Link>
      )}
      <h1 className={`font-serif text-3xl text-text mb-2 ${showLogo ? "mt-6" : ""}`}>Our mission</h1>
      <p className="font-serif text-xl text-primary mb-8">
        {studentCount.toLocaleString()} students matched so far
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

      {showLogo && (
        <div className="mt-10 flex gap-4 text-xs text-text-gray">
          <Link href="/terms" className="hover:text-text">Terms</Link>
          <Link href="/privacy" className="hover:text-text">Privacy</Link>
        </div>
      )}
    </div>
  );
}
