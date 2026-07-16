"use client";

import { useEffect, useState } from "react";

interface SharedLink {
  token: string;
  label: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  url: string;
}

export default function ShareLinksManager() {
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/shared-links")
      .then((r) => r.json())
      .then((d) => setLinks(d.links ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/shared-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: labelInput.trim() || null }),
      });
      const d = await res.json();
      if (!res.ok) {
        setCreateError(d.error ?? "Failed to create link.");
        return;
      }
      setLinks((prev) => [d.link ? { ...d.link, url: d.url } : d, ...prev]);
      setLabelInput("");
    } catch {
      setCreateError("Network error.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(token: string) {
    setRevoking(token);
    try {
      const res = await fetch(`/api/shared-links/${token}`, { method: "PATCH" });
      if (res.ok) {
        setLinks((prev) =>
          prev.map((l) => (l.token === token ? { ...l, revoked_at: new Date().toISOString() } : l))
        );
      }
    } catch {
      // silent — the UI still shows the link as active, user can retry
    } finally {
      setRevoking(null);
    }
  }

  function handleCopy(url: string, token: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const activeLinks = links.filter(
    (l) => !l.revoked_at && new Date(l.expires_at) > new Date()
  );
  const inactiveLinks = links.filter(
    (l) => l.revoked_at || new Date(l.expires_at) <= new Date()
  );

  return (
    <div>
      <p className="text-text font-medium text-sm mb-1">Share your college list</p>
      <p className="text-text-gray text-xs mb-4">
        Send a read-only link to a parent or counselor. Links expire in 30 days and can be revoked any time.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Label (e.g. For Mom) — optional"
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          maxLength={80}
          className="flex-1 rounded-xl bg-bg border border-border px-4 py-2 text-text text-sm outline-none focus:border-primary"
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-xl bg-primary text-bg text-sm font-medium px-4 py-2 disabled:opacity-50 hover:opacity-90"
        >
          {creating ? "Creating…" : "Create link"}
        </button>
      </div>

      {createError && <p role="alert" className="text-red text-xs mb-3">{createError}</p>}

      {loading ? (
        <p className="text-text-gray text-xs">Loading…</p>
      ) : (
        <>
          {activeLinks.length > 0 && (
            <div className="space-y-2 mb-3">
              {activeLinks.map((l) => (
                <LinkRow
                  key={l.token}
                  link={l}
                  onCopy={() => handleCopy(l.url, l.token)}
                  onRevoke={() => handleRevoke(l.token)}
                  isCopied={copied === l.token}
                  isRevoking={revoking === l.token}
                />
              ))}
            </div>
          )}

          {inactiveLinks.length > 0 && (
            <details className="mt-2">
              <summary className="text-text-gray text-xs cursor-pointer select-none">
                {inactiveLinks.length} expired / revoked link{inactiveLinks.length !== 1 ? "s" : ""}
              </summary>
              <div className="space-y-2 mt-2">
                {inactiveLinks.map((l) => (
                  <LinkRow
                    key={l.token}
                    link={l}
                    onCopy={() => handleCopy(l.url, l.token)}
                    onRevoke={() => {}}
                    isCopied={copied === l.token}
                    isRevoking={false}
                    inactive
                  />
                ))}
              </div>
            </details>
          )}

          {links.length === 0 && (
            <p className="text-text-gray text-xs">No share links yet.</p>
          )}
        </>
      )}
    </div>
  );
}

function LinkRow({
  link,
  onCopy,
  onRevoke,
  isCopied,
  isRevoking,
  inactive = false,
}: {
  link: SharedLink;
  onCopy: () => void;
  onRevoke: () => void;
  isCopied: boolean;
  isRevoking: boolean;
  inactive?: boolean;
}) {
  const expiresDate = new Date(link.expires_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const status = link.revoked_at
    ? "Revoked"
    : new Date(link.expires_at) <= new Date()
    ? "Expired"
    : `Expires ${expiresDate}`;

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 ${inactive ? "border-border opacity-50" : "border-border"}`}>
      <div className="min-w-0">
        {link.label && <p className="text-text text-xs font-medium truncate">{link.label}</p>}
        <p className="text-text-gray text-xs truncate">{link.url}</p>
        <p className="text-text-gray text-xs">{status}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onCopy}
          className="text-xs text-primary hover:opacity-80"
        >
          {isCopied ? "Copied!" : "Copy"}
        </button>
        {!inactive && (
          <button
            onClick={onRevoke}
            disabled={isRevoking}
            className="text-xs text-red hover:opacity-80 disabled:opacity-50"
          >
            {isRevoking ? "…" : "Revoke"}
          </button>
        )}
      </div>
    </div>
  );
}
