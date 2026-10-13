"use client";

import { useEffect, useState } from "react";
import { DiscordMemberName } from "@/components/discord-member-name";

type MissingMember = {
  id: string;
  nick: string | null;
  globalName: string | null;
  username: string;
  avatar: string | null;
  memberAvatar: string | null;
  avatarUrl: string;
};
type MissingMembersResponse = {
  opId: string;
  rosterCount: number;
  submittedCount: number;
  missingCount: number;
  missing: MissingMember[];
  syncedAt: string;
  scope: "configured-role" | "configured-channel-viewers" | "configured-role-and-channel" | "all-server-members";
};

const ROSTER_STALE_AFTER_MS = 5 * 60 * 1000;
const FALLBACK_AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/0.png";

// This module-level cache survives when the admin console switches tabs and
// React unmounts MissingMembersTab. The API is refreshed only after 5 minutes.
let cachedRosterResponse: MissingMembersResponse | null = null;

export function MissingMembersTab() {
  const [data, setData] = useState<MissingMembersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    setData(null);
    setCopiedId("");
    try {
      const response = await fetch("/api/admin/missing-members", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Unable to sync the Discord roster.");
      }
      const rosterResponse = payload as MissingMembersResponse;
      cachedRosterResponse = rosterResponse;
      setData(rosterResponse);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to sync the Discord roster.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cached = cachedRosterResponse;
    const syncedAt = cached ? Date.parse(cached.syncedAt) : Number.NaN;
    const isFresh = Number.isFinite(syncedAt) &&
      Date.now() - syncedAt < ROSTER_STALE_AFTER_MS;

    if (cached && isFresh) {
      setData(cached);
      setError("");
      return;
    }

    void refresh();
  }, []);

  return (
    <section className="premium-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
        <div>
          <p className="font-display text-sm text-ink">Members who haven’t submitted</p>
          <p className="mt-1 text-xs leading-5 text-ink2">
            Compares the live Discord roster with submissions for the current operation. Members are matched by Discord account ID, not display name.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="premium-button-secondary shrink-0 px-3 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Syncing…" : "Refresh roster"}
        </button>
      </div>

      {error ? (
        <div className="m-4 rounded-lg border border-red/30 bg-red/5 p-4 text-sm text-red" role="alert">
          <p>{error}</p>
          <p className="mt-2 text-xs leading-5">
            This view needs a valid DISCORD_BOT_TOKEN and Discord’s Server Members intent. If DISCORD_ROSTER_CHANNEL_ID is set, only people who can View Channel there are counted; the bot must also be able to view that channel. DISCORD_MEMBER_ROLE_ID, if set, applies as an additional filter.
          </p>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
            {[
              { label: "Discord roster", value: data.rosterCount },
              { label: "Submitted", value: data.submittedCount },
              { label: "Still missing", value: data.missingCount },
            ].map((item) => (
              <div key={item.label} className="premium-card min-w-0 p-3">
                <p className="text-[11px] uppercase tracking-[0.1em] text-ink2">{item.label}</p>
                <p className="mt-1 font-display text-xl text-ink">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3 text-xs text-ink2">
            <span>Operation: <span className="font-medium text-ink">{data.opId}</span></span>
            <span>Synced {new Date(data.syncedAt).toLocaleString()}</span>
          </div>
          <div className="border-t border-line">
            {data.missing.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <img
                  src={member.avatarUrl}
                  width={36}
                  height={36}
                  loading="lazy"
                  decoding="async"
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                  onError={(event) => {
                    const image = event.currentTarget;
                    if (image.dataset.fallbackApplied === "true") return;
                    image.dataset.fallbackApplied = "true";
                    image.src = FALLBACK_AVATAR_URL;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <DiscordMemberName
                    nick={member.nick}
                    globalName={member.globalName}
                    username={member.username}
                    alwaysShowUsername
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (!navigator.clipboard?.writeText) {
                        throw new Error("Clipboard access is unavailable in this browser.");
                      }
                      await navigator.clipboard.writeText(member.id);
                      setCopiedId(member.id);
                    } catch {
                      setError("Could not copy the Discord ID. Check clipboard permissions and try again.");
                    }
                  }}
                  className="shrink-0 rounded-md border border-line px-2 py-1.5 text-xs text-ink2 transition-colors hover:border-cyan/40 hover:text-cyan"
                  title="Copy Discord account ID"
                >
                  {copiedId === member.id ? "Copied" : "Copy ID"}
                </button>
              </div>
            ))}
            {data.missingCount === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-ink2">Everyone in the counted roster has submitted for this operation.</p>
            ) : null}
          </div>
          <p className="border-t border-line px-4 py-3 text-xs leading-5 text-ink2">
            {data.scope === "configured-channel-viewers"
              ? "Roster scope: non-bot members who can View Channel in the configured Discord channel."
              : data.scope === "configured-role-and-channel"
                ? "Roster scope: members with the configured role who can also View Channel in the configured Discord channel."
                : data.scope === "configured-role"
                  ? "Roster scope: non-bot members with the configured Discord role."
                  : "Roster scope: all non-bot members of the Discord server."}
          </p>
        </>
      ) : null}
    </section>
  );
}
