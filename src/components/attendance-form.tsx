"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SuccessDialog } from "@/components/success-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  SUBMISSIONS_CLOSED_CODE,
  SUBMISSIONS_CLOSED_ERROR,
} from "@/lib/deadline-constants";
type FieldName = "ign" | "attending" | "hasPilot" | "pilotName" | "hours";
type FieldErrors = Partial<Record<FieldName, string>>;
type TouchedFields = Record<FieldName, boolean>;
type Choice = "yes" | "no" | "";

type InitialSubmission = {
  id: string;
  opId: string;
  ign: string;
  attending: boolean;
  hasPilot: boolean;
  pilotName: string | null;
  hours: number;
  notes: string | null;
  createdAt: string;
  discordAvatar: string | null;
};

type Submission = InitialSubmission;

type RequestStatus = "idle" | "submitting" | "error";
type FailureKind = "network" | "auth" | "lock" | "server" | "generic" | null;

const MAX_NOTES_LENGTH = 500;
const MAX_IGN_LENGTH = 64;
const MAX_PILOT_NAME_LENGTH = 64;

const DUPLICATE_SUBMISSION_ERROR = "You've already submitted for this op.";
const DUPLICATE_IGN_ERROR =
  "That IGN is already used by another submission.";

function validateField(
  field: FieldName,
  value: string,
  attending: Choice,
  hasPilot: Choice,
) {
  if (field === "ign") {
    if (!value.trim()) return "Enter your in-game name.";
    if (value.trim().length > MAX_IGN_LENGTH) {
      return `IGN must be ${MAX_IGN_LENGTH} characters or fewer.`;
    }
    return "";
  }

  if (field === "attending") {
    return attending ? "" : "Choose whether you are attending.";
  }

  if (field === "hasPilot") {
    return hasPilot ? "" : "Choose whether you have a pilot.";
  }

  if (field === "pilotName") {
    if (hasPilot !== "yes") return "";
    if (!value.trim()) return "Enter your pilot's name.";
    if (value.trim().length > MAX_PILOT_NAME_LENGTH) {
      return `Pilot name must be ${MAX_PILOT_NAME_LENGTH} characters or fewer.`;
    }
    return "";
  }

  if (!value.trim()) return "Enter your hours.";
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? ""
    : "Hours must be a number, 0 or higher.";
}

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function initialChoice(value: boolean | undefined, fallback: Choice = ""): Choice {
  return typeof value === "boolean" ? (value ? "yes" : "no") : fallback;
}

export function AttendanceForm({
  initialSubmission,
}: {
  initialSubmission: InitialSubmission | null;
}) {
  const router = useRouter();

  const [submission, setSubmission] = useState<Submission | null>(initialSubmission);
  const [showForm, setShowForm] = useState(!initialSubmission);
  const [ign, setIgn] = useState(initialSubmission?.ign ?? "");
  const [attending, setAttending] = useState<Choice>(
    initialSubmission ? initialChoice(initialSubmission.attending) : "",
  );
  const [hasPilot, setHasPilot] = useState<Choice>(
    initialSubmission ? initialChoice(initialSubmission.hasPilot) : "",
  );
  const [pilotName, setPilotName] = useState(initialSubmission?.pilotName ?? "");
  const [hours, setHours] = useState(initialSubmission ? String(initialSubmission.hours) : "");
  const [notes, setNotes] = useState(initialSubmission?.notes ?? "");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [failureKind, setFailureKind] = useState<FailureKind>(null);
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("Attendance submitted");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [touched, setTouched] = useState<TouchedFields>({
    ign: false,
    attending: false,
    hasPilot: false,
    pilotName: false,
    hours: false,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setSubmission(initialSubmission);
    setShowForm(!initialSubmission);
    setIgn(initialSubmission?.ign ?? "");
    setAttending(initialSubmission ? initialChoice(initialSubmission.attending) : "");
    setHasPilot(initialSubmission ? initialChoice(initialSubmission.hasPilot) : "");
    setPilotName(initialSubmission?.pilotName ?? "");
    setHours(initialSubmission ? String(initialSubmission.hours) : "");
    setNotes(initialSubmission?.notes ?? "");
    setTouched({
      ign: false,
      attending: false,
      hasPilot: false,
      pilotName: false,
      hours: false,
    });
    setFieldErrors({});
    setFailureKind(null);
    setError("");
    setStatus("idle");
  }, [initialSubmission]);

  function clearFailure() {
    setFailureKind(null);
    setError("");
    if (status !== "submitting") setStatus("idle");
  }

  function updateField(field: FieldName, value: string) {
    const next = validateField(field, value, attending, hasPilot);
    setFieldErrors((current) => {
      if (!touched[field] && !current[field]) return current;
      const updated = { ...current };
      if (next) updated[field] = next;
      else delete updated[field];
      return updated;
    });
    clearFailure();
  }

  function touchField(field: FieldName, value: string) {
    setTouched((current) => ({ ...current, [field]: true }));
    const next = validateField(field, value, attending, hasPilot);
    setFieldErrors((current) => {
      const updated = { ...current };
      if (next) updated[field] = next;
      else delete updated[field];
      return updated;
    });
    clearFailure();
  }

  function changeAttending(value: "yes" | "no") {
    setAttending(value);
    setTouched((current) => ({ ...current, attending: true }));
    setFieldErrors((current) => {
      const updated = { ...current };
      delete updated.attending;
      return updated;
    });
    clearFailure();
  }

  function changePilot(value: "yes" | "no") {
    setHasPilot(value);
    setTouched((current) => ({ ...current, hasPilot: true }));
    setFieldErrors((current) => {
      const updated = { ...current };
      delete updated.hasPilot;
      if (value === "no") delete updated.pilotName;
      return updated;
    });
    if (value === "no") setPilotName("");
    clearFailure();
  }

  function focusFirstInvalid(errors: FieldErrors) {
    const order: Array<[FieldName, string]> = [
      ["ign", "ign"],
      ["attending", "attending-yes"],
      ["hasPilot", "pilot-yes"],
      ["pilotName", "pilotName"],
      ["hours", "hours"],
    ];
    const first = order.find(([field]) => errors[field]);
    if (!first) return;

    window.setTimeout(() => {
      const element = document.getElementById(first[1]);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      (element as HTMLElement).focus();
    }, 0);
  }

  function validateForm() {
    const nextTouched: TouchedFields = {
      ign: true,
      attending: true,
      hasPilot: true,
      pilotName: hasPilot === "yes",
      hours: true,
    };
    const nextErrors: FieldErrors = {};

    const fields: Array<[FieldName, string]> = [
      ["ign", ign],
      ["attending", attending],
      ["hasPilot", hasPilot],
      ["pilotName", pilotName],
      ["hours", hours],
    ];

    fields.forEach(([field, value]) => {
      const message = validateField(field, value, attending, hasPilot);
      if (message) nextErrors[field] = message;
    });

    setTouched(nextTouched);
    setFieldErrors(nextErrors);
    clearFailure();

    if (Object.keys(nextErrors).length > 0) {
      setStatus("idle");
      focusFirstInvalid(nextErrors);
      return false;
    }

    return true;
  }

  async function sendSubmission() {
    setStatus("submitting");
    setFailureKind(null);
    setError("");

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ign,
          attending: attending === "yes",
          hasPilot: hasPilot === "yes",
          pilotName: hasPilot === "yes" ? pilotName : null,
          hours: Number(hours),
          notes: notes || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setStatus("error");
        setFailureKind("auth");
        setError("You're signed out. Sign in again to submit your response.");
        return;
      }

      if (res.status === 409 && data.error === DUPLICATE_IGN_ERROR) {
        setFieldErrors((current) => ({ ...current, ign: data.error }));
        setTouched((current) => ({ ...current, ign: true }));
        setStatus("error");
        setFailureKind("generic");
        setError("");
        focusFirstInvalid({ ign: data.error });
        return;
      }

      if (res.status === 409 && data.error === DUPLICATE_SUBMISSION_ERROR) {
        setConfirmOpen(false);
        setStatus("error");
        setFailureKind("lock");
        setError(DUPLICATE_SUBMISSION_ERROR);
        router.refresh();
        return;
      }

      if (res.status >= 500) {
        setStatus("error");
        setFailureKind("server");
        setError(data.error || "Something went wrong while saving your response.");
        return;
      }

      if (!res.ok) {
        setStatus("error");
        setFailureKind("generic");
        setError(data.error || "Something went wrong while saving your response.");
        return;
      }

      const saved = data.submission as Submission | undefined;
      if (saved?.id) {
        setSubmission(saved);
        setShowForm(false);
      }

      setStatus("idle");
      setError("");
      setFailureKind(null);
      setConfirmOpen(false);
      setSuccessTitle("Attendance submitted");
      setSuccessOpen(true);
      router.refresh();
    } catch {
      setStatus("error");
      setFailureKind("network");
      setError("Unable to reach the server. Check your connection and try again.");
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    if (!validateForm()) return;
    setConfirmOpen(true);
  }

  const progress = useMemo(() => {
    const checks = [
      ign.trim().length > 0,
      attending !== "",
      hasPilot !== "",
      hasPilot === "no" || pilotName.trim().length > 0,
      hours.trim().length > 0,
    ];
    return checks.filter(Boolean).length;
  }, [ign, attending, hasPilot, pilotName, hours]);

  const summaryLine = useMemo(() => {
    const attendanceLabel =
      attending === "yes"
        ? "Attending"
        : attending === "no"
          ? "Not Attending"
          : "Attendance not selected";
    const pilotLabel =
      hasPilot === "yes"
        ? `Pilot: ${pilotName.trim() || "Not entered"}`
        : hasPilot === "no"
          ? "No Pilot"
          : "Pilot not selected";
    const hoursLabel = hours.trim() ? `${hours.trim()} hrs` : "Hours not entered";
    return `${attendanceLabel} · ${pilotLabel} · ${hoursLabel}`;
  }, [attending, hasPilot, pilotName, hours]);

  if (submission && !showForm) {
    return <ReadOnlySubmissionCard submission={submission} />;
  }

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm attendance submission"
        message="Submissions are final. Confirm your IGN, attendance and pilot status."
        confirmLabel="Confirm submission"
        cancelLabel="Review"
        variant="default"
        loading={status === "submitting"}
        onConfirm={() => void sendSubmission()}
        onCancel={() => {
          if (status !== "submitting") setConfirmOpen(false);
        }}
      />
      <SuccessDialog
        open={successOpen}
        title={successTitle}
        message={
          <>
            Your response for <strong className="font-semibold text-ink">{ign.trim()}</strong> has been recorded.
          </>
        }
        onClose={() => setSuccessOpen(false)}
      />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="premium-card mx-auto w-full p-5 sm:p-7"
        aria-busy={status === "submitting"}
      >
        <div className="mb-6 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-cyan">
              Your response
            </p>
            <p className="text-sm leading-6 text-ink2">
              Complete the fields below.
            </p>
          </div>
          <div className="shrink-0 rounded-full border border-line bg-panel2 px-3 py-1.5 text-xs text-ink2">
            {progress} of 5 required fields complete
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <label htmlFor="ign" className="text-sm font-medium text-ink">
            IGN
          </label>
          <input
            id="ign"
            type="text"
            required
            value={ign}
            maxLength={MAX_IGN_LENGTH}
            onChange={(e) => {
              const value = e.target.value;
              setIgn(value);
              updateField("ign", value);
            }}
            onBlur={(e) => touchField("ign", e.target.value)}
            aria-invalid={Boolean(fieldErrors.ign)}
            aria-describedby="ign-help ign-error"
            className={fieldErrors.ign ? "border-red focus:border-red" : ""}
            placeholder="In-game name"
            autoComplete="nickname"
          />
          <p id="ign-help" className="text-xs leading-5 text-ink2">
            Your in-game name, exactly as it appears in game.
          </p>
          {fieldErrors.ign && (
            <p id="ign-error" className="text-xs text-red" role="alert">
              {fieldErrors.ign}
            </p>
          )}
        </div>

        <fieldset className="mb-6" aria-invalid={Boolean(fieldErrors.attending)} aria-describedby={fieldErrors.attending ? "attending-error" : undefined}>
          <legend className="mb-2.5 text-sm font-medium text-ink">Attendance</legend>
          <div className="grid grid-cols-2 gap-2.5">
            <ToggleOption
              id="attending-yes"
              label="Attending"
              selected={attending === "yes"}
              tone="cyan"
              onClick={() => changeAttending("yes")}
            />
            <ToggleOption
              id="attending-no"
              label="Not Attending"
              selected={attending === "no"}
              tone="red"
              onClick={() => changeAttending("no")}
            />
          </div>
          {fieldErrors.attending && (
            <p id="attending-error" className="mt-2 text-xs text-red" role="alert">
              {fieldErrors.attending}
            </p>
          )}
        </fieldset>

        <fieldset className="mb-6" aria-invalid={Boolean(fieldErrors.hasPilot)} aria-describedby={fieldErrors.hasPilot ? "pilot-error" : undefined}>
          <legend className="mb-2.5 text-sm font-medium text-ink">Pilot</legend>
          <div className="grid grid-cols-2 gap-2.5">
            <ToggleOption
              id="pilot-yes"
              label="Have Pilot"
              selected={hasPilot === "yes"}
              tone="cyan"
              onClick={() => changePilot("yes")}
            />
            <ToggleOption
              id="pilot-no"
              label="No Pilot"
              selected={hasPilot === "no"}
              tone="neutral"
              onClick={() => changePilot("no")}
            />
          </div>
          {fieldErrors.hasPilot && (
            <p id="pilot-error" className="mt-2 text-xs text-red" role="alert">
              {fieldErrors.hasPilot}
            </p>
          )}
        </fieldset>

        <div
          className={[
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
            hasPilot === "yes" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          ].join(" ")}
          aria-hidden={hasPilot !== "yes"}
        >
          <div className="overflow-hidden">
            <div className="mb-6 space-y-2">
              <label htmlFor="pilotName" className="text-sm font-medium text-ink">
                Pilot Name
              </label>
              <input
                id="pilotName"
                type="text"
                required={hasPilot === "yes"}
                value={pilotName}
                maxLength={MAX_PILOT_NAME_LENGTH}
                onChange={(e) => {
                  const value = e.target.value;
                  setPilotName(value);
                  updateField("pilotName", value);
                }}
                onBlur={(e) => touchField("pilotName", e.target.value)}
                aria-invalid={Boolean(fieldErrors.pilotName)}
                aria-describedby={fieldErrors.pilotName ? "pilotName-error" : undefined}
                placeholder="Pilot's name"
                tabIndex={hasPilot === "yes" ? 0 : -1}
              />
              {fieldErrors.pilotName && (
                <p id="pilotName-error" className="text-xs text-red" role="alert">
                  {fieldErrors.pilotName}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <label htmlFor="hours" className="text-sm font-medium text-ink">
            Hours
          </label>
          <input
            id="hours"
            type="number"
            inputMode="numeric"
            step="0.5"
            min="0"
            required
            value={hours}
            onChange={(e) => {
              const value = e.target.value;
              setHours(value);
              updateField("hours", value);
            }}
            onBlur={(e) => touchField("hours", e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            aria-invalid={Boolean(fieldErrors.hours)}
            aria-describedby={fieldErrors.hours ? "hours-error" : undefined}
            className={fieldErrors.hours ? "border-red focus:border-red" : ""}
            placeholder="0"
          />
          {fieldErrors.hours && (
            <p id="hours-error" className="text-xs text-red" role="alert">
              {fieldErrors.hours}
            </p>
          )}
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="notes" className="text-sm font-medium text-ink">
              Notes <span className="font-normal text-ink2">(optional)</span>
            </label>
            <span className="text-xs tabular-nums text-ink2" aria-live="polite">
              {notes.length}/{MAX_NOTES_LENGTH}
            </span>
          </div>
          <textarea
            id="notes"
            rows={4}
            maxLength={MAX_NOTES_LENGTH}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              clearFailure();
            }}
            aria-describedby="notes-help"
            placeholder="Anything else worth flagging"
          />
          <p id="notes-help" className="text-xs leading-5 text-ink2">
            Keep it concise. Maximum {MAX_NOTES_LENGTH} characters.
          </p>
        </div>

        {error && (
          <div
            className="mb-4 rounded-lg border border-red/30 bg-red/5 px-3.5 py-3 text-sm text-red"
            role="alert"
            aria-live="assertive"
          >
            <p>{error}</p>
            {failureKind === "auth" && (
              <Link
                href="/?authRequired=1"
                className="mt-2 inline-flex min-h-9 items-center rounded-md underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60"
              >
                Sign in again
              </Link>
            )}
            {(failureKind === "network" || failureKind === "server") && (
              <button
                type="button"
                onClick={() => void sendSubmission()}
                disabled={status === "submitting"}
                className="mt-2 min-h-9 rounded-md border border-line bg-panel2 px-3 text-sm font-medium text-ink transition-colors hover:border-cyan/50 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-50"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <div className="mb-3 rounded-lg border border-line bg-panel2/60 px-3.5 py-2.5 text-sm text-ink2">
          <span className="font-medium text-ink">{summaryLine.split(" · ")[0]}</span>
          <span> · </span>
          <span>{summaryLine.split(" · ").slice(1).join(" · ")}</span>
        </div>

        <button
          type="submit"
          disabled={status === "submitting"}
          className="premium-button w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {status === "submitting" ? (
            <>
              <Spinner />
              <span>Submitting…</span>
            </>
          ) : (
            "Submit attendance"
          )}
        </button>
      </form>
    </>
  );
}

function ReadOnlySubmissionCard({
  submission,
}: {
  submission: Submission;
}) {
  return (
    <div className="premium-card p-5 sm:p-7" aria-live="polite">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-panel2 text-ink2" aria-hidden="true">
              <LockIcon />
            </span>
            <p className="font-display text-lg text-ink">Submitted</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink2">
            Submissions are final. Contact an officer if you made a mistake.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <SummaryItem label="IGN" value={submission.ign} />
        <SummaryItem
          label="Attendance"
          value={submission.attending ? "Attending" : "Not Attending"}
        />
        <SummaryItem
          label="Pilot"
          value={submission.hasPilot ? "Have Pilot" : "No Pilot"}
          fullWidth={!submission.hasPilot}
        />
        {submission.hasPilot ? (
          <SummaryItem label="Pilot Name" value={submission.pilotName || "—"} />
        ) : null}
        <SummaryItem label="Hours" value={`${submission.hours} hrs`} fullWidth />
        <SummaryItem
          label="Submitted"
          value={formatSubmittedAt(submission.createdAt)}
          fullWidth
        />
        <SummaryItem
          label="Notes"
          value={submission.notes || "—"}
          fullWidth
          multiline
        />
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  fullWidth = false,
  multiline = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
  multiline?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-lg border border-line bg-panel2/60 p-3.5",
        fullWidth ? "sm:col-span-2" : "",
      ].join(" ")}
    >
      <p className="text-[11px] uppercase tracking-[0.12em] text-ink2">{label}</p>
      <p
        className={["data-clip mt-1.5 text-sm text-ink", multiline ? "leading-6" : ""].join(" ")}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function ToggleOption({
  id,
  label,
  selected,
  tone,
  onClick,
}: {
  id: string;
  label: string;
  selected: boolean;
  tone: "cyan" | "red" | "neutral";
  onClick: () => void;
}) {
  const styles = {
    cyan: selected ? "border-cyan bg-cyan/10 text-cyan" : "",
    red: selected ? "border-red bg-red/10 text-red" : "",
    neutral: selected ? "border-ink2/60 bg-panel2 text-ink" : "",
  };

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={[
        "premium-toggle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60",
        styles[tone],
      ].join(" ")}
      aria-pressed={selected}
      aria-label={`${label}${selected ? ", selected" : ""}`}
    >
      {label}
    </button>
  );
}

function Spinner() {
  return (
    <span
      className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
      aria-hidden="true"
    />
  );
}

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
