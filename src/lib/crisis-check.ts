// Lightweight, conservative crisis-language detector for AI-facing surfaces
// (essay feedback/brainstorm, narrative builder, mock interview). This is
// intentionally NOT an ML classifier -- a short, hand-picked phrase list
// checked against the student's own raw input text, server-side, before/
// alongside the AI call. False negatives are expected and acceptable (this
// is a supportive nudge, not a safety-critical filter); the design goal is
// to keep false positives low so ordinary essay content about hardship
// ("I struggled," "it felt like giving up") doesn't trip it, while still
// catching clear, direct expressions of self-harm/suicidal ideation.
//
// This NEVER blocks or alters the AI response -- callers add the returned
// resource as an additional field alongside the normal output. See
// Software_Timeline.md Section 12 ("Crisis/mental-health safety net").

const CRISIS_PHRASES: string[] = [
  "kill myself",
  "killing myself",
  "want to die",
  "wish i was dead",
  "wish i were dead",
  "don't want to be alive",
  "do not want to be alive",
  "end my life",
  "ending my life",
  "suicide",
  "suicidal",
  "self harm",
  "self-harm",
  "hurt myself",
  "hurting myself",
  "cutting myself",
  "no reason to live",
  "better off dead",
  "not worth living",
  "can't go on",
  "cant go on",
];

// Word-boundary-ish matching on a lowercased string -- deliberately simple.
export function containsCrisisLanguage(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return CRISIS_PHRASES.some((phrase) => lower.includes(phrase));
}

export interface CrisisResource {
  heading: string;
  message: string;
  lifeline: string;
  textline: string;
}

// Tone matches the app's existing warm-not-corporate voice (e.g. the essay
// feedback disclaimer "Kairos helps you brainstorm and critique — you write
// the essay."). Calm, supportive, non-alarming -- surfaced ABOVE the normal
// AI output, never replacing it.
export function getCrisisResource(): CrisisResource {
  return {
    heading: "Before anything else",
    message:
      "Something in what you wrote sounds like it might be weighing on you more than an essay should. If things feel like too much right now, please reach out — you deserve support beyond what an app can give.",
    lifeline: "Call or text 988 — the Suicide & Crisis Lifeline (24/7, free, confidential).",
    textline: "Or text HOME to 741741 to reach the Crisis Text Line.",
  };
}
