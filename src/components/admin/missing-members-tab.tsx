"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BaseModal } from "@/components/modal";
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

type ManualSubmissionFormState = {
  ign: string;
  attending: boolean;
  hasPilot: boolean;
  pilotName: string;
  hours: string;
  notes: string;
};

const EMPTY_MANUAL_SUBMISSION_FORM: ManualSubmissionFormState = {
  ign: "",
  attending: true,
  hasPilot: false,
  pilotName: "",
  hours: "",
  notes: "",
};

const ROSTER_STALE_AFTER_MS = 5 * 60 * 1000;
const FALLBACK_AVATAR_URL = "https://cdn.discordapp.com/embed/avatars/0.png";

// This module-level cache survives when the admin console switches tabs and
// React unmounts MissingMembersTab. The API is refreshed only after 5 minutes.
let cachedRosterResponse: MissingMembersResponse | null = null;

export function MissingMembersTab({ onCreated, canCreateManualSubmission = true }: { onCreated?: () => void; canCreateManualSubmission?: boolean }) {
  const [data, setData] = useState<MissingMembersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [manualTarget, setManualTarget] = useState<MissingMember | null>(null);
  const [manualForm, setManualForm] = useState<ManualSubmissionFormState>({ ...EMPTY_MANUAL_SUBMISSION_FORM });
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  function openManualSubmission(member: MissingMember) {
    setManualTarget(member);
    setManualForm({ ...EMPTY_MANUAL_SUBMISSION_FORM });
    setManualError("");
    setSuccessMessage("");
  }

  function closeManualSubmission() {
    if (manualSaving) return;
    setManualTarget(null);
    setManualError("");
  }

  async function createManualSubmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualTarget || manualSaving) return;

    setManualSaving(true);
    setManualError("");
    try {
      const response = await fetch("/api/admin/manual-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: manualTarget.id,
          ign: manualForm.ign,
          attending: manualForm.attending,
          hasPilot: manualForm.hasPilot,
          pilotName: manualForm.pilotName,
          hours: manualForm.hours,
          notes: manualForm.notes,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save the manual submission.");
      }

      const memberName = manualTarget.nick || manualTarget.globalName || manualTarget.username;
      setManualTarget(null);
      setManualForm({ ...EMPTY_MANUAL_SUBMISSION_FORM });
      setSuccessMessage("Manual submission saved for " + memberName + ".");
      onCreated?.();
      await refresh();
    } catch (err: unknown) {
      setManualError(err instanceof Error ? err.message : "Unable to save the manual submission.");
    } finally {
      setManualSaving(false);
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
    <>
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

      {successMessage ? (
        <p className="mx-4 mt-4 rounded-lg border border-orange/30 bg-orange/5 px-3 py-2.5 text-sm text-orange" role="status">
          {successMessage}
        </p>
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
                <div className="flex shrink-0 items-center gap-2">
                  {canCreateManualSubmission ? (
                    <button
                      type="button"
                      onClick={() => openManualSubmission(member)}
                      className="shrink-0 rounded-md border border-orange/50 bg-orange/5 px-2 py-1.5 text-xs font-semibold text-orange transition-colors hover:border-orange hover:bg-orange/10"
                      title={"Add a manual submission for " + (member.nick || member.globalName || member.username)}
                    >
                      Add submission
                    </button>
                  ) : null}
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

      <BaseModal
        open={Boolean(manualTarget)}
        title="Add submission"
        titleId="manual-submission-title"
        message={manualTarget ? "This will be saved for operation " + (data?.opId || "current") + " on behalf of this Discord member." : undefined}
        messageId="manual-submission-description"
        onClose={closeManualSubmission}
        closeOnEscape={!manualSaving}
        closeOnBackdrop={!manualSaving}
        cardClassName="!max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-5 sm:p-6"
      >
        {manualTarget ? (
          <form id="manual-submission-form" onSubmit={createManualSubmission} className="mt-4 space-y-4">
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-line bg-panel2/60 p-3">
              <img
                src={manualTarget.avatarUrl || FALLBACK_AVATAR_URL}
                width={44}
                height={44}
                loading="lazy"
                decoding="async"
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover"
                onError={(event) => {
                  const image = event.currentTarget;
                  if (image.dataset.fallbackApplied === "true") return;
                  image.dataset.fallbackApplied = "true";
                  image.src = FALLBACK_AVATAR_URL;
                }}
              />
              <div className="min-w-0 flex-1">
                <DiscordMemberName
                  nick={manualTarget.nick}
                  globalName={manualTarget.globalName}
                  username={manualTarget.username}
                  alwaysShowUsername
                />
                <p className="mt-1 text-xs text-ink2">Discord ID: {manualTarget.id}</p>
              </div>
            </div>

            <label className="block text-sm text-ink" htmlFor="manual-ign">
              IGN
              <input
                id="manual-ign"
                name="ign"
                value={manualForm.ign}
                onChange={(event) => setManualForm((current) => ({ ...current, ign: event.target.value }))}
                maxLength={64}
                required
                autoComplete="off"
                className="mt-1 w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-orange"
                placeholder="In-game name"
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm text-ink" htmlFor="manual-attendance">
                Attendance
                <select
                  id="manual-attendance"
                  name="attending"
                  value={manualForm.attending ? "attending" : "not-attending"}
                  onChange={(event) => setManualForm((current) => ({ ...current, attending: event.target.value === "attending" }))}
                  className="mt-1 w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-orange"
                >
                  <option value="attending">Attending</option>
                  <option value="not-attending">Not attending</option>
                </select>
              </label>
              <label className="block text-sm text-ink" htmlFor="manual-pilot-status">
                Pilot status
                <select
                  id="manual-pilot-status"
                  name="hasPilot"
                  value={manualForm.hasPilot ? "yes" : "no"}
                  onChange={(event) => setManualForm((current) => ({ ...current, hasPilot: event.target.value === "yes" }))}
                  className="mt-1 w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-orange"
                >
                  <option value="no">No Pilot</option>
                  <option value="yes">Have Pilot</option>
                </select>
              </label>
            </div>

            {manualForm.hasPilot ? (
              <label className="block text-sm text-ink" htmlFor="manual-pilot-name">
                Pilot name
                <input
                  id="manual-pilot-name"
                  name="pilotName"
                  value={manualForm.pilotName}
                  onChange={(event) => setManualForm((current) => ({ ...current, pilotName: event.target.value }))}
                  maxLength={64}
                  required={manualForm.hasPilot}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-orange"
                  placeholder="Pilot name"
                />
              </label>
            ) : null}

            <label className="block text-sm text-ink" htmlFor="manual-hours">
              Hours
              <input
                id="manual-hours"
                name="hours"
                type="number"
                min="0"
                step="0.5"
                value={manualForm.hours}
                onChange={(event) => setManualForm((current) => ({ ...current, hours: event.target.value }))}
                required
                className="mt-1 w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-orange"
                placeholder="0"
              />
            </label>

            <label className="block text-sm text-ink" htmlFor="manual-notes">
              Notes <span className="text-ink2">(optional)</span>
              <textarea
                id="manual-notes"
                name="notes"
                value={manualForm.notes}
                onChange={(event) => setManualForm((current) => ({ ...current, notes: event.target.value }))}
                maxLength={500}
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-orange"
                placeholder="Optional details"
              />
            </label>

            {manualError ? (
              <div className="rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-red" role="alert" aria-live="assertive">
                {manualError}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeManualSubmission}
                disabled={manualSaving}
                className="premium-button-secondary px-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={manualSaving}
                className="inline-flex min-h-[42px] items-center justify-center rounded-[10px] border border-orange bg-orange px-4 text-sm font-semibold text-black transition-colors hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
              >
                {manualSaving ? "Saving…" : "Save submission"}
              </button>
            </div>
          </form>
        ) : null}
      </BaseModal>
    </>
  );
}
