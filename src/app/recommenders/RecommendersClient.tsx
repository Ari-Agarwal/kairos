"use client";

import { useState } from "react";
import { CheckCircle, Clock, Send, Copy, ChevronDown, ChevronUp, Trash2, type LucideIcon } from "lucide-react";

const BRAG_FIELDS = [
  { key: "activities", label: "Activities & Involvement" },
  { key: "achievements", label: "Achievements & Awards" },
  { key: "anecdotes", label: "Anecdotes to Share" },
  { key: "additional_context", label: "Additional Context" },
] as const;

type BragKey = "activities" | "achievements" | "anecdotes" | "additional_context";

const STATUS_META: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  requested: { label: "Requested", color: "text-text-gray", icon: Clock },
  reminded:  { label: "Reminded",  color: "text-amber",     icon: Send },
  submitted: { label: "Submitted", color: "text-green",     icon: CheckCircle },
};

interface Recommender {
  id: string;
  recommender_name: string;
  recommender_email: string | null;
  relationship: string;
  status: "requested" | "reminded" | "submitted";
  share_token: string;
  brag_sheet: Record<BragKey, string> | null;
  last_reminded_at: string | null;
  created_at: string;
}

interface Props {
  initialRecommenders: Recommender[];
  origin: string;
}

export default function RecommendersClient({ initialRecommenders, origin }: Props) {
  const [recommenders, setRecommenders] = useState<Recommender[]>(initialRecommenders);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRel, setNewRel] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bragDrafts, setBragDrafts] = useState<Record<string, Record<BragKey, string>>>({});
  const [bragSaving, setBragSaving] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  async function addRecommender() {
    if (!newName.trim() || !newRel.trim()) {
      setFormError("Name and relationship are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommender_name: newName, recommender_email: newEmail || undefined, relationship: newRel }),
      });
      const body = await res.json();
      if (!res.ok) { setFormError(body.error ?? "Failed to add recommender."); return; }
      setRecommenders(prev => [body.recommender, ...prev]);
      setNewName(""); setNewEmail(""); setNewRel("");
      setAdding(false);
    } catch {
      setFormError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function markReminded(rec: Recommender) {
    const res = await fetch(`/api/recommendations/${rec.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "reminded" }),
    });
    if (res.ok) {
      const body = await res.json();
      setRecommenders(prev => prev.map(r => r.id === rec.id ? body.recommender : r));
    }
  }

  async function saveBrag(rec: Recommender) {
    const draft = bragDrafts[rec.id];
    if (!draft) return;
    setBragSaving(prev => ({ ...prev, [rec.id]: true }));
    try {
      const res = await fetch(`/api/recommendations/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brag_sheet: draft }),
      });
      if (res.ok) {
        const body = await res.json();
        setRecommenders(prev => prev.map(r => r.id === rec.id ? body.recommender : r));
        setBragDrafts(prev => { const n = { ...prev }; delete n[rec.id]; return n; });
      }
    } finally {
      setBragSaving(prev => ({ ...prev, [rec.id]: false }));
    }
  }

  async function deleteRec(id: string) {
    if (!confirm("Remove this recommender?")) return;
    await fetch(`/api/recommendations/${id}`, { method: "DELETE" });
    setRecommenders(prev => prev.filter(r => r.id !== id));
  }

  function copyLink(token: string) {
    const url = `${origin}/recommender/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function getBragForRec(rec: Recommender): Record<BragKey, string> {
    if (bragDrafts[rec.id]) return bragDrafts[rec.id];
    const bs = (rec.brag_sheet ?? {}) as Partial<Record<BragKey, string>>;
    return {
      activities: bs.activities ?? "",
      achievements: bs.achievements ?? "",
      anecdotes: bs.anecdotes ?? "",
      additional_context: bs.additional_context ?? "",
    };
  }

  function updateBragField(recId: string, rec: Recommender, key: BragKey, value: string) {
    const current = getBragForRec(rec);
    setBragDrafts(prev => ({ ...prev, [recId]: { ...current, [key]: value } }));
  }

  return (
    <div className="space-y-4">
      {recommenders.map(rec => {
        const meta = STATUS_META[rec.status] ?? STATUS_META.requested;
        const Icon = meta.icon;
        const isExpanded = expandedId === rec.id;
        const brag = getBragForRec(rec);
        const hasDraft = !!bragDrafts[rec.id];

        return (
          <div key={rec.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-text">{rec.recommender_name}</p>
                  <p className="text-text-gray text-sm">{rec.relationship}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`flex items-center gap-1 text-xs font-medium ${meta.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {meta.label}
                  </span>
                  <button
                    onClick={() => deleteRec(rec.id)}
                    className="text-text-gray hover:text-red transition-colors ml-1"
                    aria-label="Delete recommender"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => copyLink(rec.share_token)}
                  className="flex items-center gap-1.5 text-xs rounded-xl border border-border px-3 py-1.5 text-text-gray hover:text-text hover:border-amber/40 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied === rec.share_token ? "Copied!" : "Copy Share Link"}
                </button>
                {rec.status === "requested" && (
                  <button
                    onClick={() => markReminded(rec)}
                    className="flex items-center gap-1.5 text-xs rounded-xl border border-border px-3 py-1.5 text-text-gray hover:text-amber hover:border-amber/40 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Mark as Reminded
                  </button>
                )}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  className="flex items-center gap-1.5 text-xs rounded-xl border border-border px-3 py-1.5 text-text-gray hover:text-text transition-colors ml-auto"
                >
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {isExpanded ? "Hide Brag Sheet" : "Edit Brag Sheet"}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
                <p className="text-text-gray text-xs">
                  Fill in what you&apos;d like {rec.recommender_name.split(" ")[0]} to highlight. This appears on their share page along with AI-generated talking points.
                </p>
                {BRAG_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-text-gray text-xs uppercase tracking-widest mb-1.5">
                      {label}
                    </label>
                    <textarea
                      rows={3}
                      value={brag[key]}
                      onChange={e => updateBragField(rec.id, rec, key, e.target.value)}
                      placeholder="Leave blank if not applicable…"
                      maxLength={3000}
                      className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-gray resize-y focus:outline-none focus:border-amber/60 transition-colors"
                    />
                  </div>
                ))}
                {hasDraft && (
                  <button
                    onClick={() => saveBrag(rec)}
                    disabled={bragSaving[rec.id]}
                    className="rounded-xl bg-amber hover:opacity-90 transition-opacity text-bg font-medium px-5 py-2 text-sm disabled:opacity-50"
                  >
                    {bragSaving[rec.id] ? "Saving…" : "Save Brag Sheet"}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-medium text-text">Add Recommender</h3>
          {formError && <p role="alert" className="text-red text-sm">{formError}</p>}
          <div>
            <label className="block text-text-gray text-xs uppercase tracking-widest mb-1.5">Name *</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Dr. Jane Smith"
              maxLength={200}
              className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-gray focus:outline-none focus:border-amber/60 transition-colors"
            />
          </div>
          <div>
            <label className="block text-text-gray text-xs uppercase tracking-widest mb-1.5">
              Email <span className="normal-case text-text-gray">(optional — for your reference only)</span>
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="teacher@school.edu"
              maxLength={254}
              className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-gray focus:outline-none focus:border-amber/60 transition-colors"
            />
          </div>
          <div>
            <label className="block text-text-gray text-xs uppercase tracking-widest mb-1.5">Relationship *</label>
            <input
              type="text"
              value={newRel}
              onChange={e => setNewRel(e.target.value)}
              placeholder="AP Chemistry teacher, junior year"
              maxLength={200}
              className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-gray focus:outline-none focus:border-amber/60 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addRecommender}
              disabled={saving}
              className="rounded-xl bg-amber hover:opacity-90 transition-opacity text-bg font-medium px-5 py-2 text-sm disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add Recommender"}
            </button>
            <button
              onClick={() => { setAdding(false); setFormError(null); setNewName(""); setNewEmail(""); setNewRel(""); }}
              className="rounded-xl border border-border px-5 py-2 text-sm text-text-gray hover:text-text transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-2xl border border-dashed border-border px-5 py-4 text-sm text-text-gray hover:text-text hover:border-amber/40 transition-colors text-center"
        >
          + Add Recommender
        </button>
      )}
    </div>
  );
}
