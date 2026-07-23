"use client";

import { useEffect, useRef, useState } from "react";
import { CrisisResourceBanner, type CrisisResource } from "@/components/CrisisResourceBanner";
import { HistoryEmptyArt } from "@/components/EmptyStateIllustration";

interface InterviewFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  one_line_summary: string;
  crisis_resource?: CrisisResource | null;
}

interface SessionHistoryEntry {
  id: string;
  question: string;
  score: number | null;
  summary: string | null;
  created_at: string;
}

const CATEGORIES = ["General", "Why This School", "Behavioral", "Extracurricular"] as const;
type Category = (typeof CATEGORIES)[number];

// Mirrors NarrativeBuilderClient's QUESTIONS keys/labels -- kept as a small
// local copy rather than a shared import so a strong interview answer can be
// routed to the question it best fits without coupling the two components.
const NARRATIVE_QUESTIONS = [
  { key: "moment", label: "A specific formative moment" },
  { key: "revealed", label: "What that moment revealed" },
  { key: "pattern", label: "Where that pattern shows up elsewhere" },
  { key: "struggle", label: "A struggle or setback" },
  { key: "differentiator", label: "What sets them apart" },
  { key: "direction", label: "Where they want to take this" },
] as const;

interface SpeechRecognitionResultLike {
  transcript: string;
}
interface SpeechRecognitionEventLike {
  results: { [index: number]: { [index: number]: SpeechRecognitionResultLike }; length: number };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function MockInterviewClient() {
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [showNarrativePicker, setShowNarrativePicker] = useState(false);
  const [narrativeQuestionKey, setNarrativeQuestionKey] = useState<(typeof NARRATIVE_QUESTIONS)[number]["key"]>(
    NARRATIVE_QUESTIONS[0].key
  );
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const processedResultCount = useRef(0);
  // Session-local audio/video review (Section 1 backlog): recorded with
  // MediaRecorder alongside the existing browser-only speech-to-text, kept
  // entirely client-side (object URL, never uploaded) so a student can
  // play back their own pacing/filler words next to the transcript. There's
  // no blob-storage backend wired up for this app, so this deliberately
  // stays session-local rather than inventing a new upload pipeline.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [recordingSupported, setRecordingSupported] = useState(false);
  const [recordingKind, setRecordingKind] = useState<"video" | "audio" | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("General");
  const [history, setHistory] = useState<SessionHistoryEntry[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // "New question" is the only regenerate action here -- shown once a
  // question is already displayed, so a student who felt the last one was
  // too generic/repetitive/off-topic can say so rather than just hoping the
  // next random pull is better.
  const [regenFeedback, setRegenFeedback] = useState("");
  const [showRegenField, setShowRegenField] = useState(false);

  async function toggleHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    setLoadingHistory(true);
    const res = await fetch("/api/interview/feedback");
    if (res.ok) {
      const data = await res.json();
      setHistory(data.sessions ?? []);
    } else {
      setHistory([]);
    }
    setLoadingHistory(false);
  }

  // Feature detection reads browser APIs, so it can't run during SSR/render
  // without a hydration mismatch (same constraint documented in
  // ProfileCompletenessModal.tsx) — gate it behind a mount-only effect
  // instead of a module-level `typeof window` constant.
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpeechSupported(getSpeechRecognition() !== null);
    setTtsSupported("speechSynthesis" in window);
    setRecordingSupported(
      typeof window !== "undefined" &&
        "MediaRecorder" in window &&
        !!navigator.mediaDevices?.getUserMedia
    );
  }, []);

  // Revoke the object URL on unmount / when a new recording replaces it, so
  // we don't leak the blob for the life of the tab.
  useEffect(() => {
    return () => {
      if (playbackUrl) URL.revokeObjectURL(playbackUrl);
    };
  }, [playbackUrl]);

  async function startRecording() {
    if (!recordingSupported) return;
    try {
      let stream: MediaStream;
      let kind: "video" | "audio" = "video";
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        // Camera denied/unavailable -- fall back to audio-only rather than
        // failing the whole review feature.
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        kind = "audio";
      }
      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: kind === "video" ? "video/webm" : "audio/webm" });
        setPlaybackUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      setRecordingKind(kind);
      recorder.start();
    } catch (err) {
      console.error("Mock interview recording failed to start:", err);
      setRecordingKind(null);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }

  async function getQuestion(feedbackForRegen?: string) {
    setLoadingQuestion(true);
    setError(null);
    setFeedback(null);
    setAnswer("");
    const res = await fetch("/api/interview/question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, regenFeedback: feedbackForRegen?.trim() || undefined }),
    });
    setLoadingQuestion(false);
    if (!res.ok) {
      setError("We hit a snag pulling up a question — try again in a moment.");
      return;
    }
    const data = await res.json();
    setQuestion(data.question);
    setRegenFeedback("");
    setShowRegenField(false);
    setPlaybackUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setRecordingKind(null);
    if (ttsSupported) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(data.question));
    }
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      stopRecording();
      setListening(false);
      return;
    }
    const recognition = getSpeechRecognition();
    if (!recognition) return;
    if (recordingSupported) startRecording();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    // Bug fix: this used to iterate e.results from index 0 on every event
    // and append the full reconstructed text to the existing answer each
    // time -- since e.results accumulates across the whole session, already
    // appended text got re-appended on every subsequent result, duplicating
    // the transcript. Track how many results have already been consumed and
    // only append the genuinely new ones.
    processedResultCount.current = 0;
    recognition.onresult = (e) => {
      let newText = "";
      for (let i = processedResultCount.current; i < e.results.length; i++) {
        newText += e.results[i][0].transcript + " ";
      }
      processedResultCount.current = e.results.length;
      if (newText.trim()) setAnswer((prev) => (prev ? prev + " " : "") + newText.trim());
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function submitAnswer() {
    if (!question || !answer.trim()) return;
    setLoadingFeedback(true);
    setError(null);
    const res = await fetch("/api/interview/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, category }),
    });
    setLoadingFeedback(false);
    if (!res.ok) {
      setError("We hit a snag scoring your answer — try again in a moment.");
      return;
    }
    setFeedback(await res.json());
    setHistory(null);
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="font-serif text-2xl text-text">Mock Interview</h1>
        <button
          onClick={toggleHistory}
          className="rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium px-3 py-1.5 transition-colors shrink-0"
        >
          {showHistory ? "Hide History" : "History"}
        </button>
      </div>
      <p className="text-text-gray text-sm mb-2 leading-relaxed">
        Practice answering a real admissions interview question out loud, then get direct feedback.
      </p>
      <p className="text-text-gray text-xs mb-2 leading-relaxed">
        Your voice is converted to text entirely in your browser — audio is never sent to or stored
        on our servers, only the text you see below.{!speechSupported && " Voice input isn't supported in this browser; type your answer instead."}
        {recordingSupported && " If you allow camera/mic access, we'll also keep a recording for you to play back — it stays on your device for this session only and is never uploaded."}
      </p>
      <p className="text-text-gray text-xs mb-6 leading-relaxed">
        Questions and feedback are AI-generated (sent to our AI provider, Anthropic) — a starting point for practice, not a verdict on a real interview.
      </p>

      {showHistory && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 space-y-2">
          {loadingHistory ? (
            <p className="text-text-gray text-sm">Loading history…</p>
          ) : !history || history.length === 0 ? (
            <div className="text-center py-2">
              <HistoryEmptyArt />
              <p className="text-text-gray text-sm mt-1">No past sessions yet.</p>
            </div>
          ) : (
            history.map((h) => (
              <div key={h.id} className="rounded-xl border border-border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-text text-sm truncate">{h.question}</p>
                  {h.score !== null && (
                    <span className="text-text-gray text-xs font-medium shrink-0">{h.score}/10</span>
                  )}
                </div>
                <p className="text-text-gray text-xs">
                  {new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {!question && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  category === c ? "bg-primary text-bg border-primary" : "border-border text-text-gray hover:text-text"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={() => getQuestion()}
            disabled={loadingQuestion}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-4 py-2.5 disabled:opacity-50"
          >
            {loadingQuestion ? <span role="status" aria-live="polite">Loading…</span> : "Start mock interview"}
          </button>
        </>
      )}

      {question && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <p className="text-text-gray text-xs mb-1">Question</p>
          <p className="font-serif text-lg text-text mb-4">{question}</p>

          <label htmlFor="interview-answer" className="block text-sm text-text-gray mb-1">Your answer</label>
          <textarea
            id="interview-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            placeholder={speechSupported ? "Speak or type your answer…" : "Type your answer…"}
            className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary text-sm mb-3"
          />

          <div className="flex flex-wrap gap-2">
            {speechSupported && (
              <button
                onClick={toggleListening}
                className={`rounded-xl border text-sm font-medium px-4 py-2 transition-colors ${
                  listening ? "bg-red text-bg border-red" : "border-border text-text-gray hover:text-text"
                }`}
              >
                {listening ? "Stop recording" : "Record answer"}
              </button>
            )}
            <button
              onClick={submitAnswer}
              disabled={loadingFeedback || !answer.trim()}
              className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-4 py-2 disabled:opacity-50"
            >
              {loadingFeedback ? <span role="status" aria-live="polite">Scoring…</span> : "Get feedback"}
            </button>
            <button
              onClick={() => getQuestion()}
              disabled={loadingQuestion}
              className="rounded-xl border border-border text-text-gray hover:text-text text-sm px-4 py-2"
            >
              {loadingQuestion ? <span role="status" aria-live="polite">Loading…</span> : "New question"}
            </button>
          </div>

          {showRegenField ? (
            <div className="mt-3">
              <label htmlFor="interview-regen-feedback" className="block text-text-gray text-xs mb-1">
                What should change about the question? (optional)
              </label>
              <div className="flex gap-2">
                <input
                  id="interview-regen-feedback"
                  value={regenFeedback}
                  onChange={(e) => setRegenFeedback(e.target.value)}
                  maxLength={500}
                  placeholder="e.g. too generic, already asked something similar"
                  className="flex-1 rounded-xl bg-bg border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={() => getQuestion(regenFeedback)}
                  disabled={loadingQuestion}
                  className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2 disabled:opacity-50"
                >
                  Go
                </button>
                <button
                  onClick={() => { setShowRegenField(false); setRegenFeedback(""); }}
                  className="text-text-gray text-sm hover:text-text px-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowRegenField(true)}
              className="text-primary text-xs hover:text-primary-hover mt-2"
            >
              This one wasn&apos;t great? Tell us why
            </button>
          )}
        </div>
      )}

      {error && <p className="text-red text-sm mb-4">{error}</p>}

      {feedback && <CrisisResourceBanner resource={feedback.crisis_resource} />}
      {feedback && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-gray text-xs">Score</p>
            <p className="font-serif text-2xl text-text">{feedback.score}/10</p>
          </div>
          <p className="text-text text-sm mb-4">{feedback.one_line_summary}</p>

          {playbackUrl && (
            <div className="mb-4">
              <p className="text-text-gray text-xs mb-1">
                Your {recordingKind === "video" ? "recording" : "audio"} — listen for pacing and filler words
              </p>
              {recordingKind === "video" ? (
                <video src={playbackUrl} controls className="w-full rounded-xl border border-border max-h-64" />
              ) : (
                <audio src={playbackUrl} controls className="w-full" />
              )}
            </div>
          )}

          <div className="mb-3">
            <p className="text-text-gray text-xs mb-1">Strengths</p>
            <ul className="space-y-1">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="text-text-gray text-sm">• {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-text-gray text-xs mb-1">Improve</p>
            <ul className="space-y-1">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="text-text-gray text-sm">• {s}</li>
              ))}
            </ul>
          </div>

          {feedback.score >= 8 && (
            <div className="mt-4 pt-3 border-t border-border">
              {showNarrativePicker ? (
                <div className="space-y-2">
                  <label htmlFor="narrative-question-key" className="block text-text-gray text-xs">
                    Which narrative question does this answer best fit?
                  </label>
                  <select
                    id="narrative-question-key"
                    value={narrativeQuestionKey}
                    onChange={(e) => setNarrativeQuestionKey(e.target.value as typeof narrativeQuestionKey)}
                    className="w-full rounded-xl bg-bg border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary"
                  >
                    {NARRATIVE_QUESTIONS.map((q) => (
                      <option key={q.key} value={q.key}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                  <a
                    href={`/narrative?seed_key=${narrativeQuestionKey}&seed_text=${encodeURIComponent(answer)}`}
                    className="inline-block rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-4 py-2 text-sm"
                  >
                    Use this answer
                  </a>
                </div>
              ) : (
                <button
                  onClick={() => setShowNarrativePicker(true)}
                  className="text-primary text-sm hover:text-primary-hover"
                >
                  Strong answer — use it in Narrative Builder?
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
