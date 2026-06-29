import Link from "next/link";

const STATS = [
  { value: "400,000+", label: "academically strong students who fail to enroll in any college each year" },
  { value: "200,000+", label: "more who enroll in schools well below what their record supports" },
  { value: "$4,000–$12,000", label: "typical cost of a private admissions consultant package" },
  { value: "$0", label: "cost to start with Telos" },
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
          Telos
        </Link>
      )}
      <h1 className={`font-serif text-3xl text-text mb-2 ${showLogo ? "mt-6" : ""}`}>Our mission</h1>
      <p className="font-serif text-xl text-primary mb-8">
        {studentCount.toLocaleString()} students helped so far
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
          backgrounds fail to enroll in any college, while another 200,000 enroll in
          institutions well below what their academic records would otherwise support.
          Researchers refer to this as &quot;undermatching.&quot; It is not an isolated
          anomaly but a structural pattern, one that recurs predictably among capable
          students year after year.
        </p>
        <p>
          The cause is straightforward. Matching a student to the right institution requires
          genuine analysis: an evaluation of grades, coursework, and extracurricular record
          against real admissions outcomes, followed by an honest account of where that
          student actually stands. This analysis is neither rare nor unusual, but it is
          expensive. Private admissions consultants typically charge between $4,000 and
          $12,000 for a comprehensive package, with hourly consultations ranging from $300 to
          $600, and in some cases reaching $1,000 per hour. In other words, the students who
          need this guidance the most are the students who can afford it the least.
        </p>
        <p>
          Telos was built to sever that connection between cost and access. It performs the
          same quality of analysis, weighing a student&apos;s actual profile against real
          admissions patterns, and returns a list of schools that reflects genuine potential
          rather than guesswork. It is free to start, on the idea that clarity about
          one&apos;s future should never be a privilege reserved for those who can pay for it.
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
