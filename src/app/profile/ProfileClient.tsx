"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import CountUp from "@/components/CountUp";
import { checkFeeWaiverEligibility } from "@/lib/fee-waiver";
import ShareLinksManager from "@/components/ShareLinksManager";
import { MAJORS } from "@/lib/mini-onboarding-fields";

const EASE = [0.16, 1, 0.3, 1] as const;
const CAMPUS_SIZES = ["Small", "Medium", "Large", "No preference"];
const CAMPUS_SETTINGS = ["Urban", "Suburban", "Rural", "No preference"];
const STANDARD_MAJORS = new Set(MAJORS.filter((m) => m !== "Other"));

// Saved majors may include a custom (non-standard) value typed via "Other" --
// split those back out so the toggle grid and the free-text field can each
// show the right thing on load.
function splitMajors(saved: string[]): { selected: string[]; other: string } {
  const standard = saved.filter((m) => STANDARD_MAJORS.has(m));
  const custom = saved.filter((m) => !STANDARD_MAJORS.has(m));
  return custom.length > 0 ? { selected: [...standard, "Other"], other: custom.join(", ") } : { selected: standard, other: "" };
}

interface Profile {
  grade_level: string;
  unweighted_gpa: number;
  weighted_gpa: number;
  intended_major: string[] | null;
  current_school: string;
  extracurriculars: string[] | null;
  schools_already_considering: string | null;
  subscription_tier: string;
  campus_size_pref: string[] | null;
  campus_setting_pref: string[] | null;
  sat_score: number | null;
  act_score: number | null;
  class_rank: string | null;
  ap_ib_count: number | null;
  career_goals: string | null;
  geographic_pref: string | null;
  financial_aid_need: boolean | null;
  budget_ceiling: number | null;
  first_gen: boolean | null;
  legacy_school: string | null;
  phone_number: string | null;
  sms_opt_in: boolean;
  mentor_opt_in: boolean;
  mentor_bio: string | null;
  internships_research: string | null;
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
  const reduceMotion = useReducedMotion();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [form, setForm] = useState({
    full_name: fullName,
    grade_level: profile.grade_level,
    unweighted_gpa: String(profile.unweighted_gpa),
    weighted_gpa: String(profile.weighted_gpa),
    current_school: profile.current_school ?? "",
    schools_already_considering: profile.schools_already_considering ?? "",
    sat_score: profile.sat_score !== null ? String(profile.sat_score) : "",
    act_score: profile.act_score !== null ? String(profile.act_score) : "",
    class_rank: profile.class_rank ?? "",
    ap_ib_count: profile.ap_ib_count !== null ? String(profile.ap_ib_count) : "",
    career_goals: profile.career_goals ?? "",
    geographic_pref: profile.geographic_pref ?? "",
    budget_ceiling: profile.budget_ceiling !== null ? String(profile.budget_ceiling) : "",
    legacy_school: profile.legacy_school ?? "",
    phone_number: profile.phone_number ?? "",
    internships_research: profile.internships_research ?? "",
  });
  const [campusSizePrefs, setCampusSizePrefs] = useState<string[]>(profile.campus_size_pref ?? []);
  const [campusSettingPrefs, setCampusSettingPrefs] = useState<string[]>(profile.campus_setting_pref ?? []);
  const initialMajors = splitMajors(profile.intended_major ?? []);
  const [majors, setMajors] = useState<string[]>(initialMajors.selected);
  const [majorOther, setMajorOther] = useState(initialMajors.other);
  const [smsOptIn, setSmsOptIn] = useState(profile.sms_opt_in);
  const [financialAidNeed, setFinancialAidNeed] = useState<boolean | null>(profile.financial_aid_need);
  const [firstGen, setFirstGen] = useState<boolean | null>(profile.first_gen);
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

  const resolvedMajors = [
    ...new Set(
      majors
        .flatMap((m) => (m === "Other" ? majorOther.split(",").map((s) => s.trim()) : [m]))
        .filter(Boolean)
    ),
  ];

  async function handleSave() {
    setSaveError(null);
    if (campusSizePrefs.length === 0 || campusSettingPrefs.length === 0) {
      setSaveError("Please select at least one campus size and setting preference (pick \"No preference\" if you're not sure).");
      return;
    }
    if (resolvedMajors.length === 0) {
      setSaveError("Please select at least one intended major.");
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
        display_name: form.full_name || user.email || null,
        grade_level: form.grade_level,
        unweighted_gpa: parseFloat(form.unweighted_gpa),
        weighted_gpa: parseFloat(form.weighted_gpa),
        intended_major: resolvedMajors,
        current_school: form.current_school,
        extracurriculars: ecArray.length > 0 ? ecArray : null,
        schools_already_considering: form.schools_already_considering,
        campus_size_pref: campusSizePrefs,
        campus_setting_pref: campusSettingPrefs,
        sat_score: form.sat_score ? parseInt(form.sat_score, 10) : null,
        act_score: form.act_score ? parseInt(form.act_score, 10) : null,
        class_rank: form.class_rank || null,
        ap_ib_count: form.ap_ib_count ? parseInt(form.ap_ib_count, 10) : null,
        career_goals: form.career_goals || null,
        geographic_pref: form.geographic_pref || null,
        financial_aid_need: financialAidNeed,
        budget_ceiling: form.budget_ceiling ? parseFloat(form.budget_ceiling) : null,
        first_gen: firstGen,
        legacy_school: form.legacy_school || null,
        internships_research: form.internships_research || null,
        phone_number: form.phone_number || null,
        sms_opt_in: smsOptIn && !!form.phone_number,
        sms_opt_in_at: smsOptIn && form.phone_number ? new Date().toISOString() : null,
        last_profile_check_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="px-5 md:px-8 py-8 max-w-xl mx-auto w-full"
      >
        <h1 className="font-serif text-2xl text-text mb-6">Edit Profile</h1>
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label htmlFor="pf-full-name" className="block text-sm text-text-gray mb-1">Full Name</label>
            <input
              id="pf-full-name"
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="pf-grade-level" className="block text-sm text-text-gray mb-1">Grade Level</label>
            <select
              id="pf-grade-level"
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
            <label htmlFor="pf-unweighted-gpa" className="block text-sm text-text-gray mb-1">Unweighted GPA</label>
            <input
              id="pf-unweighted-gpa"
              type="number"
              step="0.01"
              value={form.unweighted_gpa}
              onChange={(e) => setForm({ ...form, unweighted_gpa: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="pf-weighted-gpa" className="block text-sm text-text-gray mb-1">Weighted GPA</label>
            <input
              id="pf-weighted-gpa"
              type="number"
              step="0.01"
              value={form.weighted_gpa}
              onChange={(e) => setForm({ ...form, weighted_gpa: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <span id="pf-intended-major-label" className="block text-sm text-text-gray mb-2">
              Intended Major <span className="text-text-gray/70">(select all that apply)</span>
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="pf-intended-major-label">
              {MAJORS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={majors.includes(m)}
                  onClick={() =>
                    setMajors((prev) => (prev.includes(m) ? prev.filter((v) => v !== m) : [...prev, m]))
                  }
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    majors.includes(m)
                      ? "bg-primary text-bg border-primary"
                      : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {majors.includes("Other") && (
              <input
                type="text"
                placeholder="Tell us your intended major(s)"
                value={majorOther}
                onChange={(e) => setMajorOther(e.target.value)}
                className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary mt-2"
              />
            )}
          </div>
          <div>
            <label htmlFor="pf-current-school" className="block text-sm text-text-gray mb-1">Current School</label>
            <input
              id="pf-current-school"
              type="text"
              value={form.current_school}
              onChange={(e) => setForm({ ...form, current_school: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <span id="pf-activities-label" className="block text-sm text-text-gray mb-1">Extracurriculars</span>
            <p className="text-text-gray text-xs mb-2">
              Be as specific as possible, e.g. &quot;Varsity basketball, team captain, 3 years&quot; instead of just &quot;Basketball.&quot;
            </p>
            <div className="space-y-2" role="group" aria-labelledby="pf-activities-label">
              {activities.map((activity, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    aria-label={`Extracurricular activity ${idx + 1}`}
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
            <label htmlFor="pf-schools-considering" className="block text-sm text-text-gray mb-1">Schools you&apos;re already considering</label>
            <textarea
              id="pf-schools-considering"
              rows={3}
              value={form.schools_already_considering}
              onChange={(e) => setForm({ ...form, schools_already_considering: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pf-sat-score" className="block text-sm text-text-gray mb-1">SAT Score</label>
              <input
                id="pf-sat-score"
                type="number"
                value={form.sat_score}
                onChange={(e) => setForm({ ...form, sat_score: e.target.value })}
                className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="pf-act-score" className="block text-sm text-text-gray mb-1">ACT Score</label>
              <input
                id="pf-act-score"
                type="number"
                value={form.act_score}
                onChange={(e) => setForm({ ...form, act_score: e.target.value })}
                className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label htmlFor="pf-class-rank" className="block text-sm text-text-gray mb-1">Class rank</label>
            <input
              id="pf-class-rank"
              type="text"
              placeholder="e.g. Top 10%, or 12/340"
              value={form.class_rank}
              onChange={(e) => setForm({ ...form, class_rank: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="pf-ap-ib-count" className="block text-sm text-text-gray mb-1">AP/IB courses taken (or in progress)</label>
            <input
              id="pf-ap-ib-count"
              type="number"
              min="0"
              value={form.ap_ib_count}
              onChange={(e) => setForm({ ...form, ap_ib_count: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="pf-career-goals" className="block text-sm text-text-gray mb-1">Career goals</label>
            <textarea
              id="pf-career-goals"
              rows={2}
              value={form.career_goals}
              onChange={(e) => setForm({ ...form, career_goals: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary resize-none"
            />
          </div>
          <div>
            <label htmlFor="pf-geo-pref" className="block text-sm text-text-gray mb-1">Geographic preference</label>
            <p className="text-text-gray text-xs mb-2">
              Region, climate, and/or proximity to home or people you know — whatever matters to you.
            </p>
            <input
              id="pf-geo-pref"
              type="text"
              placeholder="e.g. West Coast, warmer climate, within driving distance of family in Chicago"
              value={form.geographic_pref}
              onChange={(e) => setForm({ ...form, geographic_pref: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <span id="pf-financial-need-label" className="block text-sm text-text-gray mb-2">Will financial aid affect where you apply?</span>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="pf-financial-need-label">
              {[{ label: "Yes", value: true }, { label: "No", value: false }].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  aria-pressed={financialAidNeed === opt.value}
                  onClick={() => setFinancialAidNeed(financialAidNeed === opt.value ? null : opt.value)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    financialAidNeed === opt.value
                      ? "bg-primary text-bg border-primary"
                      : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Link href="/scholarships" className="inline-block mt-2 text-primary hover:text-primary-hover text-sm underline underline-offset-2">
              Browse scholarships →
            </Link>
          </div>
          {financialAidNeed && (
            <div>
              <label htmlFor="pf-budget-ceiling" className="block text-sm text-text-gray mb-1">Annual budget ceiling (out-of-pocket, in $)</label>
              <input
                id="pf-budget-ceiling"
                type="number"
                value={form.budget_ceiling}
                onChange={(e) => setForm({ ...form, budget_ceiling: e.target.value })}
                className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
              />
            </div>
          )}
          <div>
            <span id="pf-first-gen-label" className="block text-sm text-text-gray mb-2">First-generation college student?</span>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="pf-first-gen-label">
              {[{ label: "Yes", value: true }, { label: "No", value: false }].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  aria-pressed={firstGen === opt.value}
                  onClick={() => setFirstGen(firstGen === opt.value ? null : opt.value)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    firstGen === opt.value
                      ? "bg-primary text-bg border-primary"
                      : "border-border text-text-gray hover:text-text"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="pf-legacy-school" className="block text-sm text-text-gray mb-1">Legacy school</label>
            <input
              id="pf-legacy-school"
              type="text"
              value={form.legacy_school}
              onChange={(e) => setForm({ ...form, legacy_school: e.target.value })}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="pf-internships-research" className="block text-sm text-text-gray mb-1">Internships / research experience</label>
            <input
              id="pf-internships-research"
              type="text"
              value={form.internships_research}
              onChange={(e) => setForm({ ...form, internships_research: e.target.value })}
              placeholder="e.g. summer research internship in a campus bio lab"
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="pf-phone-number" className="block text-sm text-text-gray mb-1">Phone number (for SMS reminders, optional)</label>
            <input
              id="pf-phone-number"
              type="tel"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              placeholder="+1 555 555 5555"
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
            <label className="flex items-start gap-2 mt-2 text-xs text-text-gray leading-relaxed">
              <input
                type="checkbox"
                checked={smsOptIn}
                onChange={(e) => setSmsOptIn(e.target.checked)}
                disabled={!form.phone_number.trim()}
                className="mt-0.5"
              />
              <span>
                I agree to receive deadline reminders, weekly essay prompts, and odds updates by text
                message at the number above. Message and data rates may apply. Consent is not
                required to use Kairos. Reply STOP at any time to opt out.
              </span>
            </label>
          </div>
          <div>
            <span id="pf-campus-size-label" className="block text-sm text-text-gray mb-2">Campus size preference * <span className="text-text-gray/70 font-normal">(select all that apply)</span></span>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="pf-campus-size-label">
              {CAMPUS_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={campusSizePrefs.includes(size)}
                  onClick={() =>
                    setCampusSizePrefs((prev) =>
                      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
                    )
                  }
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    campusSizePrefs.includes(size)
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
            <span id="pf-campus-setting-label" className="block text-sm text-text-gray mb-2">Campus setting preference * <span className="text-text-gray/70 font-normal">(select all that apply)</span></span>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="pf-campus-setting-label">
              {CAMPUS_SETTINGS.map((setting) => (
                <button
                  key={setting}
                  type="button"
                  aria-pressed={campusSettingPrefs.includes(setting)}
                  onClick={() =>
                    setCampusSettingPrefs((prev) =>
                      prev.includes(setting) ? prev.filter((s) => s !== setting) : [...prev, setting]
                    )
                  }
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    campusSettingPrefs.includes(setting)
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

  const stats: { label: string; value: number; isInteger: boolean }[] = [
    { label: "Unweighted GPA", value: profile.unweighted_gpa, isInteger: false },
    { label: "Weighted GPA", value: profile.weighted_gpa, isInteger: false },
    { label: "Active Schools", value: activeSchoolCount, isInteger: true },
    { label: "Extracurriculars", value: ecCount, isInteger: true },
  ];

  const sections = [
    {
      title: "Extracurriculars",
      content:
        ecCount > 0 ? (
          <>
            <ul className="space-y-1 mb-3">
              {profile.extracurriculars!.map((ec, idx) => (
                <li key={idx} className="text-text-gray text-sm">
                  • {ec}
                </li>
              ))}
            </ul>
            <Link
              href="/activities/evaluate"
              className="text-primary hover:text-primary-hover text-sm font-medium"
            >
              Evaluate my activities →
            </Link>
          </>
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
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="px-5 md:px-8 py-8 max-w-xl mx-auto w-full"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-text">{displayName}</h1>
          <p className="text-text-gray text-sm">
            {profile.grade_level} · {profile.current_school} · {profile.intended_major?.length ? profile.intended_major.join(", ") : "Major undecided"}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="rounded-xl border border-border text-text-gray hover:text-text text-sm px-4 py-2"
        >
          Edit
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: reduceMotion ? 0 : 0.08 + i * 0.07 }}
            className="bg-card border border-border rounded-2xl p-4 text-center"
          >
            {stat.isInteger ? (
              <CountUp value={stat.value} className="font-serif text-xl text-primary" />
            ) : (
              <p className="font-serif text-xl text-primary">{stat.value}</p>
            )}
            <p className="text-text-gray text-xs">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {checkFeeWaiverEligibility({ financial_aid_need: profile.financial_aid_need, first_gen: profile.first_gen }) === "likely_eligible" && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <p className="text-text font-medium text-sm mb-1">You may qualify for application fee waivers</p>
          <p className="text-text-gray text-sm mb-3">
            Based on your profile, you could be eligible for the{" "}
            <strong className="text-text">Common App fee waiver</strong> or a{" "}
            <strong className="text-text">NACAC fee waiver</strong> — which let you apply to many schools at no cost.
            Eligibility is determined by each school using criteria such as financial need, first-generation status,
            and participation in programs like free/reduced lunch or public assistance. You do not need to prove
            eligibility upfront — just indicate it on your Common App application.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://www.commonapp.org/apply/fee-waivers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover text-sm font-medium"
            >
              Common App fee waiver info →
            </a>
            <a
              href="https://www.nacacnet.org/college-admission-basics/fees-and-fee-waivers/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover text-sm font-medium"
            >
              NACAC fee waiver info →
            </a>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: reduceMotion ? 0 : 0.28 + i * 0.06 }}
          >
            <Section title={section.title}>{section.content}</Section>
          </motion.div>
        ))}
      </div>

      <p className="text-text-gray text-xs text-center mt-8">
        This profile updates automatically as you check off items on your timeline.
      </p>

      <div className="mt-8 pt-6 border-t border-border">
        {/* Mentor loop entry point pulled Jul 16 (decision, not a removal of the
            feature) — code/migrations/API untouched, just no longer surfaced. */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <ShareLinksManager />
        </div>
      </div>

      <div className="mt-4 pt-6 border-t border-border">
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
