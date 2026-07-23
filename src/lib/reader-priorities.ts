// Admissions-officer feedback substitute: aggregate "what this type of
// school's readers weigh" synthesis (Software_Timeline.md Section 1, item 4).
// This is deliberately static, hand-written content grounded in publicly
// documented patterns (Common Data Set Section C7 "relative importance of
// factors" reporting across many schools, and widely published admissions-
// office blog/webinar guidance) -- not a per-school AI call, and not a claim
// that any specific school's actual committee reviewed this student. Kept
// static rather than LLM-generated so there's no chance of it reading as
// more specific/authoritative than it is; the labeling in the UI makes the
// "general guidance, not this student's real reader" distinction explicit.
//
// Bucketed only by two axes that are both real, publicly known signals of
// how a school's process tends to work: overall selectivity (acceptance
// rate) and ownership (public vs. private) -- broad enough to stay honest
// (never implies knowledge of one specific school's actual committee
// weighting), specific enough to be more useful than one generic paragraph
// for every school.

export interface ReaderPriorityFactor {
  factor: string;
  note: string;
}

export interface ReaderPriorityGuidance {
  tierLabel: string;
  summary: string;
  factors: ReaderPriorityFactor[];
}

function selectivityTier(acceptanceRate: number | null): "highly_selective" | "selective" | "less_selective" | "unknown" {
  if (acceptanceRate === null) return "unknown";
  if (acceptanceRate < 0.2) return "highly_selective";
  if (acceptanceRate < 0.5) return "selective";
  return "less_selective";
}

export function getReaderPriorities(acceptanceRate: number | null, ownership: string | null): ReaderPriorityGuidance {
  const tier = selectivityTier(acceptanceRate);
  const isPublic = (ownership ?? "").toLowerCase().includes("public");

  if (tier === "highly_selective") {
    return {
      tierLabel: "Highly selective schools (roughly under 20% admit rate)",
      summary:
        "At this selectivity level, published Common Data Set reporting and admissions-office guidance consistently describe a fully holistic process: grades and course rigor clear the bar for most applicants, so essays, recommendations, extracurricular depth, and demonstrated fit typically do the real differentiating.",
      factors: [
        { factor: "Course rigor & grades", note: "Necessary but rarely sufficient on their own — most of the applicant pool already clears this bar." },
        { factor: "Essays & personal qualities", note: "Frequently cited as one of the most heavily weighted factors once academics are comparable across applicants." },
        { factor: "Recommendations", note: "Used to corroborate the academic and personal story the rest of the application tells." },
        { factor: "Extracurricular depth", note: "Sustained, specific involvement tends to matter more than a long, shallow activity list." },
        isPublic
          ? { factor: "Institutional/state priorities", note: "Public flagships often weigh in-state residency and specific program capacity alongside the above." }
          : { factor: "Demonstrated interest & fit", note: "Many private schools in this tier track engagement with the school as a real (if secondary) signal." },
      ],
    };
  }

  if (tier === "selective") {
    return {
      tierLabel: "Selective schools (roughly 20–50% admit rate)",
      summary:
        "Published guidance for this tier generally describes academics (grades and rigor) as the clear primary factor, with the rest of the application used to confirm fit and add context rather than to make a razor-thin differentiation.",
      factors: [
        { factor: "Grades & course rigor", note: "Typically the single most heavily weighted factor at this selectivity level." },
        { factor: "Test scores (if submitted)", note: "Where required or considered, generally treated as a secondary confirming signal, not the primary one." },
        { factor: "Extracurriculars & essays", note: "Used to round out the picture and catch strong applicants whose transcript alone undersells them." },
        { factor: "Major/program fit", note: "More likely to matter concretely here (some programs are separately competitive) than at less selective schools." },
      ],
    };
  }

  if (tier === "less_selective") {
    return {
      tierLabel: "Less selective schools (roughly 50%+ admit rate)",
      summary:
        "At this admit-rate level, published guidance and CDS reporting typically describe academics as the dominant factor, with a much lighter emphasis on the holistic, essay-driven review common at highly selective schools.",
      factors: [
        { factor: "GPA & course completion", note: "Usually the primary, often near-decisive factor." },
        { factor: "Standardized tests (if required)", note: "Used more as a threshold/placement signal than a differentiator." },
        { factor: "Essays & extracurriculars", note: "Still reviewed, but with less weight relative to academics than at more selective schools." },
      ],
    };
  }

  return {
    tierLabel: "General pattern across most schools",
    summary:
      "We don't have a verified acceptance rate for this school to tailor this further, but Common Data Set reporting across most U.S. colleges consistently ranks academic factors (grades, course rigor) above extracurricular and essay factors in stated importance, with the exact balance varying by how selective a given school actually is.",
    factors: [
      { factor: "Grades & course rigor", note: "The most consistently highly-weighted factor across published CDS data, regardless of selectivity." },
      { factor: "Essays & recommendations", note: "Weight varies significantly by school — generally more influential the more selective the school." },
      { factor: "Extracurricular involvement", note: "Widely reported as a real factor, more often a differentiator than a primary driver." },
    ],
  };
}
