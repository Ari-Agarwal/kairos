"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const EASE = [0.16, 1, 0.3, 1] as const;
const CAMPUS_SIZES = ["Small", "Medium", "Large", "No preference"];
const CAMPUS_SETTINGS = ["Urban", "Suburban", "Rural", "No preference"];

interface Profile {
  grade_level: string;
  gpa: number;
  intended_major: string | null;
  current_school: string;
  extracurriculars: string[] | null;
  schools_already_considering: string | null;
  subscription_tier: string;
  campus_size_pref: string;
  campus_setting_pref: string;
}

export default function ProfileClient({
  profile,
  fullName,
  email,
  activeSchoolCount,
}: {
  profile: Profile;
  fullName: string;
  email: string;
  activeSchoolCount: number;
}) {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [form, setForm] = useState({
    full_name: fullName,
    grade_level: profile.grade_level,
    gpa: String(profile.gpa),
    intended_major: profile.intended_major ?? "",
    current_school: profile.current_school ?? "",
    schools_already_considering: profile.schools_already_considering ?? "",
    campus_size_pref: profile.campus_size_pref ?? "",
    campus_setting_pref: profile.campus_setting_pref ?? "",
  });
  const [activities, setActivities] = useState<string[]>(
    profile.extracurriculars && profile.extracurriculars.length > 0 ? profile.extracurriculars : [""]
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function updateActivity(idx: number, value: string) {
    setActivities((prev) => prev.map((a, i) => (i === idx ? value : a)));
  }

  function addActivity() {
    setActivities((prev) => [...prev, ""]);
  }

  function removeActivity(idx: number) {
    setActivities((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      setDeleteError("Failed to delete account. Please try again.");
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/");
  }

  const ecCount = profile.extracurriculars?.length ?? 0;
  const displayName = fullName || email || "Student";

  async function handleSave() {
    setSaveError(null);
    if (!form.campus_size_pref || !form.campus_setting_pref) {
      setSaveError("Please select a campus size and setting preference (pick \"No preference\" if you're not sure).");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ecArray = activities.map((a) => a.trim()).filter(Boolean);
    await supabase.auth.updateUser({ data: { full_name: form.full_name || null } });
    await supabase
      .from("profiles")
      .update({
        grade_level: form.grade_level,
        gpa: parseFloat(form.gpa),
        intended_major: form.intended_major,
        current_school: form.current_school,
        extracurriculars: ecArray.length > 0 ? ecArray : null,
        schools_already_considering: form.schools_already_considering,
        campus_size_pref: form.campus_size_pref,
        campus_setting_pref: form.campus_setting_pref,
      })
      .eq("user_id", user.id);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="px-5 md:px-8 py-8 max-w-xl mx-auto w-full"
      >
        <h1 className="font-serif text-2xl text-text mb-6">Edit Profile</h1>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-text-gray mb-1">Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">Grade Level</label>
            <select
              value={form.grade_level}
              onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            >
              {["Freshman", "Sophomore", "Junior", "Senior"].map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">GPA</label>
            <input
              type="number"
              step="0.01"
              value={form.gpa}
              onChange={(e) => setForm({ ...form, gpa: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">Intended Major</label>
            <input
              type="text"
              value={form.intended_major}
              onChange={(e) => setForm({ ...form, intended_major: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">Current School</label>
            <input
              type="text"
              value={form.current_school}
              onChange={(e) => setForm({ ...form, current_school: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">Extracurriculars</label>
            <p className="text-text-gray text-xs mb-2">
              Be as specific as possible — e.g. &quot;Varsity basketball, team captain, 3 years&quot; instead of just &quot;Basketball.&quot;
            </p>
            <div className="space-y-2">
              {activities.map((activity, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Varsity basketball, team captain, 3 years"
                    value={activity}
                    onChange={(e) => updateActivity(idx, e.target.value)}
                    className="flex-1 rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
                  />
                  {activities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeActivity(idx)}
                      className="text-text-gray hover:text-text px-2"
                      aria-label="Remove activity"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addActivity}
                className="text-sm text-text-gray hover:text-text underline underline-offset-2"
              >
                + Add another activity
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">Schools you&apos;re already considering</label>
            <textarea
              rows={3}
              value={form.schools_already_considering}
              onChange={(e) => setForm({ ...form, schools_already_considering: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-2">Campus size preference *</label>
            <div className="flex flex-wrap gap-2">
              {CAMPUS_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() =>
                    setForm({ ...form, campus_size_pref: form.campus_size_pref === size ? "" : size })
                  }
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    form.campus_size_pref === size
                      ? "bg-primary text-bg border-primary"
                      : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-2">Campus setting preference *</label>
            <div className="flex flex-wrap gap-2">
              {CAMPUS_SETTINGS.map((setting) => (
                <button
                  key={setting}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      campus_setting_pref: form.campus_setting_pref === setting ? "" : setting,
                    })
                  }
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    form.campus_setting_pref === setting
                      ? "bg-primary text-bg border-primary"
                      : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  {setting}
                </button>
              ))}
            </div>
          </div>
          {saveError && (
            <p role="alert" className="text-red text-sm">
              {saveError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-primary hover:bg-primary-hover text-bg font-medium py-2.5 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-border text-text-gray hover:text-text py-2.5"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  const stats = [
    { label: "GPA", value: profile.gpa },
    { label: "Active Schools", value: activeSchoolCount },
    { label: "Extracurriculars", value: ecCount },
  ];

  const sections = [
    {
      title: "Extracurriculars",
      content:
        ecCount > 0 ? (
          <ul className="space-y-1">
            {profile.extracurriculars!.map((ec, idx) => (
              <li key={idx} className="text-text-gray text-sm">
                • {ec}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote />
        ),
    },
    { title: "Classes", content: <EmptyNote /> },
    { title: "Internships and Research", content: <EmptyNote /> },
    { title: "Achievements", content: <EmptyNote /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="px-5 md:px-8 py-8 max-w-xl mx-auto w-full"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-text">{displayName}</h1>
          <p className="text-text-gray text-sm">
            {profile.grade_level} · {profile.current_school} · {profile.intended_major || "Major undecided"}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="rounded-xl border border-border text-text-gray hover:text-text text-sm px-4 py-2"
        >
          Edit
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: i * 0.06 }}
            className="bg-card border border-border rounded-2xl p-4 text-center"
          >
            <p className="font-serif text-xl text-primary">{stat.value}</p>
            <p className="text-text-gray text-xs">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: 0.18 + i * 0.06 }}
          >
            <Section title={section.title}>{section.content}</Section>
          </motion.div>
        ))}
      </div>

      <p className="text-text-gray text-xs text-center mt-8">
        This profile updates automatically as you check off items on your timeline.
      </p>

      <div className="mt-10 pt-6 border-t border-border">
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="text-red text-sm hover:opacity-80"
          >
            Delete my account
          </button>
        ) : (
          <div className="bg-red-tint border border-border rounded-2xl p-4">
            <p className="text-text text-sm mb-3">
              This permanently deletes your profile, school matches, and timeline. This cannot be undone.
            </p>
            {deleteError && <p className="text-red text-sm mb-3">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="rounded-xl bg-red text-bg font-medium px-4 py-2 text-sm disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, delete everything"}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="rounded-xl border border-border text-text-gray hover:text-text px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <p className="text-text font-medium text-sm mb-2">{title}</p>
      {children}
    </div>
  );
}

function EmptyNote() {
  return <p className="text-text-gray text-sm italic">Nothing here yet.</p>;
}
