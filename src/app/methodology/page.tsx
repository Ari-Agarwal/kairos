export const metadata = { title: "How Odds Work — Kairos" };

export default function MethodologyPage() {
  return (
    <div className="px-5 md:px-8 py-12 max-w-2xl mx-auto w-full">
      <h1 className="font-serif text-3xl text-text mb-2">How odds are calculated</h1>
      <p className="text-text-gray text-sm mb-8">What actually drives your reach / target / safety labels and the percentage shown on each card.</p>

      <div className="space-y-8 text-text-gray text-sm leading-relaxed">

        <section>
          <h2 className="text-text font-medium mb-2">The honest summary</h2>
          <p>
            Your odds number is an <span className="text-text">AI judgment call</span> — not a formula,
            not a statistical model trained on admissions outcomes, and not a score produced by a proprietary
            algorithm. We use Claude (Anthropic&apos;s AI) with a detailed prompt that instructs it to
            reason through your profile the way an experienced college counselor would, step by step, using
            the same inputs a human counselor would rely on. The result is a best-estimate probability, not
            a guarantee and not a black-box output — the reasoning behind each school is visible in the
            factors panel when you tap a card.
          </p>
        </section>

        <section>
          <h2 className="text-text font-medium mb-2">What data goes in</h2>
          <p className="mb-3">Every field you filled in during onboarding is passed to the model when it evaluates a school. Specifically:</p>
          <ul className="space-y-2">
            <li>
              <span className="text-text">Unweighted GPA</span> — weighted most heavily as the standardized
              comparison point across schools. Weighted GPA is used only as a secondary signal of course rigor,
              not as the primary number.
            </li>
            <li>
              <span className="text-text">Standardized test scores</span> — SAT or ACT if you provided them.
              If you haven&apos;t tested yet, the model notes that and does not fabricate a score.
            </li>
            <li>
              <span className="text-text">Grade level</span> — affects how the timeline is generated and
              what milestones are surfaced; it also informs how much testing history to expect.
            </li>
            <li>
              <span className="text-text">Intended major</span> — used to adjust the baseline acceptance rate
              for programs that are separately competitive within a school (CS, nursing, business, engineering).
              A school that is a &ldquo;target&rdquo; overall can be a &ldquo;reach&rdquo; for a competitive
              major inside it.
            </li>
            <li>
              <span className="text-text">Extracurricular activities</span> — assessed for depth and duration,
              not raw count. A multi-year, escalating commitment reads as a stronger signal than a long list of
              one-time activities. Extracurriculars are treated as a tiebreaker among academically similar
              applicants, not a primary driver.
            </li>
            <li>
              <span className="text-text">Current school</span> — used to contextualize course rigor. Ten AP
              courses at a school that offers twelve reads differently from ten at a school that offers thirty.
            </li>
            <li>
              <span className="text-text">Schools you&apos;re already considering</span> — every named school
              is evaluated and, if it fits the right tier, guaranteed to appear in your list.
            </li>
            <li>
              <span className="text-text">Financial aid need and budget ceiling</span> — flagged in the
              why-text for schools worth checking early; never used to alter the percentage itself since
              Kairos holds no real per-school cost data.
            </li>
            <li>
              <span className="text-text">First-generation and legacy status</span> — noted in context where
              documented admissions practice supports it, but never fabricated as a guaranteed effect for any
              specific school.
            </li>
            <li>
              <span className="text-text">Campus size and setting preferences</span> — used to match schools
              to what you said you want, using each school&apos;s real campus profile.
            </li>
          </ul>
          <p className="mt-3">
            If a field is missing, the model is explicitly told which ones are absent and does not invent a value.
          </p>
        </section>

        <section>
          <h2 className="text-text font-medium mb-2">How the percentage is derived</h2>
          <p className="mb-3">The model follows a four-step procedure for every school, in order:</p>
          <ol className="space-y-3 list-none">
            <li>
              <span className="text-text">1. Establish the real baseline.</span> Start from the school&apos;s
              actual overall acceptance rate, then adjust for your intended major if that program is separately
              competitive. This major-adjusted rate is the true baseline, not the headline number.
            </li>
            <li>
              <span className="text-text">2. Compare your stats to the admitted range.</span> Your GPA and
              test scores are placed relative to the school&apos;s real middle-50% range. Being above the 75th
              percentile at a school admitting under ~20% overall is still &ldquo;competitive,&rdquo; not a
              guarantee — holistic factors decide most of those spots.
            </li>
            <li>
              <span className="text-text">3. Set a base probability from step 1 × step 2,</span> compressed
              at highly selective schools where even strong stats leave significant uncertainty.
            </li>
            <li>
              <span className="text-text">4. Apply small, bounded adjustments</span> for course rigor,
              extracurricular depth, and major fit — measured in a few percentage points, never a multiplier.
              These are explicitly bounded so that a strong EC profile can&apos;t turn a near-impossible admit
              into a likely one.
            </li>
          </ol>
          <p className="mt-3">
            The model is instructed not to default to conservative or rounded-looking numbers, because an
            overly cautious estimate discourages students from realistic reaches. It is also instructed to
            treat any school widely regarded as prestigious or highly-desired as significantly more selective
            than gut instinct might suggest — application volume has risen dramatically over the past decade
            and many familiar names have become far harder to get into than their reputations imply.
          </p>
        </section>

        <section>
          <h2 className="text-text font-medium mb-2">What reach / target / safety mean</h2>
          <ul className="space-y-2">
            <li>
              <span className="text-text bg-red-tint px-2 py-0.5 rounded-full text-xs mr-2">Reach</span>
              Your profile sits at or below this school&apos;s typical admitted range for your likely program,
              or the school is highly selective overall (roughly under 20% baseline) where even strong stats
              are not a guarantee — so much of the class is decided on holistic grounds.
            </li>
            <li>
              <span className="text-text bg-amber-tint px-2 py-0.5 rounded-full text-xs mr-2">Target</span>
              Your profile falls within this school&apos;s typical admitted range for your likely program — a
              realistic admit that is likely but not guaranteed.
            </li>
            <li>
              <span className="text-text bg-green-tint px-2 py-0.5 rounded-full text-xs mr-2">Safety</span>
              Your profile is comfortably above this school&apos;s typical admitted range, admission is very
              likely, and this is a school you would genuinely be glad to attend — not just one that is
              numerically easy to get into.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-text font-medium mb-2">What this is not</h2>
          <ul className="space-y-2">
            <li>
              It is not a statistical model trained on historical admissions outcomes from real applicants.
            </li>
            <li>
              It is not connected to any school&apos;s admissions office or Common App data.
            </li>
            <li>
              It does not have access to your essays, recommendations, or application materials.
            </li>
            <li>
              It cannot account for year-to-year shifts in a school&apos;s priorities or class-composition goals.
            </li>
          </ul>
          <p className="mt-3">
            The percentage on each card is a calibrated estimate, not a prediction with known accuracy.
            Use it to build a strategically balanced list and to prioritize where to invest time — not as
            a guarantee of any outcome.
          </p>
        </section>

        <section>
          <h2 className="text-text font-medium mb-2">Seeing the reasoning</h2>
          <p>
            Tap any school card to open the detail view. The five factor panels — GPA comparison, course
            rigor, extracurricular strength, major fit, and social fit — show the actual reasoning the model
            used for that school against your profile. If a field was missing from your profile, the relevant
            factor will say so explicitly rather than filling in a guess.
          </p>
        </section>

        <section>
          <h2 className="text-text font-medium mb-2">How scholarship &ldquo;fit&rdquo; tiers work</h2>
          <p>
            Unlike admissions odds above, a scholarship&apos;s Strong Fit / Possible / Reach label is{" "}
            <span className="text-text">not AI-generated</span> — it&apos;s a plain rule check against the same
            profile fields (first-generation status, financial aid need, intended major, ROTC-style
            extracurriculars) matched against each scholarship&apos;s stated eligibility text. Strong Fit means
            two or more of those factors clearly line up; Possible means exactly one does; Reach means
            nothing in your profile confirms eligibility — which is a statement about missing information,
            not a claim that you don&apos;t qualify. This rule-based approach never hides a scholarship outright,
            since a missed match costs real money in a way a false one doesn&apos;t; always confirm the real
            requirements on the scholarship&apos;s official page before assuming a tier either way.
          </p>
        </section>

        <section>
          <h2 className="text-text font-medium mb-2">Where school photos and scholarship logos come from</h2>
          <p>
            College photos on your match cards and school pages, and sponsor logos on scholarship cards, are
            both pulled from Wikipedia&apos;s public API — free, no paid image service involved. Each lookup is
            checked against the school or organization name before it&apos;s used (a loose or ambiguous match is
            rejected rather than shown), and results are cached for 90 days since neither a campus photo nor
            an organization&apos;s logo changes often. When no matching image exists on Wikipedia, a school card
            falls back to a plainly-styled initial letter (dashed border, dimmer fill) rather than something
            that could be mistaken for a real photo; a scholarship card with no matching logo simply omits it.
          </p>
        </section>

      </div>
    </div>
  );
}
