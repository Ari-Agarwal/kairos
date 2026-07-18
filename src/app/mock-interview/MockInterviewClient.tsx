"use client";

import { useEffect, useRef, useState } from "react";

interface InterviewFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  one_line_summary: string;
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
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const processedResultCount = useRef(0);
  const [category, setCategory] = useState<Category>("General");
  const [history, setHistory] = useState<SessionHistoryEntry[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
  }, []);

  async function getQuestion() {
    setLoadingQuestion(true);
    setError(null);
    setFeedback(null);
    setAnswer("");
    const res = await fetch("/api/interview/question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    setLoadingQuestion(false);
    if (!res.ok) {
      setError("Couldn't get a question. Please try again.");
      return;
    }
    const data = await res.json();
    setQuestion(data.question);
    if (ttsSupported) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(data.question));
    }
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = getSpeechRecognition();
    if (!recognition) return;
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
      body: JSON.stringify({ question, answer }),
    });
    setLoadingFeedback(false);
    if (!res.ok) {
      setError("Couldn't generate feedback. Please try again.");
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
      <p className="text-text-gray text-xs mb-6 leading-relaxed">
        Your voice is converted to text entirely in your browser — audio is never sent to or stored
        on our servers, only the text you see below.{!speechSupported && " Voice input isn't supported in this browser; type your answer instead."}
      </p>

      {showHistory && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 space-y-2">
          {loadingHistory ? (
            <p className="text-text-gray text-sm">Loading history…</p>
          ) : !history || history.length === 0 ? (
            <p className="text-text-gray text-sm">No past sessions yet.</p>
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
            onClick={getQuestion}
            disabled={loadingQuestion}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium px-4 py-2.5 disabled:opacity-50"
          >
            {loadingQuestion ? "Loading…" : "Start mock interview"}
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
              {loadingFeedback ? "Scoring…" : "Get feedback"}
            </button>
            <button
              onClick={getQuestion}
              disabled={loadingQuestion}
              className="rounded-xl border border-border text-text-gray hover:text-text text-sm px-4 py-2"
            >
              New question
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red text-sm mb-4">{error}</p>}

      {feedback && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-text-gray text-xs">Score</p>
            <p className="font-serif text-2xl text-text">{feedback.score}/10</p>
          </div>
          <p className="text-text text-sm mb-4">{feedback.one_line_summary}</p>
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
        </div>
      )}
    </div>
  );
}
