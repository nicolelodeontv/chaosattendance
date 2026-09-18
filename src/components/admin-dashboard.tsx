"use client";

import { useEffect, useState } from "react";

type Submission = {
  id: string;
  discordUsername: string;
  ign: string;
  attending: boolean;
  hasPilot: boolean;
  pilotName: string | null;
  hours: number;
  notes: string | null;
  createdAt: string;
};

type Admin = { discordId: string; username: string; createdAt: string };

type Tab = "submissions" | "settings" | "access";

export function AdminDashboard({ isOwner }: { isOwner: boolean }) {
  const [tab, setTab] = useState<Tab>("submissions");

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-line">
        {(["submissions", "settings", "access"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-cyan text-ink"
                : "text-ink2 hover:text-ink"
            }`}
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
    if (!confirm("Delete this submission?")) return;
    await fetch(`/api/attendance/${id}`, { method: "DELETE" });
    setRows((r) => r.filter((row) => row.id !== id));
  }

  function exportCsv() {
    const header = ["IGN", "Discord", "Attendance", "Pilot", "Pilot Name", "Hours", "Notes", "Submitted"];
    const lines = filtered.map((r) =>
      [
        r.ign,
        r.discordUsername,
        r.attending ? "Attending" : "Not Attending",
        r.hasPilot ? "Have Pilot" : "No Pilot",
        r.pilotName ?? "",
        r.hours,
        (r.notes ?? "").replace(/"/g, '""'),
        new Date(r.createdAt).toISOString(),
      ]
        .map((v) => `"${v}"`)
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

  const filtered = rows.filter(
    (r) =>
      r.ign.toLowerCase().includes(filter.toLowerCase()) ||
      r.discordUsername.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Filter by IGN or Discord username"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="rounded border border-line px-3 py-1.5 text-sm text-ink2 hover:border-cyan hover:text-cyan"
          >
            Export CSV
          </button>
          <button
            onClick={load}
            className="rounded border border-line px-3 py-1.5 text-sm text-ink2 hover:border-cyan hover:text-cyan"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-line">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-ink2">
              <th className="px-3 py-2 font-normal">IGN</th>
              <th className="px-3 py-2 font-normal">Discord</th>
              <th className="px-3 py-2 font-normal">Attendance</th>
              <th className="px-3 py-2 font-normal">Pilot</th>
              <th className="px-3 py-2 font-normal">Hours</th>
              <th className="px-3 py-2 font-normal">Notes</th>
              <th className="px-3 py-2 font-normal">Submitted</th>
              <th className="px-3 py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-ink2">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-ink2">
                  No submissions yet.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2 text-ink">{r.ign}</td>
                <td className="px-3 py-2 text-ink2">{r.discordUsername}</td>
                <td className="px-3 py-2">
                  <Badge ok={r.attending} yes="Attending" no="Not Attending" />
                </td>
                <td className="px-3 py-2 text-ink2">
                  {r.hasPilot ? `Have Pilot — ${r.pilotName}` : "No Pilot"}
                </td>
                <td className="px-3 py-2 text-ink2">{r.hours}</td>
                <td className="max-w-[16rem] truncate px-3 py-2 text-ink2">{r.notes ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-ink2">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => remove(r.id)}
                    className="text-ink2 hover:text-red"
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
    </div>
  );
}

function Badge({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${ok ? "text-cyan" : "text-red"}`}>
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setWebhookUrl(d.settings?.webhookUrl ?? "");
        setGuildName(d.settings?.guildName ?? "Squadron");
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookUrl, guildName }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-sm text-ink2">Loading…</p>;

  return (
    <div className="max-w-lg space-y-5 rounded border border-line bg-panel p-6">
      <div className="space-y-1.5">
        <label className="text-sm text-ink2">Squadron / server name</label>
        <input
          type="text"
          value={guildName}
          onChange={(e) => setGuildName(e.target.value)}
          placeholder="Squadron"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-ink2">Discord webhook URL</label>
        <input
          type="text"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/…"
        />
        <p className="text-xs text-ink2">
          Every new submission posts here. Leave blank to fall back to the
          DISCORD_WEBHOOK_URL environment variable.
        </p>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="rounded border border-amber bg-amber/10 px-4 py-2 text-sm text-amber hover:bg-amber/20 disabled:opacity-50"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save settings"}
      </button>
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
    <div className="max-w-xl space-y-6">
      <div className="rounded border border-line bg-panel p-6">
        <p className="mb-1 font-display text-sm text-ink">Owner</p>
        <p className="text-sm text-ink2">
          {ownerId ?? "Not set"} — always has admin access, set via the OWNER_DISCORD_ID
          environment variable.
        </p>
      </div>

      <div className="rounded border border-line bg-panel p-6">
        <p className="mb-3 font-display text-sm text-ink">Admins</p>
        <ul className="mb-4 space-y-2">
          {admins.length === 0 && <li className="text-sm text-ink2">No additional admins yet.</li>}
          {admins.map((a) => (
            <li
              key={a.discordId}
              className="flex items-center justify-between rounded border border-line px-3 py-2 text-sm"
            >
              <span className="text-ink">
                {a.username} <span className="text-ink2">— {a.discordId}</span>
              </span>
              <button onClick={() => removeAdmin(a.discordId)} className="text-ink2 hover:text-red">
                Remove
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={addAdmin} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem] flex-1 space-y-1">
            <label className="text-xs text-ink2">Discord user ID</label>
            <input type="text" value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="123456789012345678" />
          </div>
          <div className="min-w-[8rem] flex-1 space-y-1">
            <label className="text-xs text-ink2">Label (optional)</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Display name" />
          </div>
          <button
            type="submit"
            className="rounded border border-cyan bg-cyan/10 px-4 py-2 text-sm text-cyan hover:bg-cyan/20"
          >
            Add
          </button>
        </form>
        <p className="mt-3 text-xs text-ink2">
          Find a Discord user ID: enable Developer Mode in Discord settings, then right-click
          the user and choose "Copy User ID".
        </p>
      </div>
    </div>
  );
}
