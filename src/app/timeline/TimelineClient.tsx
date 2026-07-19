"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildBulkIcs, downloadIcs } from "@/lib/ics";

interface TimelineItem {
  id: string;
  title: string;
  due_date: string | null;
  school_tags: string[];
  tier: "free" | "premium";
  is_strategic: boolean;
  completed: boolean;
  why_text: string;
}

function sortItems(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

function formatDue(due: string): string {
  const d = new Date(`${due}T00:00:00`);
  if (Number.isNaN(d.getTime())) return due;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TimelineClient({
  items: initialItems,
  isPremium,
  youAreHereId,
  remaining,
  initialJobStatus,
}: {
  items: TimelineItem[];
  isPremium: boolean;
  youAreHereId: string | null;
  remaining: number | null;
  initialJobStatus: "pending" | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState(initialItems);
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems);
  }

  // Generation runs as a background job now (see api/timeline/generate) --
  // poll for completion instead of the old ~50s blocking foreground request.
  const [jobPending, setJobPending] = useState(initialJobStatus === "pending");
  const [jobError, setJobError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobPending) return;
    pollRef.current = setInterval(async () => {
      const res = await fetch("/api/timeline/generate");
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "done") {
        if (pollRef.current) clearInterval(pollRef.current);
        setJobPending(false);
        router.refresh();
      } else if (data.status === "error") {
        if (pollRef.current) clearInterval(pollRef.current);
        setJobPending(false);
        setJobError(data.error_message ?? "Failed to generate. Please try again.");
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobPending, router]);
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function startEdit(item: TimelineItem) {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDueDate(item.due_date ?? "");
    setEditError(null);
  }

  async function handleSaveEdit(id: string) {
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    setEditError(null);
    const { error: updateError } = await supabase
      .from("timeline_items")
      .update({ title: editTitle.trim(), due_date: editDueDate || null })
      .eq("id", id);
    if (updateError) {
      setEditError("Failed to save changes. Please try again.");
      setSavingEdit(false);
      return;
    }
    setItems((prev) =>
      sortItems(
        prev.map((i) => (i.id === id ? { ...i, title: editTitle.trim(), due_date: editDueDate || null } : i))
      )
    );
    setEditingId(null);
    setSavingEdit(false);
  }

  const regenDisabled = !isPremium && remaining === 0;

  function handleGenerate() {
    router.push("/timeline/prep");
  }

  async function handleDelete(id: string) {
    await supabase.from("timeline_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleToggleComplete(item: TimelineItem) {
    const completed = !item.completed;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, completed } : i)));
    const { error } = await supabase.from("timeline_items").update({ completed }).eq("id", item.id);
    if (error) {
      // revert on failure
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, completed: !completed } : i)));
    }
  }

  async function handleAddItem() {
    if (!newTitle.trim()) return;
    setAdding(true);
    setAddError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAdding(false);
      return;
    }
    const { data, error: insertError } = await supabase
      .from("timeline_items")
      .insert({
        user_id: user.id,
        title: newTitle.trim(),
        due_date: newDueDate || null,
        school_tags: [],
        tier: "free",
        is_strategic: false,
        why_text: "Added manually by you.",
        what_to_do: [],
      })
      .select()
      .single();

    if (insertError || !data) {
      setAddError("Failed to add item. Please try again.");
      setAdding(false);
      return;
    }

    setItems((prev) => sortItems([...prev, data as TimelineItem]));
    setNewTitle("");
    setNewDueDate("");
    setAdding(false);
  }

  if (items.length === 0) {
    if (jobPending) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-[60vh]">
          <div className="relative mb-5 h-10 w-10">
            <motion.span
              className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-primary"
              animate={reduceMotion ? undefined : { opacity: [0.35, 0.9, 0.35] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <p className="font-serif text-xl text-text mb-1">Mapping out your timeline...</p>
          <p className="text-text-gray text-sm">This can take up to a minute. Feel free to check back.</p>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center min-h-[60vh]">
        {/* a single dim star, waiting to light up */}
        <div className="relative mb-5 h-10 w-10">
          <motion.span
            className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-text-gray"
            animate={reduceMotion ? undefined : { opacity: [0.35, 0.9, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <p className="font-serif text-xl text-text mb-1">Your path isn&apos;t charted yet.</p>
        <p className="text-text-gray text-sm mb-1">Generate a timeline to map out every step ahead.</p>
        <p className="text-text-gray text-xs mb-4">
          {isPremium ? "Unlimited regenerations" : `${remaining} regeneration${remaining === 1 ? "" : "s"} left this week`}
        </p>
        {jobError && <p role="alert" className="text-red text-sm mb-3">{jobError}</p>}
        <button
          onClick={handleGenerate}
          disabled={regenDisabled}
          className="rounded-xl bg-primary hover:bg-primary-hover text-bg font-medium px-6 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Generate Timeline
        </button>
      </div>
    );
  }

  const completedCount = items.filter((i) => i.completed).length;
  const total = items.length;
  const hereIndex = items.findIndex((i) => i.id === youAreHereId);
  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="px-5 md:px-8 py-8 max-w-2xl mx-auto w-full">
      {jobPending && (
        <div className="mb-5 rounded-xl border border-primary/30 bg-secondary-tint px-4 py-3 flex items-center gap-3">
          <span
            className="h-1.5 w-1.5 rounded-full bg-primary ambient-star shrink-0"
            style={{ ["--twinkle-max" as string]: "1", ["--twinkle-duration" as string]: "1.2s" }}
          />
          <p className="text-text-gray text-sm">
            Regenerating your timeline in the background — this list will update automatically once it&apos;s ready.
          </p>
        </div>
      )}
      {jobError && (
        <div className="mb-5 rounded-xl border border-red/30 bg-red-tint px-4 py-3">
          <p className="text-red text-sm">{jobError}</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-2xl text-text">Your Timeline</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={regenDisabled}
            className="text-primary text-sm hover:text-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Regenerate
          </button>
          <button
            onClick={() => {
              const upcoming = items.filter((i): i is TimelineItem & { due_date: string } => !!i.due_date && !i.completed);
              if (upcoming.length === 0) return;
              downloadIcs(buildBulkIcs(upcoming), "kairos-timeline.ics");
            }}
            title="Download all upcoming deadlines as a .ics file"
            className="rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium px-3 py-1.5 transition-colors flex items-center gap-1.5"
          >
            <CalendarDays className="size-3.5" />
            Sync
          </button>
          <button
            onClick={() => setEditing((e) => !e)}
            className="rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium px-3 py-1.5 transition-colors"
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {/* journey progress: how far along the path you've traveled */}
      <div className="mb-1 flex items-center justify-between">
        <p className="text-text-gray text-xs">
          {completedCount} of {total} milestone{total === 1 ? "" : "s"} complete
        </p>
        <p className="text-text-gray text-xs">
          {isPremium ? "Unlimited regenerations" : `${remaining} regen${remaining === 1 ? "" : "s"} left`}
        </p>
      </div>
      <div className="mb-7 h-1 w-full overflow-hidden rounded-full bg-border/60">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: reduceMotion ? `${progressPct}%` : 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </div>

      {editing && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 space-y-3">
          <p className="text-text text-sm font-medium">Add an item</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              aria-label="Item title"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
            <input
              type="date"
              aria-label="Due date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
            <button
              onClick={handleAddItem}
              disabled={adding || !newTitle.trim()}
              className="rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg text-sm font-medium px-4 py-2.5 disabled:opacity-40"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
          {addError && <p role="alert" className="text-red text-sm">{addError}</p>}
        </div>
      )}

      <div className="relative pl-9">
        {/* the path: draws itself in from the top, bright behind you and fading into the future */}
        <motion.div
          className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/70 via-text-gray/30 to-border"
          style={{ transformOrigin: "top" }}
          initial={{ scaleY: reduceMotion ? 1 : 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
        {items.map((item, i) => {
          const isHere = item.id === youAreHereId;
          const traveled = item.completed || (hereIndex !== -1 && i < hereIndex);
          const locked = item.is_strategic && !isPremium;
          return (
            <motion.div
              key={item.id}
              className="relative mb-6"
              initial={{ opacity: reduceMotion ? 1 : 0, x: reduceMotion ? 0 : -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.3 + Math.min(i * 0.07, 0.9), ease: [0.16, 1, 0.3, 1] }}
            >
              {/* node on the path */}
              {isHere ? (
                <>
                  {/* soft beacon halo — the lighthouse, made literal */}
                  <motion.div
                    className="absolute -left-[41px] top-0 h-8 w-8 rounded-full bg-primary/25 blur-md"
                    animate={reduceMotion ? undefined : { opacity: [0.5, 0.95, 0.5], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute -left-[33px] top-2 w-4 h-4 rounded-full bg-primary border border-primary"
                    animate={reduceMotion ? undefined : { boxShadow: ["0 0 0 0 var(--amber-glow-ring)", "0 0 0 8px var(--amber-glow-ring-fade)"] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  />
                </>
              ) : (
                <div
                  className={`absolute -left-8 top-2.5 w-3 h-3 rounded-full ${
                    traveled ? "bg-text-gray border-2 border-text-gray" : "bg-bg border-2 border-border"
                  }`}
                />
              )}
              {editing && editingId !== item.id && (
                <div className="absolute top-3 right-3 z-10 flex gap-1">
                  <button
                    onClick={() => startEdit(item)}
                    className="text-text-gray hover:text-text text-xs px-2.5 py-2 rounded-lg transition-colors"
                    aria-label="Edit item"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-text-gray hover:text-red text-xs px-2.5 py-2 rounded-lg transition-colors"
                    aria-label="Remove item"
                  >
                    Remove
                  </button>
                </div>
              )}
              <div
                className={`group relative rounded-2xl p-5 border transition-all hover:-translate-y-0.5 ${
                  isHere
                    ? "bg-card border-primary/40 shadow-[0_0_24px_-8px_var(--amber-glow-shadow)]"
                    : item.is_strategic
                    ? "bg-premium-tint border-dashed border-premium hover:border-premium"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                {editingId !== item.id && (
                  <Link
                    href={locked ? "/upgrade" : `/timeline/${item.id}`}
                    className="absolute inset-0 rounded-2xl"
                    aria-label={`View ${item.title} details`}
                  />
                )}
                {editingId === item.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      aria-label="Edit item title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-xl bg-bg border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary"
                    />
                    <input
                      type="date"
                      aria-label="Edit due date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full rounded-xl bg-bg border border-border px-3 py-2 text-text text-sm outline-none focus:border-primary"
                    />
                    {editError && <p role="alert" className="text-red text-xs">{editError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        disabled={savingEdit || !editTitle.trim()}
                        className="rounded-lg bg-primary hover:bg-primary-hover transition-colors text-bg text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                      >
                        {savingEdit ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={savingEdit}
                        className="rounded-lg border border-border text-text-gray hover:text-text text-xs px-3 py-1.5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                <div className="pointer-events-none">
                  <div className={`flex items-center justify-between mb-1.5 ${editing ? "pr-24" : ""}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleComplete(item);
                        }}
                        aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
                        aria-pressed={item.completed}
                        className={`pointer-events-auto shrink-0 w-4 h-4 rounded-full border-2 transition-colors ${
                          item.completed ? "bg-text-gray border-text-gray" : "border-border hover:border-primary"
                        }`}
                      />
                      <p className={`font-medium text-[15px] truncate ${item.completed ? "text-text-gray line-through" : "text-text"}`}>
                        {item.title}
                      </p>
                    </div>
                    {item.is_strategic && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-premium text-bg shrink-0 ml-2">
                        PREMIUM
                      </span>
                    )}
                  </div>
                  {item.due_date && (
                    <p className="text-text-gray text-xs mb-1.5">Due {formatDue(item.due_date)}</p>
                  )}
                  {isHere && (
                    <p className="text-text text-xs font-medium mb-1.5 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-1 rounded-full bg-text" />
                      You are here
                    </p>
                  )}
                  {locked ? (
                    <>
                      <p className="text-text-gray text-sm leading-relaxed">
                        <span>{item.why_text.split(" ").slice(0, 6).join(" ")} </span>
                        <span className="blur-[3px] select-none">
                          {item.why_text.split(" ").slice(6).join(" ")}
                        </span>
                      </p>
                      <p className="text-premium text-xs italic mt-1.5">Unlock Premium to see the rest</p>
                    </>
                  ) : (
                    <>
                      <p className="text-text-gray text-sm">{item.why_text}</p>
                      {item.why_text !== "Added manually by you." && (
                        <p className="text-text-gray/70 text-xs mt-1.5">
                          Based on your saved schools &amp; deadline data —{" "}
                          <Link
                            href="/methodology"
                            className="underline underline-offset-2 hover:text-text-gray pointer-events-auto"
                          >
                            how this is calculated
                          </Link>
                        </p>
                      )}
                    </>
                  )}
                </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
