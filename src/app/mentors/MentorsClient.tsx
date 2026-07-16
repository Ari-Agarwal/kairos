"use client";

import { useState } from "react";
import Link from "next/link";

interface EligibleMentor {
  user_id: string;
  mentor_bio: string | null;
  intended_major: string | null;
}

interface SentRequest {
  id: string;
  mentor_id: string;
  school_name: string;
  intro: string;
  status: string;
  created_at: string;
}

interface ReceivedRequest {
  id: string;
  mentee_id: string;
  school_name: string;
  intro: string;
  status: string;
  created_at: string;
}

export default function MentorsClient({
  sentRequests,
  receivedRequests,
}: {
  sentRequests: SentRequest[];
  receivedRequests: ReceivedRequest[];
}) {
  const [school, setSchool] = useState("");
  const [mentors, setMentors] = useState<EligibleMentor[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [intro, setIntro] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [responding, setResponding] = useState<string | null>(null);
  const [received, setReceived] = useState(receivedRequests);

  async function search() {
    if (!school.trim()) return;
    setSearching(true);
    setError(null);
    setMentors(null);
    const res = await fetch(`/api/mentor/find?school=${encodeURIComponent(school.trim())}`);
    setSearching(false);
    if (!res.ok) {
      setError("Couldn't search for mentors. Please try again.");
      return;
    }
    const data = await res.json();
    setMentors(data.mentors);
  }

  async function sendRequest(mentorId: string) {
    if (!intro.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch("/api/mentor/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentorId, schoolName: school.trim(), intro }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't send request.");
      return;
    }
    setSent((prev) => ({ ...prev, [mentorId]: true }));
    setRequestingId(null);
    setIntro("");
  }

  async function respond(requestId: string, status: "accepted" | "declined") {
    setResponding(requestId);
    const res = await fetch("/api/mentor/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status }),
    });
    setResponding(null);
    if (res.ok) {
      setReceived((prev) => prev.map((r) => (r.id === requestId ? { ...r, status } : r)));
    }
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
      <h1 className="font-serif text-2xl text-text mb-2">Mentors</h1>
      <p className="text-text-gray text-sm mb-6 leading-relaxed">
        Connect with students who got into a school you&apos;re applying to. Messaging only starts once a
        mentor accepts your request.
      </p>

      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <label htmlFor="mentor-school-search" className="block text-sm text-text-gray mb-1">Find a mentor for a school</label>
        <div className="flex gap-2">
          <input
            id="mentor-school-search"
            type="text"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="e.g. University of Michigan"
            className="flex-1 rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary text-sm"
          />
          <button
            onClick={search}
            disabled={searching || !school.trim()}
            className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>

        {mentors !== null && (
          <div className="mt-4 space-y-3">
            {mentors.length === 0 && <p className="text-text-gray text-sm">No mentors found for this school yet.</p>}
            {mentors.map((m) => (
              <div key={m.user_id} className="bg-bg border border-border rounded-xl p-3">
                {m.intended_major && <p className="text-text-gray text-xs mb-1">{m.intended_major}</p>}
                <p className="text-text text-sm mb-2">{m.mentor_bio}</p>
                {sent[m.user_id] ? (
                  <p className="text-text-gray text-xs">Request sent.</p>
                ) : requestingId === m.user_id ? (
                  <div>
                    <textarea
                      value={intro}
                      onChange={(e) => setIntro(e.target.value)}
                      rows={2}
                      placeholder="Introduce yourself and what you'd like to ask."
                      className="w-full rounded-lg bg-card border border-border px-3 py-2 text-text outline-none focus:border-primary text-sm mb-2"
                    />
                    <button
                      onClick={() => sendRequest(m.user_id)}
                      disabled={sending || !intro.trim()}
                      className="rounded-lg bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-3 py-1.5 disabled:opacity-50"
                    >
                      {sending ? "Sending…" : "Send request"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setRequestingId(m.user_id)}
                    className="rounded-lg border border-border text-text-gray hover:text-text text-sm px-3 py-1.5"
                  >
                    Request mentorship
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-red text-sm mt-3">{error}</p>}
      </div>

      {received.length > 0 && (
        <div className="mb-6">
          <p className="text-text-gray text-xs mb-2">Requests to you</p>
          <div className="space-y-3">
            {received.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
                <p className="text-text text-sm mb-1">{r.school_name}</p>
                <p className="text-text-gray text-sm mb-2">{r.intro}</p>
                {r.status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => respond(r.id, "accepted")}
                      disabled={responding === r.id}
                      className="rounded-lg bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-3 py-1.5 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respond(r.id, "declined")}
                      disabled={responding === r.id}
                      className="rounded-lg border border-border text-text-gray hover:text-text text-sm px-3 py-1.5"
                    >
                      Decline
                    </button>
                  </div>
                ) : r.status === "accepted" ? (
                  <Link href={`/mentors/${r.id}`} className="text-primary hover:text-primary-hover text-sm underline underline-offset-2">
                    Open conversation →
                  </Link>
                ) : (
                  <p className="text-text-gray text-xs capitalize">{r.status}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {sentRequests.length > 0 && (
        <div>
          <p className="text-text-gray text-xs mb-2">Your requests</p>
          <div className="space-y-3">
            {sentRequests.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
                <p className="text-text text-sm mb-1">{r.school_name}</p>
                <p className="text-text-gray text-xs capitalize mb-2">{r.status}</p>
                {r.status === "accepted" && (
                  <Link href={`/mentors/${r.id}`} className="text-primary hover:text-primary-hover text-sm underline underline-offset-2">
                    Open conversation →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
