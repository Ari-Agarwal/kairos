"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ContactType = "email" | "phone";

export function NotifyJoinClient() {
  const searchParams = useSearchParams();
  const source = searchParams.get("src");

  const [contactType, setContactType] = useState<ContactType>("email");
  const [contact, setContact] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_type: contactType,
          contact,
          sms_consent: smsConsent,
          source: source ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Something went wrong. Try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-2xl sm:text-3xl text-text max-w-md">
          You&apos;re on the list.
        </h1>
        <p className="mt-3 text-text-gray max-w-sm">
          We&apos;ll reach out the moment Kairos launches.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="font-serif text-2xl sm:text-3xl text-text text-center mb-6">
          Get notified at launch
        </h1>

        <div className="flex rounded-xl border border-border bg-card p-1 mb-4">
          {(["email", "phone"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setContactType(t);
                setContact("");
              }}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                contactType === t ? "bg-primary text-bg" : "text-text-gray hover:text-text"
              )}
            >
              {t === "email" ? "Email" : "Phone"}
            </button>
          ))}
        </div>

        {contactType === "email" ? (
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@email.com"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-text placeholder:text-text-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        ) : (
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="(555) 555-5555"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-text placeholder:text-text-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        )}

        {contactType === "phone" && (
          <label className="mt-3 flex items-start gap-2 text-xs text-text-gray">
            <input
              type="checkbox"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
              className="mt-0.5"
            />
            Text me when Kairos launches
          </label>
        )}

        {error && <p className="mt-3 text-sm text-red" role="alert">{error}</p>}

        <Button type="submit" size="lg" disabled={status === "loading"} className="mt-6 w-full h-14 rounded-2xl">
          {status === "loading" ? "Signing up…" : "Notify me"}
        </Button>
      </form>
    </main>
  );
}
