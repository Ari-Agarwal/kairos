"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  grade_level: string;
  gpa: number;
  intended_major: string | null;
  extracurriculars: string[] | null;
  location_preference: string | null;
  college_goals: string | null;
  subscription_tier: string;
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
    extracurriculars: profile.extracurriculars?.join(", ") ?? "",
    location_preference: profile.location_preference ?? "",
    college_goals: profile.college_goals ?? "",
  });
  const [saving, setSaving] = useState(false);

  const ecCount = profile.extracurriculars?.length ?? 0;
  const displayName = fullName || email || "Student";

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.auth.updateUser({ data: { full_name: form.full_name || null } });
    await supabase
      .from("profiles")
      .update({
        grade_level: form.grade_level,
        gpa: parseFloat(form.gpa),
        intended_major: form.intended_major || null,
        extracurriculars: form.extracurriculars
          ? form.extracurriculars.split(",").map((s) => s.trim()).filter(Boolean)
          : null,
        location_preference: form.location_preference || null,
        college_goals: form.college_goals || null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="px-5 md:px-8 py-8 max-w-xl mx-auto w-full">
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
            <label className="block text-sm text-text-gray mb-1">Extracurriculars (comma separated)</label>
            <input
              type="text"
              value={form.extracurriculars}
              onChange={(e) => setForm({ ...form, extracurriculars: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">Location Preference</label>
            <input
              type="text"
              value={form.location_preference}
              onChange={(e) => setForm({ ...form, location_preference: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-text-gray mb-1">College Goals</label>
            <textarea
              rows={3}
              value={form.college_goals}
              onChange={(e) => setForm({ ...form, college_goals: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary resize-none"
            />
          </div>
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
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 py-8 max-w-xl mx-auto w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-text">{displayName}</h1>
          <p className="text-text-gray text-sm">
            {profile.grade_level} · GPA {profile.gpa} · {profile.intended_major || "Major undecided"}
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
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="font-serif text-xl text-primary">{profile.gpa}</p>
          <p className="text-text-gray text-xs">GPA</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="font-serif text-xl text-primary">{activeSchoolCount}</p>
          <p className="text-text-gray text-xs">Active Schools</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="font-serif text-xl text-primary">{ecCount}</p>
          <p className="text-text-gray text-xs">Extracurriculars</p>
        </div>
      </div>

      <div className="space-y-4">
        <Section title="Extracurriculars">
          {ecCount > 0 ? (
            <ul className="space-y-1">
              {profile.extracurriculars!.map((ec, idx) => (
                <li key={idx} className="text-text-gray text-sm">
                  • {ec}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote />
          )}
        </Section>

        <Section title="Classes">
          <EmptyNote />
        </Section>

        <Section title="Internships and Research">
          <EmptyNote />
        </Section>

        <Section title="Achievements">
          <EmptyNote />
        </Section>
      </div>

      <p className="text-text-gray text-xs text-center mt-8">
        This profile updates automatically as you check off items on your timeline.
      </p>
    </div>
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
