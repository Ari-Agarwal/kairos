"use client";

// Financial aid consent/UX groundwork (Software_Timeline.md Section 1, item 3).
// This is deliberately the FULL scope of that item: collecting income
// bracket / state / family size behind an explicit, plain-language opt-in.
// It does NOT feed matches, scholarships, or timeline generation, and there
// is no net-price-calculator anywhere near this component -- both are
// explicitly future work, gated on this consent pass landing first.
//
// Kept as its own component (rather than folded into ProfileClient's big
// form) so the opt-in gate, its own save state, and its own copy stay easy
// to audit in one place.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const INCOME_BRACKETS: { id: string; label: string }[] = [
  { id: "under_30k", label: "Under $30,000" },
  { id: "30k_60k", label: "$30,000 – $60,000" },
  { id: "60k_100k", label: "$60,000 – $100,000" },
  { id: "100k_150k", label: "$100,000 – $150,000" },
  { id: "150k_250k", label: "$150,000 – $250,000" },
  { id: "over_250k", label: "Over $250,000" },
  { id: "prefer_not_to_say", label: "Prefer not to say" },
];

interface FinancialAidInfo {
  financial_aid_info_consent: boolean;
  financial_aid_income_bracket: string | null;
  financial_aid_state: string | null;
  financial_aid_family_size: number | null;
}

export default function FinancialAidConsentSection({ profile }: { profile: FinancialAidInfo }) {
  const supabase = createClient();
  const [consent, setConsent] = useState(profile.financial_aid_info_consent);
  const [incomeBracket, setIncomeBracket] = useState(profile.financial_aid_income_bracket ?? "");
  const [state, setState] = useState(profile.financial_aid_state ?? "");
  const [familySize, setFamilySize] = useState(
    profile.financial_aid_family_size !== null ? String(profile.financial_aid_family_size) : ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConsentToggle(next: boolean) {
    setConsent(next);
    setSaved(false);
    if (!next) {
      // Withdrawing consent clears the stored info too -- it should not
      // linger just because the checkbox got unchecked.
      await persist(false, null, null, null);
    }
  }

  async function persist(
    consentValue: boolean,
    bracket: string | null,
    stateValue: string | null,
    familySizeValue: number | null
  ) {
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("Could not verify your account. Please refresh and try again.");
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        financial_aid_info_consent: consentValue,
        financial_aid_income_bracket: bracket,
        financial_aid_state: stateValue,
        financial_aid_family_size: familySizeValue,
        financial_aid_info_updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (updateError) {
      setError("Couldn't save this. Please try again.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleSave() {
    persist(
      consent,
      incomeBracket || null,
      state.trim() || null,
      familySize ? parseInt(familySize, 10) : null
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 mb-6">
      <p className="text-text font-medium text-sm mb-1">Financial aid info (optional)</p>
      <p className="text-text-gray text-xs mb-3">
        Kairos does not currently use this anywhere in your matches, scholarships, or timeline — it&apos;s
        being collected now only so we can build affordability tools honestly later, with your consent
        already on record rather than assumed. You never need to fill this in to use any part of Kairos,
        and you can withdraw consent and clear this information at any time.
      </p>
      <label className="flex items-start gap-2 mb-4">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={consent}
          disabled={saving}
          onChange={(e) => handleConsentToggle(e.target.checked)}
        />
        <span className="text-sm text-text">
          I&apos;d like to share some general financial context (income range, state, family size) with Kairos.
        </span>
      </label>

      {consent && (
        <div className="space-y-4">
          <div>
            <label htmlFor="fa-income-bracket" className="block text-sm text-text-gray mb-1">
              Household income range
            </label>
            <select
              id="fa-income-bracket"
              value={incomeBracket}
              onChange={(e) => setIncomeBracket(e.target.value)}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            >
              <option value="">Select a range</option>
              {INCOME_BRACKETS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fa-state" className="block text-sm text-text-gray mb-1">
              State
            </label>
            <input
              id="fa-state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. California"
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="fa-family-size" className="block text-sm text-text-gray mb-1">
              Family size
            </label>
            <input
              id="fa-family-size"
              type="number"
              min={1}
              max={20}
              value={familySize}
              onChange={(e) => setFamilySize(e.target.value)}
              className="w-full rounded-xl bg-bg border border-border px-4 py-2.5 text-text outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-red text-sm">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-primary text-bg font-medium px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
