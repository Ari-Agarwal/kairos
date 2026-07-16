"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { CareerQuizArt } from "@/components/OnboardingIllustration";

// Deterministic (no LLM call) interest -> major mapper for students who
// picked "Undecided" -- Phase 3 Section 1's major/career exploration quiz.
// Roughly 30% of applicants are undecided per the timeline's competitive
// audit, and a blank text field gives them nothing to react to.
type Category = "STEM" | "Business" | "Humanities" | "Health" | "Arts" | "SocialScience";

const CATEGORY_MAJORS: Record<Category, string[]> = {
  STEM: ["Computer Science", "Engineering (general)", "Mathematics", "Physics"],
  Business: ["Business", "Economics", "Finance"],
  Humanities: ["English", "History", "Philosophy"],
  Health: ["Nursing", "Medicine / Pre-Med", "Public Health"],
  Arts: ["Visual/Performing Arts", "Journalism"],
  SocialScience: ["Psychology", "Political Science", "Sociology", "International Relations"],
};

const CATEGORY_LABELS: Record<Category, string> = {
  STEM: "STEM and applied problem-solving",
  Business: "Business, markets, and organizations",
  Humanities: "Reading, writing, and ideas",
  Health: "Health, care, and biology",
  Arts: "Creative and visual work",
  SocialScience: "People, society, and behavior",
};

interface Question {
  prompt: string;
  options: { label: string; categories: Category[] }[];
}

const QUESTIONS: Question[] = [
  {
    prompt: "What kind of problems energize you most?",
    options: [
      { label: "Figuring out how something works or building it from scratch", categories: ["STEM"] },
      { label: "Making a plan work with limited money or resources", categories: ["Business"] },
      { label: "Understanding why people believe or act the way they do", categories: ["SocialScience", "Humanities"] },
      { label: "Helping someone who's struggling, physically or otherwise", categories: ["Health"] },
      { label: "Making something that didn't exist before -- a piece, a design, a story", categories: ["Arts"] },
    ],
  },
  {
    prompt: "Pick a weekend project you'd actually enjoy.",
    options: [
      { label: "Building an app, robot, or experiment", categories: ["STEM"] },
      { label: "Running a small pop-up sale or side hustle", categories: ["Business"] },
      { label: "Writing something long-form -- an essay, a story, a blog", categories: ["Humanities"] },
      { label: "Volunteering at a clinic, shelter, or hospital", categories: ["Health"] },
      { label: "Painting, filming, designing, or performing", categories: ["Arts"] },
    ],
  },
  {
    prompt: "How do you prefer to work?",
    options: [
      { label: "Alone, digging deep into a hard technical problem", categories: ["STEM"] },
      { label: "On a team, moving fast toward a shared goal", categories: ["Business"] },
      { label: "One-on-one, actually helping a specific person", categories: ["Health"] },
      { label: "Independently, expressing something in my own voice", categories: ["Arts", "Humanities"] },
    ],
  },
  {
    prompt: "What outcome matters most to you in a career?",
    options: [
      { label: "Solving hard, concrete problems", categories: ["STEM"] },
      { label: "Building something and growing it", categories: ["Business"] },
      { label: "Directly improving someone's wellbeing", categories: ["Health"] },
      { label: "Shaping how people think or how society works", categories: ["SocialScience", "Humanities"] },
      { label: "Making something people connect with emotionally", categories: ["Arts"] },
    ],
  },
  {
    prompt: "Which subject do (or did) you enjoy most in school?",
    options: [
      { label: "Math or science", categories: ["STEM"] },
      { label: "Economics or a business/entrepreneurship class", categories: ["Business"] },
      { label: "English, history, or philosophy", categories: ["Humanities"] },
      { label: "Biology, health, or psychology", categories: ["Health", "SocialScience"] },
      { label: "Art, music, theater, or journalism", categories: ["Arts"] },
    ],
  },
];

export default function CareerQuiz({
  onClose,
  onSelectMajor,
}: {
  onClose: () => void;
  onSelectMajor: (major: string, rationale: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [tally, setTally] = useState<Record<Category, number>>({
    STEM: 0,
    Business: 0,
    Humanities: 0,
    Health: 0,
    Arts: 0,
    SocialScience: 0,
  });
  const [done, setDone] = useState(false);

  function answer(categories: Category[]) {
    setTally((prev) => {
      const next = { ...prev };
      categories.forEach((c) => {
        next[c] += 1;
      });
      return next;
    });
    if (step < QUESTIONS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setDone(true);
    }
  }

  const topCategory = (Object.entries(tally) as [Category, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const suggestions = topCategory ? CATEGORY_MAJORS[topCategory].slice(0, 3) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="career-quiz-title"
        className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl px-6 py-6 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-2">
          <h2 id="career-quiz-title" className="font-serif text-xl text-text">
            Not sure yet? Let&apos;s narrow it down.
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-text-gray hover:text-text shrink-0">
            <X className="size-5" />
          </button>
        </div>
        <div className="mb-3">
          <CareerQuizArt />
        </div>

        {!done ? (
          <>
            <p className="text-text-gray text-xs mb-3">
              Question {step + 1} of {QUESTIONS.length}
            </p>
            <p className="text-text text-sm mb-4">{QUESTIONS[step].prompt}</p>
            <div className="space-y-2">
              {QUESTIONS[step].options.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => answer(opt.categories)}
                  className="w-full text-left rounded-xl border border-border px-4 py-2.5 text-sm text-text hover:border-primary/60 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-text-gray text-sm mb-4 leading-relaxed">
              Your answers point most toward <span className="text-text">{CATEGORY_LABELS[topCategory]}</span>.
              These majors are a common fit -- pick one to use as your intended major, or keep exploring on
              your own. You can always change this later.
            </p>
            <div className="space-y-2 mb-4">
              {suggestions.map((major) => (
                <button
                  key={major}
                  type="button"
                  onClick={() =>
                    onSelectMajor(
                      major,
                      `Explored career interests via the onboarding quiz; leaned toward ${CATEGORY_LABELS[topCategory].toLowerCase()}.`
                    )
                  }
                  className="w-full text-left rounded-xl border border-border px-4 py-2.5 text-sm text-text hover:border-primary/60 transition-colors"
                >
                  {major}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-border text-text-gray hover:text-text py-2.5 text-sm"
            >
              Keep &quot;Undecided&quot; for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
