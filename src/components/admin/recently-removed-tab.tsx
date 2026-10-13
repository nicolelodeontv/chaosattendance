"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ToastContainer, type ToastItem } from "@/components/toast";

const ARCHIVE_SETUP_MESSAGE = "The archive table hasn't been created in the database. Run docs/sql/deleted-submission.sql in your database's SQL editor, then press Refresh.";
const RECENTLY_REMOVED_PAGE_SIZE = 2;

type DeletedSubmission = {
  id: string;
  originalId: string;
  opId: string;
  discordId: string;
  discordUsername: string;
  discordAvatar: string | null;
  ign: string;
  attending: boolean;
  hasPilot: boolean;
  pilotName: string | null;
  hours: number;
  notes: string | null;
  createdAt: string;
  deletedAt: string;
  deletedByDiscordId: string;
  deletedByUsername: string | null;
};

function PaginationControls({ page, pageCount, onPageChange, label }: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label: string;
}) {
  if (pageCount <= 1) return null;
  const items: Array<number | "ellipsis"> = pageCount <= 5
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : page <= 3
      ? [1, 2, 3, 4, "ellipsis", pageCount]
      : page >= pageCount - 2
        ? [1, "ellipsis", pageCount - 3, pageCount - 2, pageCount - 1, pageCount]
        : [1, "ellipsis", page - 1, page, page + 1, "ellipsis", pageCount];
  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5 border-t border-line px-3 py-4 sm:px-4" aria-label={label}>
      <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="min-h-9 rounded-md border border-line bg-panel2 px-3 text-sm font-medium text-ink2 transition-colors hover:border-orange/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
      {items.map((item, index) => item === "ellipsis" ? (
        <span key={"ellipsis-" + index} className="px-1.5 text-sm text-ink2" aria-hidden="true">…</span>
      ) : (
        <button key={item} type="button" onClick={() => onPageChange(item)} aria-current={page === item ? "page" : undefined} className={[
          "min-h-9 min-w-9 rounded-md border px-2.5 text-sm font-medium transition-colors",
          page === item ? "border-orange bg-orange/10 text-orange" : "border-line bg-panel2 text-ink2 hover:border-orange/50 hover:text-ink",
        ].join(" ")}>{item}</button>
      ))}
      <button type="button" onClick={() => onPageChange(Math.min(pageCount, page + 1))} disabled={page === pageCount} className="min-h-9 rounded-md border border-line bg-panel2 px-3 text-sm font-medium text-ink2 transition-colors hover:border-orange/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40">Next</button>
    </nav>
  );
}

export function RecentlyRemovedTab({ onRestored, isOwner }: { onRestored: () => void; isOwner: boolean }) {
  const [rows, setRows] = useState<DeletedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [archiveSetupRequired, setArchiveSetupRequired] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<DeletedSubmission | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [archivePage, setArchivePage] = useState(1);
  const [clearArchiveOpen, setClearArchiveOpen] = useState(false);
  const [clearArchiveLoading, setClearArchiveLoading] = useState(false);
  const [clearArchiveError, setClearArchiveError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setArchiveSetupRequired(false);
    try {
      const res = await fetch("/api/admin/deleted-submissions", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "ARCHIVE_NOT_SET_UP") {
          setRows([]);
          setArchiveSetupRequired(true);
          return;
        }
        throw new Error(data.error || "Unable to load recently removed submissions.");
      }
      setRows((data.submissions ?? []) as DeletedSubmission[]);
      setArchivePage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load recently removed submissions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
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

  function requestClearArchive() {
    if (rows.length === 0 || clearArchiveLoading) return;
    setClearArchiveError("");
    setClearArchiveOpen(true);
  }

  async function clearArchive() {
    if (rows.length === 0) return;
    setClearArchiveLoading(true);
    setClearArchiveError("");
    try {
      const res = await fetch("/api/admin/deleted-submissions", {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "ARCHIVE_NOT_SET_UP") {
          setArchiveSetupRequired(true);
        }
        throw new Error(data.error || "Unable to clear the recently removed archive.");
      }
      setRows([]);
      setArchivePage(1);
      setClearArchiveOpen(false);
      showToast((data.deleted ?? 0) + " archived submissions permanently deleted");
    } catch (err: unknown) {
      setClearArchiveError(
        err instanceof Error ? err.message : "Unable to clear the recently removed archive."
      );
    } finally {
      setClearArchiveLoading(false);
    }
  }

  async function restore(id: string) {
    setRestoreLoading(true);
    setRestoreError("");
    try {
      const res = await fetch("/api/admin/deleted-submissions/" + id + "/restore", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "ARCHIVE_NOT_SET_UP") {
          setArchiveSetupRequired(true);
          throw new Error(data.error || "Recently removed isn't set up yet. The archive table hasn't been created.");
        }
        throw new Error(data.error || "Unable to restore submission.");
      }

      setArchiveSetupRequired(false);
      setRestoreTarget(null);
      await load();
      onRestored();
      showToast("Submission restored");
    } catch (err: unknown) {
      setRestoreError(err instanceof Error ? err.message : "Unable to restore submission.");
    } finally {
      setRestoreLoading(false);
    }
  }

  const archivePageCount = Math.max(1, Math.ceil(rows.length / RECENTLY_REMOVED_PAGE_SIZE));
  const safeArchivePage = Math.min(archivePage, archivePageCount);
  const pagedRows = rows.slice(
    (safeArchivePage - 1) * RECENTLY_REMOVED_PAGE_SIZE,
    safeArchivePage * RECENTLY_REMOVED_PAGE_SIZE
  );

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="premium-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
          <div>
            <p className="font-display text-sm text-ink">Recently removed</p>
            <p className="mt-1 text-xs text-ink2">Archived removals from the last 30 days.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="premium-button-secondary shrink-0 px-3"
            >
              Refresh
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={requestClearArchive}
                disabled={rows.length === 0 || loading || clearArchiveLoading}
                className="inline-flex min-h-[42px] shrink-0 items-center justify-center rounded-[10px] border border-red/70 bg-red/5 px-3 text-sm font-semibold text-red transition-colors hover:border-red hover:bg-red/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove all ({rows.length})
              </button>
            )}
          </div>
        </div>

        {archiveSetupRequired ? (
          <div className="m-4 rounded-xl border border-line bg-panel2/60 p-4" role="status">
            <p className="font-display text-sm text-ink">Recently removed isn't set up yet</p>
            <p className="mt-1 text-sm leading-6 text-ink2">{ARCHIVE_SETUP_MESSAGE}</p>
          </div>
        ) : null}
        {!archiveSetupRequired && error ? (
          <div className="m-4 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-red" role="alert">
            {error}
          </div>
        ) : null}

        <div className="space-y-2 p-3 sm:p-4">
          {loading ? (
            <div className="px-3 py-8 text-center text-sm text-ink2">Loading…</div>
          ) : null}
          {!loading && !archiveSetupRequired && rows.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-ink2">
              No recently removed submissions.
            </div>
          ) : null}
          {!loading && !archiveSetupRequired && pagedRows.map((row) => (
            <div key={row.id} className="rounded-xl border border-line bg-panel2/60 p-3.5 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <p className="data-clip max-w-full font-medium text-ink" title={row.ign}>{row.ign}</p>
                    <span className="data-clip max-w-[10rem] font-display text-xs text-cyan" title={row.opId}>{row.opId}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink2"><span className="data-clip" title={row.discordUsername.trim() || row.discordId}>{row.discordUsername.trim() || row.discordId}</span></p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRestoreTarget(row);
                    setRestoreError("");
                  }}
                  className="premium-button shrink-0 px-3"
                >
                  Restore
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-line bg-panel p-2.5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-ink2">Attendance</p>
                  <p className="data-clip mt-1 text-sm text-ink" title={row.attending ? "Attending" : "Not Attending"}>{row.attending ? "Attending" : "Not Attending"}</p>
                </div>
                <div className="rounded-lg border border-line bg-panel p-2.5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-ink2">Hours</p>
                  <p className="data-clip mt-1 text-sm text-ink" title={String(row.hours)}>{row.hours}</p>
                </div>
                <div className="rounded-lg border border-line bg-panel p-2.5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-ink2">Removed</p>
                  <p className="data-clip mt-1 text-sm text-ink" title={new Date(row.deletedAt).toLocaleString()}>{new Date(row.deletedAt).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-line bg-panel p-2.5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-ink2">Removed by</p>
                  <p className="data-clip mt-1 text-sm text-ink" title={row.deletedByUsername?.trim() || row.deletedByDiscordId}>{row.deletedByUsername?.trim() || row.deletedByDiscordId}</p>
                </div>
                {row.notes?.trim() ? (
                  <div className="min-w-0 rounded-lg border border-line bg-panel p-2.5">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-ink2">Notes</p>
                    <p className="data-clip mt-1 text-sm text-ink" title={row.notes.trim()}>{row.notes.trim()}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {rows.length > RECENTLY_REMOVED_PAGE_SIZE ? (
            <PaginationControls
              page={safeArchivePage}
              pageCount={archivePageCount}
              onPageChange={setArchivePage}
              label="Recently removed pages"
            />
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={clearArchiveOpen}
        title="Remove all archived records?"
        message={
          <>
            This will permanently delete <strong className="font-medium text-ink">{rows.length}</strong> archived removal records.
            They cannot be restored after the archive is cleared.
            {clearArchiveError ? (
              <div
                className="mt-3 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-red"
                role="alert"
                aria-live="assertive"
              >
                {clearArchiveError}
              </div>
            ) : null}
          </>
        }
        confirmLabel="Remove all"
        variant="danger"
        loading={clearArchiveLoading}
        onCancel={() => {
          if (!clearArchiveLoading) {
            setClearArchiveOpen(false);
            setClearArchiveError("");
          }
        }}
        onConfirm={clearArchive}
      />

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="Restore submission?"
        message={
          <>
            <strong className="font-medium text-ink">{restoreTarget?.ign}</strong> will be
            restored to the submission log with its original response details.
            {restoreError ? (
              <div
                className="mt-3 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-red"
                role="alert"
                aria-live="assertive"
              >
                {restoreError}
              </div>
            ) : null}
          </>
        }
        confirmLabel="Restore"
        variant="default"
        loading={restoreLoading}
        onCancel={() => {
          if (!restoreLoading) {
            setRestoreTarget(null);
            setRestoreError("");
          }
        }}
        onConfirm={() => (restoreTarget ? restore(restoreTarget.id) : undefined)}
      />
    </>
  );
}
