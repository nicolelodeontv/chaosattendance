"use client";

import { useEffect, useState } from "react";
import { DeadlinePicker } from "@/components/deadline-picker";
import { ToastContainer, type ToastItem } from "@/components/toast";

function toDateTimeLocalValue(value: string | Date | null | undefined): string {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );

  return local.toISOString().slice(0, 16);
}
export function SettingsTab() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [guildName, setGuildName] = useState("");
  const [currentOpId, setCurrentOpId] = useState("");
  const [savedOpId, setSavedOpId] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [deadlineTouched, setDeadlineTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setWebhookUrl(d.settings?.webhookUrl ?? "");
        setNotificationsEnabled(d.settings?.notificationsEnabled !== false);
        const loadedOpId = d.settings?.currentOpId ?? "current";
        setGuildName(d.settings?.guildName ?? "Squadron");
        setCurrentOpId(loadedOpId);
        setSavedOpId(loadedOpId);
        setSubmissionDeadline(
          toDateTimeLocalValue(d.settings?.submissionDeadline)
        );
        setDeadlineTouched(false);
        setLoading(false);
      });
  }, []);

  function showToast(message: string) {
    setToasts((current) => [
      ...current,
      { id: window.crypto.randomUUID(), message },
    ]);
  }

  function dismissToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  async function save() {
    setSaving(true);

    const payload: Record<string, unknown> = {
      webhookUrl,
      notifyDiscord: notificationsEnabled,
      guildName,
      currentOpId,
    };

    const opChanged = currentOpId.trim() !== savedOpId.trim();
    if (opChanged && !deadlineTouched) {
      payload.submissionDeadline = null;
    } else if (deadlineTouched) {
      payload.submissionDeadline = submissionDeadline
        ? new Date(submissionDeadline).toISOString()
        : null;
    }

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data.error || "Unable to save settings");
        return;
      }

      const saved = data.settings ?? {};
      const nextOpId = saved.currentOpId ?? (currentOpId.trim() || "current");
      setCurrentOpId(nextOpId);
      setSavedOpId(nextOpId);
      setSubmissionDeadline(toDateTimeLocalValue(saved.submissionDeadline));
      setDeadlineTouched(false);
      showToast("Settings saved");
    } finally {
      setSaving(false);
    }
  }

  function extendDeadline(hours: number) {
    const existing = submissionDeadline ? new Date(submissionDeadline) : null;
    const base =
      existing && !Number.isNaN(existing.getTime()) && existing.getTime() > Date.now()
        ? existing
        : new Date();

    setSubmissionDeadline(
      toDateTimeLocalValue(new Date(base.getTime() + hours * 60 * 60 * 1000))
    );
    setDeadlineTouched(true);
  }

  function removeDeadline() {
    setSubmissionDeadline("");
    setDeadlineTouched(true);
  }

  if (loading) return <p className="text-sm text-ink2">Loading…</p>;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
      <div className="space-y-5">
        <div className="premium-card p-6">
          <p className="font-display text-sm text-ink">Operation</p>
          <p className="mt-1 text-xs leading-5 text-ink2">
            The current op ID is the lock scope. Changing it starts a new submission window while keeping previous ops in the admin log.
          </p>
          <div className="mt-4 space-y-2">
            <label htmlFor="settings-current-op-id" className="text-sm font-medium text-ink">Current op ID</label>
            <input
              id="settings-current-op-id"
              type="text"
              value={currentOpId}
              onChange={(e) => setCurrentOpId(e.target.value)}
              placeholder="FD-2026-S2"
              maxLength={80}
            />
          </div>

          <div className="mt-5 space-y-2">
            <label htmlFor="settings-submission-deadline" className="text-sm font-medium text-ink">
              Submission deadline
            </label>
            <DeadlinePicker
              id="settings-submission-deadline"
              value={submissionDeadline}
              onChange={(value) => {
                setSubmissionDeadline(value);
                setDeadlineTouched(true);
              }}
            />
            <p className="text-xs leading-5 text-ink2">
              The deadline uses your browser&apos;s local time. Leave it blank to keep submissions open.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className="premium-button-secondary px-3" onClick={() => extendDeadline(1)}>
                Extend 1 hour
              </button>
              <button type="button" className="premium-button-secondary px-3" onClick={() => extendDeadline(24)}>
                Extend 24 hours
              </button>
              <button type="button" className="premium-button-secondary px-3" onClick={removeDeadline}>
                Remove deadline
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-ink2">
            Changing the op ID also clears the submission deadline.
          </p>
        </div>

        <div className="premium-card p-6">
          <div className="space-y-2">
            <label htmlFor="settings-guild-name" className="text-sm font-medium text-ink">Squadron / server name</label>
            <input
              id="settings-guild-name"
              type="text"
              value={guildName}
              onChange={(e) => setGuildName(e.target.value)}
              placeholder="Squadron"
            />
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">Discord notifications</p>
                <p className="mt-1 text-xs leading-5 text-ink2">
                  Post successful attendance submissions and updates to Discord.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                aria-label="Enable Discord notifications"
                onClick={() => setNotificationsEnabled((value) => !value)}
                className={[
                  "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 motion-reduce:transition-none",
                  notificationsEnabled ? "border-cyan bg-cyan/20" : "border-line bg-panel2",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-5 w-5 rounded-full bg-current transition-transform duration-150 motion-reduce:transition-none",
                    notificationsEnabled ? "translate-x-6 text-cyan" : "translate-x-1 text-ink2",
                  ].join(" ")}
                />
              </button>
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-webhook-url" className="text-sm font-medium text-ink">Discord webhook URL</label>
              <input
                id="settings-webhook-url"
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/…"
                disabled={!notificationsEnabled}
              />
              <p className="text-xs leading-5 text-ink2">
                Leave the URL blank to use DISCORD_WEBHOOK_URL. Turning notifications off overrides both sources until re-enabled.
              </p>
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="premium-button mt-6 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>

      <div className="premium-card h-fit p-6">
        <p className="font-display text-sm text-ink">Lock behavior</p>
        <p className="mt-2 text-sm leading-6 text-ink2">
          A Discord account can create one submission per op. The server rejects duplicate POSTs with HTTP 409, and the form is hidden on page load once a matching submission exists.
        </p>
        <p className="mt-3 text-xs leading-5 text-ink2">
          Only the owner can set, extend, or remove the submission deadline. Existing submissions remain visible after the deadline passes.
        </p>
        <p className="mt-3 text-xs leading-5 text-ink2">
          Admin deletion removes the stored submission, which allows that member to submit again for the same op when a correction is needed.
        </p>
      </div>
      </div>
    </>
  );
}
