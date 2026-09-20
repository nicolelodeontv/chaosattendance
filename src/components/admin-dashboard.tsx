"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BaseModal } from "@/components/modal";
import { SuccessDialog } from "@/components/success-dialog";
import { ToastContainer, type ToastItem } from "@/components/toast";
import { RoleBadge } from "@/components/role-badge";
import { ROLE_LABELS, type UserRole } from "@/types/roles";

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
  role: UserRole;
};

type Admin = { discordId: string; username: string; createdAt: string; role: UserRole };

type Tab = "submissions" | "recentlyRemoved" | "settings" | "access";
type NotificationItem = {
  id: string;
  ign: string;
  attendance: string;
  hasPilot: boolean;
  pilotName: string | null;
  hours: number;
  timestamp: string;
  eventType: "created" | "updated";
};

type NotificationTarget = { id: string; ign: string };
type NotificationChange = Pick<NotificationItem, "id" | "ign" | "eventType" | "timestamp">;
type SubmissionChangeEvent = { version: number; changes: NotificationChange[] };
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
};

const NOTIFICATION_STORAGE_KEY = "chaosattendance:admin-notifications:v1";
const ARCHIVE_SETUP_MESSAGE = "The archive table hasn't been created in the database. Run docs/sql/deleted-submission.sql in your database's SQL editor, then press Refresh.";

function readNotificationState(): { lastSeen: number; knownIds: string[] } {
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (!raw) return { lastSeen: 0, knownIds: [] };
    const parsed = JSON.parse(raw);
    return {
      lastSeen: typeof parsed?.lastSeen === "number" ? parsed.lastSeen : 0,
      knownIds: Array.isArray(parsed?.knownIds)
        ? parsed.knownIds.filter((id: unknown): id is string => typeof id === "string").slice(-20)
        : [],
    };
  } catch {
    return { lastSeen: 0, knownIds: [] };
  }
}

function writeNotificationState(state: { lastSeen: number; knownIds: string[] }) {
  try {
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures.
  }
}

function relativeTime(value: string) {
  const diffSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const units: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
    [1, "second"],
  ];
  const unit = units.find(([seconds]) => abs >= seconds) ?? units[units.length - 1];
  return new Intl.RelativeTimeFormat("en", { numeric: "always" }).format(
    Math.round(diffSeconds / unit[0]),
    unit[1]
  );
}


export function AdminDashboard({ isOwner }: { isOwner: boolean }) {
  const [tab, setTab] = useState<Tab>("submissions");
  const [notificationTarget, setNotificationTarget] = useState<NotificationTarget | null>(null);
  const [notificationToasts, setNotificationToasts] = useState<ToastItem[]>([]);
  const [submissionChangeEvent, setSubmissionChangeEvent] = useState<SubmissionChangeEvent | null>(null);
  const [notificationsReadVersion, setNotificationsReadVersion] = useState(0);
  const [deletedSubmissionIds, setDeletedSubmissionIds] = useState<string[]>([]);
  const [submissionRefreshVersion, setSubmissionRefreshVersion] = useState(0);
  const submissionChangeVersionRef = useRef(0);
  const visibleTab: Tab = isOwner ? tab : "submissions";
  const tabs: Tab[] = isOwner
    ? ["submissions", "recentlyRemoved", "settings", "access"]
    : ["submissions"];

  function openNotification(item: NotificationItem) {
    setTab("submissions");
    setNotificationTarget({ id: item.id, ign: item.ign });
  }

  function addNotificationToast(message: string) {
    setNotificationToasts((current) => [
      ...current,
      { id: window.crypto.randomUUID(), message },
    ]);
  }

  function handleSubmissionChanges(changes: NotificationChange[]) {
    submissionChangeVersionRef.current += 1;
    setSubmissionChangeEvent({ version: submissionChangeVersionRef.current, changes });
  }

  function handleSubmissionsDeleted(ids: string[]) {
    if (ids.length === 0) return;
    setDeletedSubmissionIds((current) => [...new Set([...current, ...ids])].slice(-50));
  }

  return (
    <div>
      <ToastContainer
        toasts={notificationToasts}
        onDismiss={(id) =>
          setNotificationToasts((current) => current.filter((toast) => toast.id !== id))
        }
      />
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-display text-sm text-ink">Admin workspace</p>
        <AdminNotificationBell
          onOpenNotification={openNotification}
          onNewSubmission={addNotificationToast}
          onSubmissionChanges={handleSubmissionChanges}
          onNotificationsRead={() => setNotificationsReadVersion((version) => version + 1)}
          deletedSubmissionIds={deletedSubmissionIds}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-line bg-panel/70 p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "rounded-lg px-3 py-2 text-sm capitalize transition-colors",
              visibleTab === t ? "bg-cyan/10 text-cyan" : "text-ink2 hover:bg-panel2 hover:text-ink",
            ].join(" ")}
          >
            {t === "recentlyRemoved" ? "Recently removed" : t}
          </button>
        ))}
      </div>

      {visibleTab === "submissions" && (
        <SubmissionsTab
          isOwner={isOwner}
          notificationTarget={notificationTarget}
          onNotificationTargetConsumed={() => setNotificationTarget(null)}
          submissionChangeEvent={submissionChangeEvent}
          notificationsReadVersion={notificationsReadVersion}
          onSubmissionChangeEventConsumed={() => setSubmissionChangeEvent(null)}
          onSubmissionsDeleted={handleSubmissionsDeleted}
          externalRefreshVersion={submissionRefreshVersion}
        />
      )}
      {visibleTab === "recentlyRemoved" && isOwner && (
        <RecentlyRemovedTab
          onRestored={() => setSubmissionRefreshVersion((version) => version + 1)}
        />
      )}
      {visibleTab === "settings" && isOwner && <SettingsTab />}
      {visibleTab === "access" && isOwner && <AccessTab />}
    </div>
  );
}

function AdminNotificationBell({
  onOpenNotification,
  onNewSubmission,
  onSubmissionChanges,
  onNotificationsRead,
  deletedSubmissionIds,
}: {
  onOpenNotification: (notification: NotificationItem) => void;
  onNewSubmission: (message: string) => void;
  onSubmissionChanges: (changes: NotificationChange[]) => void;
  onNotificationsRead: () => void;
  deletedSubmissionIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [lastSeen, setLastSeen] = useState(0);
  const [loading, setLoading] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const alertedChangeKeysRef = useRef<Set<string>>(new Set());

  const unreadCount = notifications.filter(
    (notification) => new Date(notification.timestamp).getTime() > lastSeen
  ).length;

  async function poll() {
    const state = readNotificationState();
    setLastSeen(state.lastSeen);

    try {
      const params = new URLSearchParams({ since: String(state.lastSeen) });
      if (state.knownIds.length) {
        params.set("knownIds", state.knownIds.join(","));
      }

      const res = await fetch("/api/admin/notifications?" + params.toString(), {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Unable to load notifications.");
      }

      const items = (data.notifications ?? []) as NotificationItem[];
      const latest = Number(data.latestTimestamp) || state.lastSeen;
      setNotifications(items);

      const knownIds = Array.from(
        new Set([...state.knownIds, ...items.map((item) => item.id)])
      ).slice(-20);
      writeNotificationState({ lastSeen: state.lastSeen, knownIds });

      if (!initializedRef.current) {
        for (const item of items) {
          alertedChangeKeysRef.current.add(item.id + ":" + item.timestamp);
        }
        writeNotificationState({
          lastSeen: Math.max(state.lastSeen, latest),
          knownIds,
        });
        setLastSeen(Math.max(state.lastSeen, latest));
        initializedRef.current = true;
        return;
      }

      const changedItems: NotificationChange[] = [];
      for (const item of items) {
        const timestamp = new Date(item.timestamp).getTime();
        const changeKey = item.id + ":" + item.timestamp;
        if (timestamp <= state.lastSeen || alertedChangeKeysRef.current.has(changeKey)) continue;
        alertedChangeKeysRef.current.add(changeKey);
        changedItems.push(item);
        if (item.eventType === "created") {
          onNewSubmission("New submission from " + item.ign);
        }
      }

      if (changedItems.length > 0) {
        onSubmissionChanges(changedItems);
      }
    } catch {
      // A failed poll should not interrupt the admin console.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void poll();

    function handleVisibility() {
      if (!document.hidden) void poll();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    const timer = window.setInterval(() => {
      if (!document.hidden) void poll();
    }, 30000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (open && rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function markAllRead() {
    const latest = notifications.reduce(
      (max, notification) => Math.max(max, new Date(notification.timestamp).getTime()),
      lastSeen
    );
    writeNotificationState({
      lastSeen: latest,
      knownIds: notifications.map((notification) => notification.id),
    });
    setLastSeen(latest);
    onNotificationsRead();
  }

  useEffect(() => {
    if (deletedSubmissionIds.length === 0) return;
    setNotifications((current) =>
      current.filter((notification) => !deletedSubmissionIds.includes(notification.id))
    );
  }, [deletedSubmissionIds]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="icon-button relative h-10 w-10"
        aria-label={
          unreadCount > 0
            ? String(unreadCount > 9 ? "9+" : unreadCount) + " unread notifications"
            : "Notifications"
        }
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full border border-panel bg-red px-1 text-[10px] font-semibold leading-5 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Admin notifications"
          className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-panel shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="font-display text-sm text-ink">Notifications</p>
              <p className="mt-0.5 text-xs text-ink2">
                {loading ? "Checking…" : String(notifications.length) + " latest events"}
              </p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              className="min-h-9 rounded-md px-2 text-xs font-medium text-cyan transition-colors hover:bg-cyan/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50"
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {notifications.map((item) => {
              const isUnread = new Date(item.timestamp).getTime() > lastSeen;
              const detail =
                item.eventType === "created"
                  ? "submitted attendance (" +
                    item.attendance +
                    ", " +
                    (item.hasPilot ? "Pilot: " + (item.pilotName || "Unknown") : "No Pilot") +
                    ", " +
                    item.hours +
                    " hrs)"
                  : "updated their response";

              return (
                <button
                  key={item.id + item.timestamp}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onOpenNotification(item);
                  }}
                  className={[
                    "block w-full border-b border-line px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-panel2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan/50",
                    isUnread ? "bg-cyan/5" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={[
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        isUnread ? "bg-cyan" : "bg-ink2/30",
                      ].join(" ")}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-5 text-ink">
                        <span className="font-medium">{item.ign}</span> {detail}
                      </p>
                      <p className="mt-1 text-xs text-ink2">{relativeTime(item.timestamp)}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {!loading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink2">
                No submission events yet.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SubmissionsTab({
  isOwner,
  notificationTarget,
  onNotificationTargetConsumed,
  submissionChangeEvent,
  notificationsReadVersion,
  onSubmissionChangeEventConsumed,
  onSubmissionsDeleted,
  externalRefreshVersion,
}: {
  isOwner: boolean;
  notificationTarget: NotificationTarget | null;
  onNotificationTargetConsumed: () => void;
  submissionChangeEvent: SubmissionChangeEvent | null;
  notificationsReadVersion: number;
  onSubmissionChangeEventConsumed: () => void;
  onSubmissionsDeleted: (ids: string[]) => void;
  externalRefreshVersion: number;
}) {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Submission | null>(null);
  const [editingRow, setEditingRow] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Submission | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [currentOpId, setCurrentOpId] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState("");
  const [bulkConfirmText, setBulkConfirmText] = useState("");
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());

  async function load({ silent = false, clearNew = false }: { silent?: boolean; clearNew?: boolean } = {}) {
    if (!silent) setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/attendance", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Unable to load submissions.");
      }
      const nextRows = (data.submissions ?? []) as Submission[];
      setRows(nextRows);
      setCurrentOpId(
        typeof data.currentOpId === "string" && data.currentOpId.trim()
          ? data.currentOpId.trim()
          : "current"
      );
      if (clearNew) setNewRowIds(new Set());
      return nextRows;
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Unable to load submissions.");
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!submissionChangeEvent) return;
    let active = true;
    void (async () => {
      const nextRows = await load({ silent: true });
      if (!active) return;
      if (nextRows) {
        const createdIds = submissionChangeEvent.changes
          .filter((change) => change.eventType === "created")
          .map((change) => change.id);
        if (createdIds.length > 0) {
          setNewRowIds((current) => {
            const next = new Set(current);
            createdIds.forEach((id) => next.add(id));
            return next;
          });
        }
      }
      onSubmissionChangeEventConsumed();
    })();
    return () => {
      active = false;
    };
  }, [submissionChangeEvent]);

  useEffect(() => {
    if (!notificationsReadVersion) return;
    setNewRowIds(new Set());
  }, [notificationsReadVersion]);

  useEffect(() => {
    if (!externalRefreshVersion) return;
    void load({ silent: true });
  }, [externalRefreshVersion]);

  useEffect(() => {
    if (!notificationTarget) return;
    let active = true;
    let scrollTimer: number | null = null;
    let highlightTimer: number | null = null;

    void (async () => {
      const nextRows = await load({ silent: true });
      if (!active) return;

      const match = nextRows?.find((row) => row.id === notificationTarget.id);
      if (!match) {
        setFilter("");
        setHighlightedRowId(null);
        showToast("That submission has been removed");
        onNotificationTargetConsumed();
        return;
      }

      setFilter(match.ign);
      setHighlightedRowId(match.id);
      onNotificationTargetConsumed();
      scrollTimer = window.setTimeout(() => {
        const element = document.getElementById("submission-row-" + match.id);
        if (!element) return;
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      }, 0);
      highlightTimer = window.setTimeout(() => setHighlightedRowId(null), 3000);
    })();

    return () => {
      active = false;
      if (scrollTimer !== null) window.clearTimeout(scrollTimer);
      if (highlightTimer !== null) window.clearTimeout(highlightTimer);
    };
  }, [notificationTarget]);

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

  function requestDelete(row: Submission) {
    if (!isOwner) return;
    setDeleteTarget(row);
    setDeleteError("");
  }

  async function remove(id: string) {
    if (!isOwner) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/attendance/" + id, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fallbackByStatus: Record<number, string> = {
          401: "You must be signed in to delete a submission.",
          403: "You don't have permission to delete submissions.",
          404: "Submission not found.",
          500: "Unable to delete submission. Please try again.",
        };
        throw new Error(data.error || fallbackByStatus[res.status] || "Unable to delete submission.");
      }
      await load({ clearNew: true });
      onSubmissionsDeleted([id]);
      setDeleteTarget(null);
      showToast("Submission deleted");
    } catch (err: any) {
      setDeleteError(err.message || "Unable to delete submission.");
    } finally {
      setDeleteLoading(false);
    }
  }

  function requestBulkDelete() {
    setBulkDeleteError("");
    setBulkConfirmText("");
    setBulkDeleteOpen(true);
  }

  async function removeBulk() {
    const hasFilter = filter.trim().length > 0;
    const targets = currentOpRows;
    if (!currentOpId || targets.length === 0 || bulkConfirmText !== "DELETE") return;

    setBulkDeleteLoading(true);
    setBulkDeleteError("");

    try {
      const res = await fetch("/api/attendance/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opId: currentOpId,
          ...(hasFilter ? { ids: targets.map((row) => row.id) } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Unable to remove submissions.");
      }

      await load({ clearNew: true });
      onSubmissionsDeleted(targets.map((row) => row.id));
      setBulkDeleteOpen(false);
      setBulkConfirmText("");
      showToast(`${data.deleted ?? 0} submissions removed`);
    } catch (err: unknown) {
      setBulkDeleteError(err instanceof Error ? err.message : "Unable to remove submissions.");
    } finally {
      setBulkDeleteLoading(false);
    }
  }

  function exportCsv() {
    const header = [
      "Op",
      "IGN",
      "Role",
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
        ROLE_LABELS[r.role].charAt(0) + ROLE_LABELS[r.role].slice(1).toLowerCase(),
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

  function matchesFilter(row: Submission, value: string) {
    const query = value.toLowerCase();
    return (
      row.opId.toLowerCase().includes(query) ||
      row.ign.toLowerCase().includes(query) ||
      ROLE_LABELS[row.role].toLowerCase().includes(query) ||
      row.discordUsername.toLowerCase().includes(query)
    );
  }

  const filtered = rows.filter((r) => matchesFilter(r, filter));
  const hiddenNewSubmissionCount = filter.trim()
    ? Array.from(newRowIds).filter((id) => {
        const row = rows.find((item) => item.id === id);
        return Boolean(row && !matchesFilter(row, filter));
      }).length
    : 0;

  const hasFilter = filter.trim().length > 0;
  const currentOpAllRows = rows.filter((r) => r.opId === currentOpId);
  const currentOpRows = filtered.filter((r) => r.opId === currentOpId);
  const currentOpStats = {
    attending: currentOpAllRows.filter((r) => r.attending).length,
    notAttending: currentOpAllRows.filter((r) => !r.attending).length,
    withPilot: currentOpAllRows.filter((r) => r.hasPilot).length,
    noPilot: currentOpAllRows.filter((r) => !r.hasPilot).length,
    totalHours: currentOpAllRows.reduce((total, row) => total + row.hours, 0),
    totalSubmissions: currentOpAllRows.length,
  };
  const bulkCount = currentOpRows.length;
  const bulkButtonLabel = hasFilter
    ? `Remove filtered (${bulkCount})`
    : `Remove all (${bulkCount})`;

  const statTiles = [
    { label: "Attending", value: currentOpStats.attending },
    { label: "Not attending", value: currentOpStats.notAttending },
    { label: "With pilot", value: currentOpStats.withPilot },
    { label: "No pilot", value: currentOpStats.noPilot },
    { label: "Total hours", value: Number(currentOpStats.totalHours.toFixed(1)) },
    { label: "Total submissions", value: currentOpStats.totalSubmissions },
  ];

  return (
    <>
      <div
        className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3"
        aria-label="Attendance summary"
      >
        {statTiles.map((tile) => (
          <div key={tile.label} className="premium-card min-w-0 p-3 sm:p-3.5">
            <p className="text-[11px] uppercase tracking-[0.1em] text-ink2">{tile.label}</p>
            <p className="mt-1 font-display text-lg text-ink sm:text-xl">{tile.value}</p>
          </div>
        ))}
      </div>
      {hasFilter ? (
        <p className="mb-4 text-xs text-ink2">
          Showing {currentOpRows.length} of {currentOpAllRows.length}
        </p>
      ) : null}
      <div className="premium-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
        <div>
          <p className="font-display text-sm text-ink">Submission log</p>
          <p className="mt-1 text-xs text-ink2">Search by op, IGN, role or Discord username.</p>
        </div>
        {loadError ? (
          <div className="flex w-full items-center justify-between gap-3 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-red" role="alert" aria-live="assertive">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => void load()}
              className="shrink-0 rounded-md border border-red/40 px-3 py-1.5 font-medium transition-colors hover:bg-red/10"
            >
              Retry
            </button>
          </div>
        ) : null}
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="min-w-0 flex-1 sm:w-64">
            <input
              id="submission-filter"
              type="text"
              placeholder="Filter submissions"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="min-w-0"
              aria-label="Filter submissions"
            />
            {hiddenNewSubmissionCount > 0 ? (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs leading-5 text-ink2">
                <span>
                  {hiddenNewSubmissionCount} new submission{hiddenNewSubmissionCount === 1 ? "" : "s"} hidden by filter.
                </span>
                <button
                  type="button"
                  onClick={() => setFilter("")}
                  className="font-medium text-cyan underline decoration-cyan/50 underline-offset-2 hover:text-ink"
                >
                  Clear filter
                </button>
              </p>
            ) : null}
          </div>
          <button onClick={() => void load({ clearNew: true })} className="premium-button-secondary shrink-0 px-3">
            Refresh
          </button>
          <button onClick={exportCsv} className="premium-button-secondary hidden shrink-0 px-3 sm:inline-flex">
            Export CSV
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={requestBulkDelete}
              disabled={!currentOpId || bulkCount === 0 || bulkDeleteLoading}
              className="inline-flex min-h-[42px] max-w-full shrink-0 items-center justify-center rounded-[10px] border border-red/70 bg-red/5 px-3 text-sm font-semibold text-red transition-colors hover:border-red hover:bg-red/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkButtonLabel}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto"><table className="w-full table-auto text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-panel2/65 text-xs uppercase tracking-[0.08em] text-ink2">
            <th className="px-2.5 py-3 font-medium sm:px-3">Op</th>
            <th className="px-2.5 py-3 font-medium sm:px-3">IGN</th>
            <th className="px-2.5 py-3 font-medium sm:px-3">Discord</th>
            <th className="px-2.5 py-3 font-medium sm:px-3">Attendance</th>
            <th className="px-2.5 py-3 font-medium sm:px-3">Pilot</th>
            <th className="px-2.5 py-3 font-medium sm:px-3">Hours</th>
            <th className="px-2.5 py-3 font-medium sm:px-3">Notes</th>
            <th className="px-2.5 py-3 font-medium sm:px-3">Submitted</th>
            <th className="px-2.5 py-3 font-medium sm:px-3" />
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
            <tr
              id={"submission-row-" + r.id}
              key={r.id}
              className={[
                "border-b border-line last:border-0 transition-colors duration-200",
                newRowIds.has(r.id) ? "submission-row--new" : "",
                highlightedRowId === r.id ? "bg-cyan/10" : "",
              ].join(" ")}
            >
              <td className="px-2.5 py-3 font-display text-xs text-cyan sm:px-3 whitespace-nowrap">{r.opId}</td>
              <td className="px-2.5 py-3 text-ink sm:px-3">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => setSelected(r)} className="min-w-0 max-w-full break-words rounded text-left font-medium hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/50">
                    {r.ign}
                  </button>
                  {newRowIds.has(r.id) ? (
                    <span className="rounded-full border border-cyan/30 bg-cyan/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-cyan">
                      NEW
                    </span>
                  ) : null}
                  <RoleBadge variant={r.role} />
                </div>
              </td>
              <td className="px-2.5 py-3 text-ink2 sm:px-3 whitespace-nowrap">{r.discordUsername}</td>
              <td className="px-2.5 py-3 sm:px-3 whitespace-nowrap">
                <Badge ok={r.attending} yes="Attending" no="Not Attending" />
              </td>
              <td className="px-2.5 py-3 text-ink2 sm:px-3 whitespace-nowrap">
                {r.hasPilot ? "Have Pilot — " + (r.pilotName ?? "") : "No Pilot"}
              </td>
              <td className="px-2.5 py-3 text-ink2 sm:px-3 whitespace-nowrap">{r.hours}</td>
              <td className="px-2.5 py-3 text-ink2 sm:px-3 whitespace-nowrap">
                {r.notes ?? "—"}
              </td>
              <td className="px-2.5 py-3 text-ink2 sm:px-3 whitespace-nowrap">
                {new Date(r.createdAt).toLocaleDateString()}
              </td>
              <td className="w-[74px] px-2.5 py-3 text-right sm:px-3">
                <div className="flex min-w-[58px] justify-end gap-1">
                  <button type="button" onClick={() => { setSelected(r); setEditingRow(true); }} className="rounded-md px-2 py-1 text-ink2 transition-colors hover:bg-cyan/5 hover:text-cyan" aria-label="Edit submission">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m16 3 5 5L8 21H3v-5Z" /><path d="m14 5 5 5" /></svg>
                  </button>
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => requestDelete(r)}
                      className="rounded-md px-2 py-1 text-ink2 transition-colors hover:bg-red/5 hover:text-red"
                      aria-label="Delete submission"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a1 1 0 0 1 1 1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Remove all submissions?"
        message={
          <>
            This will permanently delete <strong className="font-medium text-ink">{bulkCount}</strong> submissions. Everyone affected will be able to submit again. This can't be undone.
            {bulkDeleteError && (
              <div className="mt-3 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-red" role="alert" aria-live="assertive">
                {bulkDeleteError}
              </div>
            )}
          </>
        }
        confirmLabel="Remove"
        variant="danger"
        loading={bulkDeleteLoading}
        confirmDisabled={bulkConfirmText !== "DELETE"}
        onCancel={() => {
          if (!bulkDeleteLoading) {
            setBulkDeleteOpen(false);
            setBulkConfirmText("");
            setBulkDeleteError("");
          }
        }}
        onConfirm={removeBulk}
      >
        <div className="mt-4 space-y-2">
          <label htmlFor="bulk-delete-confirm" className="text-sm font-medium text-ink">
            Type DELETE to confirm
          </label>
          <input
            id="bulk-delete-confirm"
            type="text"
            value={bulkConfirmText}
            onChange={(event) => setBulkConfirmText(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
            aria-label="Type DELETE to confirm"
            placeholder="DELETE"
          />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete submission?"
        message={
          <>
            <strong className="font-medium text-ink">{deleteTarget?.ign}</strong> will be able to submit again.
            {deleteError && (
              <div className="mt-3 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-red" role="alert" aria-live="assertive">
                {deleteError}
              </div>
            )}
          </>
        }
        variant="danger"
        loading={deleteLoading}
        onCancel={() => { if (!deleteLoading) { setDeleteTarget(null); setDeleteError(""); } }}
        onConfirm={() => deleteTarget ? remove(deleteTarget.id) : undefined}
      />
      {selected ? (
        <SubmissionDetailModal
          selected={selected}
          editing={editingRow}
          onClose={() => { setSelected(null); setEditingRow(false); }}
          onEdit={() => setEditingRow(true)}
          onSaved={async (updated) => {
            setSelected(updated);
            setEditingRow(false);
            await load();
          }}
        />
      ) : null}
    </div>
    </>
  );
}

function SubmissionDetailModal({
  selected,
  editing,
  onClose,
  onEdit,
  onSaved,
}: {
  selected: Submission;
  editing: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSaved: (submission: Submission) => void | Promise<void>;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [pendingSaved, setPendingSaved] = useState<Submission | null>(null);
  const [ign, setIgn] = useState(selected.ign);
  const [attending, setAttending] = useState(selected.attending);
  const [hasPilot, setHasPilot] = useState(selected.hasPilot);
  const [pilotName, setPilotName] = useState(selected.pilotName ?? "");
  const [hours, setHours] = useState(String(selected.hours));
  const [notes, setNotes] = useState(selected.notes ?? "");

  useEffect(() => {
    setError("");
    setIgn(selected.ign);
    setAttending(selected.attending);
    setHasPilot(selected.hasPilot);
    setPilotName(selected.pilotName ?? "");
    setHours(String(selected.hours));
    setNotes(selected.notes ?? "");
  }, [selected]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/submissions/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ign, attending, hasPilot, pilotName, hours: Number(hours), notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to update submission.");
      setPendingSaved(data.submission);
      setSuccessOpen(true);
      void onSaved(data.submission);
    } catch (err: any) {
      setError(err.message || "Unable to update submission.");
    } finally {
      setSaving(false);
    }
  }

  function closeSuccess() {
    setSuccessOpen(false);
    setPendingSaved(null);
  }

  return (
    <>
      <SuccessDialog
        open={successOpen}
        title="Submission updated"
        message={
          <>
            <strong className="font-semibold text-ink">{pendingSaved?.ign ?? selected.ign}</strong>'s response has been saved.
          </>
        }
        onClose={closeSuccess}
      />

      <BaseModal
        open={true}
        title={selected.ign}
        titleId="submission-detail-title"
        onClose={onClose}
        initialFocusRef={closeRef}
        cardClassName="!max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-6 shadow-2xl sm:p-7"
        beforeTitle={
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan">
              {editing ? "Edit submission" : "Submission detail"}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="icon-button"
              aria-label="Close submission detail dialog"
            >
              ×
            </button>
          </div>
        }
      >
        {editing ? (
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <label htmlFor="admin-edit-ign" className="text-sm font-medium text-ink">IGN</label>
              <input
                id="admin-edit-ign"
                type="text"
                required
                value={ign}
                onChange={(e) => setIgn(e.target.value)}
              />
            </div>
            <fieldset>
              <legend className="mb-2.5 text-sm font-medium text-ink">Attendance</legend>
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => setAttending(true)} className={[`premium-toggle`, attending ? `border-cyan bg-cyan/10 text-cyan` : ` `].join(" ")}>Attending</button>
                <button type="button" onClick={() => setAttending(false)} className={[`premium-toggle`, !attending ? `border-red bg-red/10 text-red` : ` `].join(" ")}>Not Attending</button>
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2.5 text-sm font-medium text-ink">Pilot</legend>
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => setHasPilot(true)} className={[`premium-toggle`, hasPilot ? `border-cyan bg-cyan/10 text-cyan` : ` `].join(" ")}>Have Pilot</button>
                <button type="button" onClick={() => setHasPilot(false)} className={[`premium-toggle`, !hasPilot ? `border-red bg-red/10 text-red` : ` `].join(" ")}>No Pilot</button>
              </div>
            </fieldset>
            {hasPilot && (
              <div className="space-y-2">
                <label htmlFor="admin-edit-pilot-name" className="text-sm font-medium text-ink">Pilot Name</label>
                <input
                  id="admin-edit-pilot-name"
                  type="text"
                  required
                  value={pilotName}
                  onChange={(e) => setPilotName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="admin-edit-hours" className="text-sm font-medium text-ink">Hours</label>
              <input
                id="admin-edit-hours"
                type="number"
                step="0.5"
                min="0"
                required
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="admin-edit-notes" className="text-sm font-medium text-ink">
                Notes <span className="font-normal text-ink2">(optional)</span>
              </label>
              <textarea
                id="admin-edit-notes"
                rows={3}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  e.currentTarget.style.height = "auto";
                  e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                }}
                style={{ resize: "none", overflow: "hidden" }}
              />
            </div>
            {error && (
              <div className="rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-red" role="alert" aria-live="assertive">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="premium-button-secondary flex-1">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="premium-button flex-1 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <SubmissionDetailBody selected={selected} />
            <button type="button" onClick={onEdit} className="premium-button mt-5 w-full">Edit submission</button>
          </>
        )}
      </BaseModal>
    </>
  );
}

function SubmissionDetailBody({ selected }: { selected: Submission }) {
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
      <div className="mt-5 flex flex-col items-center text-center">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-line bg-panel2">
          {avatarLoading ? <div className="h-full w-full animate-pulse bg-panel2" aria-label="Loading Discord avatar" /> : <img src={avatarUrl ?? "https://cdn.discordapp.com/embed/avatars/0.png"} alt="" className="h-full w-full object-cover" /> }
        </div>
        <p className="mt-3 font-medium text-ink">{selected.discordUsername}</p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel2/60 p-3"><p className="text-xs uppercase tracking-[0.12em] text-ink2">IGN</p><p className="mt-1.5 text-sm text-ink">{selected.ign}</p></div>
        <div className="rounded-lg border border-line bg-panel2/60 p-3"><p className="text-xs uppercase tracking-[0.12em] text-ink2">Attendance</p><p className="mt-1.5 text-sm text-ink">{selected.attending ? "Attending" : "Not Attending"}</p></div>
        <div className="rounded-lg border border-line bg-panel2/60 p-3"><p className="text-xs uppercase tracking-[0.12em] text-ink2">Pilot</p><p className="mt-1.5 text-sm text-ink">{selected.hasPilot ? "Have Pilot" : "No Pilot"}</p></div>
        {selected.hasPilot && <div className="rounded-lg border border-line bg-panel2/60 p-3"><p className="text-xs uppercase tracking-[0.12em] text-ink2">Pilot Name</p><p className="mt-1.5 text-sm text-ink">{selected.pilotName ?? "—"}</p></div>}
        <div className="rounded-lg border border-line bg-panel2/60 p-3 sm:col-span-2"><p className="text-xs uppercase tracking-[0.12em] text-ink2">Hours</p><p className="mt-1.5 text-sm text-ink">{selected.hours}</p></div>
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


function RecentlyRemovedTab({ onRestored }: { onRestored: () => void }) {
  const [rows, setRows] = useState<DeletedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [archiveSetupRequired, setArchiveSetupRequired] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<DeletedSubmission | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

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

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="premium-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
          <div>
            <p className="font-display text-sm text-ink">Recently removed</p>
            <p className="mt-1 text-xs text-ink2">Archived removals from the last 30 days.</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="premium-button-secondary shrink-0 px-3"
          >
            Refresh
          </button>
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
          {!loading && !archiveSetupRequired && rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-line bg-panel2/60 p-3.5 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    <p className="font-medium text-ink">{row.ign}</p>
                    <span className="font-display text-xs text-cyan">{row.opId}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink2">
                    {row.discordUsername} <span className="text-ink2/70">({row.discordId})</span>
                  </p>
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
                  <p className="mt-1 text-sm text-ink">{row.attending ? "Attending" : "Not Attending"}</p>
                </div>
                <div className="rounded-lg border border-line bg-panel p-2.5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-ink2">Hours</p>
                  <p className="mt-1 text-sm text-ink">{row.hours}</p>
                </div>
                <div className="rounded-lg border border-line bg-panel p-2.5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-ink2">Removed</p>
                  <p className="mt-1 text-sm text-ink">{new Date(row.deletedAt).toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-line bg-panel p-2.5">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-ink2">Removed by</p>
                  <p className="mt-1 break-all text-sm text-ink">{row.deletedByDiscordId}</p>
                </div>
                {row.notes?.trim() ? (
                  <div className="min-w-0 rounded-lg border border-line bg-panel p-2.5">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-ink2">Notes</p>
                    <p className="mt-1 truncate text-sm text-ink" title={row.notes.trim()}>{row.notes.trim()}</p>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

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

function SettingsTab() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [guildName, setGuildName] = useState("");
  const [currentOpId, setCurrentOpId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setWebhookUrl(d.settings?.webhookUrl ?? "");
        setNotificationsEnabled(d.settings?.notificationsEnabled !== false);
        setGuildName(d.settings?.guildName ?? "Squadron");
        setCurrentOpId(d.settings?.currentOpId ?? "current");
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
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookUrl, notifyDiscord: notificationsEnabled, guildName, currentOpId }),
    });
    setSaving(false);
    if (res.ok) showToast("Settings saved");
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
          Admin deletion removes the stored submission, which allows that member to submit again for the same op when a correction is needed.
        </p>
      </div>
      </div>
    </>
  );
}

function AccessTab() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<Admin | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  async function load() {
    const res = await fetch("/api/admin/admins");
    const data = await res.json();
    setAdmins(data.admins ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
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

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newId.trim()) return;

    const displayName = newName.trim() || newId.trim();
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId: newId.trim(), username: newName.trim() }),
    });

    setNewId("");
    setNewName("");
    if (res.ok) {
      showToast(`Admin access granted to ${displayName}`);
    }
    load();
  }

  function requestRemoveAdmin(admin: Admin) {
    setRemoveTarget(admin);
    setRemoveError("");
  }

  async function removeAdmin(discordId: string) {
    setRemoveLoading(true);
    setRemoveError("");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Unable to remove admin.");
      }
      await load();
      setRemoveTarget(null);
      showToast("Admin access removed");
    } catch (err: any) {
      setRemoveError(err.message || "Unable to remove admin.");
    } finally {
      setRemoveLoading(false);
    }
  }

  if (loading) return <p className="text-sm text-ink2">Loading…</p>;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove admin?"
        message={
          <>
            <strong className="font-medium text-ink">{removeTarget?.username}</strong> will lose admin access.
            {removeError && (
              <div className="mt-3 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-red" role="alert" aria-live="assertive">
                {removeError}
              </div>
            )}
          </>
        }
        confirmLabel="Remove"
        variant="danger"
        loading={removeLoading}
        onCancel={() => { if (!removeLoading) { setRemoveTarget(null); setRemoveError(""); } }}
        onConfirm={() => removeTarget ? removeAdmin(removeTarget.discordId) : undefined}
      />
    <div className="max-w-3xl space-y-5">
      <div className="premium-card p-6">
        <div className="flex items-center gap-2">
          <p className="font-display text-sm text-ink">Owner</p>
          <RoleBadge variant="owner" />
        </div>
        <p className="mt-1 text-sm leading-6 text-ink2">
          Owner access is controlled by the OWNER_DISCORD_ID environment variable.
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
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.username}</span>
                  <RoleBadge variant={a.role} />
                  <span className="text-ink2">— {a.discordId}</span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => requestRemoveAdmin(a)}
                className="shrink-0 rounded-md px-2 py-1 text-ink2 transition-colors hover:bg-red/5 hover:text-red"
                aria-label={`Remove admin access for ${a.username}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={addAdmin} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem] flex-1 space-y-1.5">
            <label htmlFor="access-discord-user-id" className="text-xs text-ink2">Discord user ID</label>
            <input
              id="access-discord-user-id"
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="123456789012345678"
            />
          </div>
          <div className="min-w-[8rem] flex-1 space-y-1.5">
            <label htmlFor="access-admin-label" className="text-xs text-ink2">Label (optional)</label>
            <input
              id="access-admin-label"
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
    </>
  );
}
