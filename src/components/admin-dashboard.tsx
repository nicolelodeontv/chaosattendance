"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Submission = {
  id: string;
  discordId: string;
  opId: string;
  discordUsername: string;
  ign: string;
  attending: boolean;
  hasPilot: boolean;
  pilotName: string | null;
  hours: number;
  notes: string | null;
  createdAt: string;
  isAdmin?: boolean;
};

type Admin = { discordId: string; username: string; createdAt: string };

type Tab = "submissions" | "settings" | "access";

export function AdminDashboard({ isOwner }: { isOwner: boolean }) {
  const [tab, setTab] = useState<Tab>("submissions");

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-line bg-panel/70 p-1">
        {(["submissions", "settings", "access"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "rounded-lg px-3 py-2 text-sm capitalize transition-colors",
              tab === t ? "bg-cyan/10 text-cyan" : "text-ink2 hover:bg-panel2 hover:text-ink",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "submissions" && <SubmissionsTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "access" && <AccessTab isOwner={isOwner} />}
    </div>
  );
}

function SubmissionsTab() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Submission | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/attendance");
    const data = await res.json();
    setRows(data.submissions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);
  async function remove(id: string) {
    if (!confirm(`Delete this submission? ${rows.find((row) => row.id === id)?.ign ?? "This member"} will be able to submit again.`)) return;
    await fetch("/api/attendance/" + id, { method: "DELETE" });
    setRows((r) => r.filter((row) => row.id !== id));
  }

  function exportCsv() {
    const header = [
      "Op",
      "IGN",
      "Discord",
      "Attendance",
      "Pilot",
      "Pilot Name",
      "Hours",
      "Notes",
      "Submitted",
    ];
    const lines = filtered.map((r) =>
      [
        r.opId,
        r.ign,
        r.discordUsername,
        r.attending ? "Attending" : "Not Attending",
        r.hasPilot ? "Have Pilot" : "No Pilot",
        r.pilotName ?? "",
        r.hours,
        (r.notes ?? "").replace(/"/g, '""'),
        new Date(r.createdAt).toISOString(),
      ]
        .map((v) => '"' + v + '"')
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = rows.filter((r) => {
    const query = filter.toLowerCase();
    return (
      r.opId.toLowerCase().includes(query) ||
      r.ign.toLowerCase().includes(query) ||
      r.discordUsername.toLowerCase().includes(query)
    );
  });

  return (
    <div className="premium-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
        <div>
          <p className="font-display text-sm text-ink">Submission log</p>
          <p className="mt-1 text-xs text-ink2">Search by op, IGN or Discord username.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <input
            type="text"
            placeholder="Filter submissions"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="min-w-0 flex-1 sm:w-64"
          />
          <button onClick={load} className="premium-button-secondary shrink-0 px-3">
            Refresh
          </button>
          <button onClick={exportCsv} className="premium-button-secondary hidden shrink-0 px-3 sm:inline-flex">
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-panel2/65 text-xs uppercase tracking-[0.08em] text-ink2">
              <th className="px-4 py-3 font-medium">Op</th>
              <th className="px-4 py-3 font-medium">IGN</th>
              <th className="px-4 py-3 font-medium">Discord</th>
              <th className="px-4 py-3 font-medium">Attendance</th>
              <th className="px-4 py-3 font-medium">Pilot</th>
              <th className="px-4 py-3 font-medium">Hours</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-ink2">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-ink2">
                  No submissions found.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-display text-xs text-cyan">{r.opId}</td>
                <td className="px-4 py-3 text-ink">
                  <button type="button" onClick={() => setSelected(r)} className="rounded text-left font-medium hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50">
                    {r.ign}
                  </button>
                  {r.isAdmin && (
                    <span className="ml-2 inline-flex rounded-full border border-cyan/30 bg-cyan/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-cyan">
                      Admin
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink2">{r.discordUsername}</td>
                <td className="px-4 py-3">
                  <Badge ok={r.attending} yes="Attending" no="Not Attending" />
                </td>
                <td className="px-4 py-3 text-ink2">
                  {r.hasPilot
                    ? "Have Pilot — " + (r.pilotName ?? "")
                    : "No Pilot"}
                </td>
                <td className="px-4 py-3 text-ink2">{r.hours}</td>
                <td className="max-w-[16rem] truncate px-4 py-3 text-ink2">
                  {r.notes ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink2">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => remove(r.id)}
                    className="rounded-md px-2 py-1 text-ink2 transition-colors hover:bg-red/5 hover:text-red"
                    aria-label="Delete submission"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected ? <SubmissionDetailModal selected={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function SubmissionDetailModal({
  selected,
  onClose,
}: {
  selected: Submission;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-detail-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto premium-card p-6 shadow-2xl sm:p-7">
        <SubmissionDetailHeader selected={selected} onClose={onClose} />
      </div>
    </div>,
    document.body
  );
}

function SubmissionDetailHeader({ selected, onClose }: { selected: Submission; onClose: () => void }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setAvatarLoading(true);
    setAvatarUrl(null);
    fetch(`/api/admin/discord-avatar?discordId=${encodeURIComponent(selected.discordId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (active) setAvatarUrl(data.avatarUrl ?? "https://cdn.discordapp.com/embed/avatars/0.png");
      })
      .catch(() => {
        if (active) setAvatarUrl("https://cdn.discordapp.com/embed/avatars/0.png");
      })
      .finally(() => {
        if (active) setAvatarLoading(false);
      });
    return () => { active = false; };
  }, [selected.discordId]);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-cyan">Submission detail</p>
          <h3 id="submission-detail-title" className="font-display text-xl text-ink">{selected.ign}</h3>
        </div>
        <button type="button" onClick={onClose} className="icon-button" aria-label="Close submission detail dialog">×</button>
      </div>
      <div className="mt-5 flex flex-col items-center text-center">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-line bg-panel2">
          {avatarLoading ? <div className="h-full w-full animate-pulse bg-panel2" aria-label="Loading Discord avatar" /> : <img src={avatarUrl ?? "https://cdn.discordapp.com/embed/avatars/0.png"} alt="" className="h-full w-full object-cover" />}
        </div>
        <p className="mt-3 font-medium text-ink">{selected.discordUsername}</p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel2/60 p-3"><p className="text-xs uppercase tracking-[0.12em] text-ink2">IGN</p><p className="mt-1.5 text-sm text-ink">{selected.ign}</p></div>
        <div className="rounded-lg border border-line bg-panel2/60 p-3"><p className="text-xs uppercase tracking-[0.12em] text-ink2">Attendance</p><p className="mt-1.5 text-sm text-ink">{selected.attending ? "Attending" : "Not Attending"}</p></div>
        <div className="rounded-lg border border-line bg-panel2/60 p-3"><p className="text-xs uppercase tracking-[0.12em] text-ink2">Pilot</p><p className="mt-1.5 text-sm text-ink">{selected.hasPilot ? "Have Pilot" : "No Pilot"}</p></div>
        {selected.hasPilot && <div className="rounded-lg border border-line bg-panel2/60 p-3"><p className="text-xs uppercase tracking-[0.12em] text-ink2">Pilot Name</p><p className="mt-1.5 text-sm text-ink">{selected.pilotName ?? "—"}</p></div>}
        <div className="rounded-lg border border-line bg-panel2/60 p-3"><p className="text-xs uppercase tracking-[0.12em] text-ink2">Hours</p><p className="mt-1.5 text-sm text-ink">{selected.hours}</p></div>
        <div className="rounded-lg border border-line bg-panel2/60 p-3 sm:col-span-2"><p className="text-xs uppercase tracking-[0.12em] text-ink2">Submitted</p><p className="mt-1.5 text-sm text-ink">{new Date(selected.createdAt).toLocaleString()}</p></div>
      </div>
      <div className="mt-3 rounded-lg border border-line bg-panel2/60 p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-ink2">Notes</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{selected.notes ?? "—"}</p>
      </div>
    </>
  );
}

function Badge({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span className={["inline-flex items-center gap-1.5", ok ? "text-cyan" : "text-red"].join(" ")}>
      <span
        className="status-dot"
        style={{ backgroundColor: ok ? "rgb(var(--cyan))" : "rgb(var(--red))" }}
      />
      {ok ? yes : no}
    </span>
  );
}

function SettingsTab() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [guildName, setGuildName] = useState("");
  const [currentOpId, setCurrentOpId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setWebhookUrl(d.settings?.webhookUrl ?? "");
        setGuildName(d.settings?.guildName ?? "Squadron");
        setCurrentOpId(d.settings?.currentOpId ?? "current");
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookUrl, guildName, currentOpId }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  if (loading) return <p className="text-sm text-ink2">Loading…</p>;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
      <div className="space-y-5">
        <div className="premium-card p-6">
          <p className="font-display text-sm text-ink">Operation</p>
          <p className="mt-1 text-xs leading-5 text-ink2">
            The current op ID is the lock scope. Changing it starts a new submission window while keeping previous ops in the admin log.
          </p>
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-ink">Current op ID</label>
            <input
              type="text"
              value={currentOpId}
              onChange={(e) => setCurrentOpId(e.target.value)}
              placeholder="FD-2026-S2"
              maxLength={80}
            />
          </div>
        </div>

        <div className="premium-card p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink">Squadron / server name</label>
            <input
              type="text"
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
              placeholder="Squadron"
            />
          </div>

          <div className="mt-5 space-y-2">
            <label className="text-sm font-medium text-ink">Discord webhook URL</label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/…"
            />
            <p className="text-xs leading-5 text-ink2">
              Every new submission posts here. Leave blank to fall back to the
              DISCORD_WEBHOOK_URL environment variable.
            </p>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="premium-button mt-6 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save settings"}
          </button>
        </div>
      </div>

      <div className="premium-card h-fit p-6">
        <p className="font-display text-sm text-ink">Lock behavior</p>
        <p className="mt-2 text-sm leading-6 text-ink2">
          A Discord account can create one submission per op. The server rejects duplicate POSTs with HTTP 409, and the form is hidden on page load once a matching submission exists.
        </p>
        <p className="mt-3 text-xs leading-5 text-ink2">
          Admin deletion removes the stored submission, which allows that member to submit again for the same op when a correction is needed.
        </p>
      </div>
    </div>
  );
}

function AccessTab({ isOwner }: { isOwner: boolean }) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/admins");
    const data = await res.json();
    setAdmins(data.admins ?? []);
    setOwnerId(data.ownerDiscordId ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newId.trim()) return;
    await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId: newId.trim(), username: newName.trim() }),
    });
    setNewId("");
    setNewName("");
    load();
  }

  async function removeAdmin(discordId: string) {
    if (!confirm("Remove this admin?")) return;
    await fetch("/api/admin/admins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId }),
    });
    load();
  }

  if (loading) return <p className="text-sm text-ink2">Loading…</p>;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="premium-card p-6">
        <p className="font-display text-sm text-ink">Owner</p>
        <p className="mt-1 text-sm leading-6 text-ink2">
          {ownerId ?? "Not set"} — always has admin access, set via the OWNER_DISCORD_ID
          environment variable.
        </p>
      </div>

      <div className="premium-card p-6">
        <p className="mb-3 font-display text-sm text-ink">Admins</p>
        <ul className="mb-4 space-y-2">
          {admins.length === 0 && <li className="text-sm text-ink2">No additional admins yet.</li>}
          {admins.map((a) => (
            <li
              key={a.discordId}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel2/60 px-3 py-2.5 text-sm"
            >
              <span className="min-w-0 text-ink">
                <span className="font-medium">{a.username}</span>{" "}
                <span className="text-ink2">— {a.discordId}</span>
              </span>
              <button
                onClick={() => removeAdmin(a.discordId)}
                className="shrink-0 rounded-md px-2 py-1 text-ink2 transition-colors hover:bg-red/5 hover:text-red"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={addAdmin} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem] flex-1 space-y-1.5">
            <label className="text-xs text-ink2">Discord user ID</label>
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="123456789012345678"
            />
          </div>
          <div className="min-w-[8rem] flex-1 space-y-1.5">
            <label className="text-xs text-ink2">Label (optional)</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Display name"
            />
          </div>
          <button type="submit" className="premium-button px-4">
            Add
          </button>
        </form>
        <p className="mt-3 text-xs leading-5 text-ink2">
          Find a Discord user ID: enable Developer Mode in Discord settings, then right-click
          the user and choose "Copy User ID".
        </p>
      </div>
    </div>
  );
}
