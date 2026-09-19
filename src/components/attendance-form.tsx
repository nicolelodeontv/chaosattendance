"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SuccessDialog } from "@/components/success-dialog";

type FieldName = "ign" | "pilotName" | "hours";
type FieldErrors = Partial<Record<FieldName, string>>;
type TouchedFields = Record<FieldName, boolean>;

function validateField(field: FieldName, value: string, hasPilot: "yes" | "no") {
  if (field === "ign") return value.trim() ? "" : "Enter your in-game name.";

  if (field === "pilotName") {
    if (hasPilot !== "yes") return "";
    return value.trim() ? "" : "Enter your pilot's name.";
  }

  if (!value.trim()) return "Enter your hours.";
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? ""
    : "Hours must be a number, 0 or higher.";
}

type Status = "idle" | "submitting" | "error";

type InitialSubmission = {
  id: string;
  ign: string;
  attending: boolean;
  hasPilot: boolean;
  pilotName: string | null;
  hours: number;
  notes: string | null;
};

export function AttendanceForm({ initialSubmission }: { initialSubmission: InitialSubmission | null }) {
  const [ign, setIgn] = useState(initialSubmission?.ign ?? "");
  const [attending, setAttending] = useState<"yes" | "no">(initialSubmission?.attending ? "yes" : "no");
  const [hasPilot, setHasPilot] = useState<"yes" | "no">(initialSubmission?.hasPilot === false ? "no" : "yes");
  const [pilotName, setPilotName] = useState(initialSubmission?.pilotName ?? "");
  const [hours, setHours] = useState(initialSubmission ? String(initialSubmission.hours) : "");
  const [notes, setNotes] = useState(initialSubmission?.notes ?? "");
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("Attendance submitted");
  const [touched, setTouched] = useState<TouchedFields>({ ign: false, pilotName: false, hours: false });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function updateField(field: FieldName, value: string) {
    const error = validateField(field, value, hasPilot);
    setFieldErrors((current) => {
      if (!touched[field] && !current[field]) return current;
      const next = { ...current };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  }

  function touchField(field: FieldName, value: string) {
    setTouched((current) => ({ ...current, [field]: true }));
    const error = validateField(field, value, hasPilot);
    setFieldErrors((current) => {
      const next = { ...current };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  }

  function handlePilotChange(value: "yes" | "no") {
    setHasPilot(value);
    if (value === "no") {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next.pilotName;
        return next;
      });
      return;
    }

    if (touched.pilotName) {
      const error = validateField("pilotName", pilotName, value);
      setFieldErrors((current) => {
        const next = { ...current };
        if (error) next.pilotName = error;
        else delete next.pilotName;
        return next;
      });
    }
  }

  function focusFirstInvalid(errors: FieldErrors) {
    const firstInvalid = (["ign", "pilotName", "hours"] as FieldName[]).find((field) => errors[field]);
    if (!firstInvalid) return;

    window.setTimeout(() => {
      const element = document.getElementById(firstInvalid);
      if (!element) return;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      (element as HTMLInputElement).focus();
    }, 0);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextTouched: TouchedFields = {
      ign: true,
      pilotName: hasPilot === "yes",
      hours: true,
    };
    const nextErrors: FieldErrors = {
      ign: validateField("ign", ign, hasPilot),
      pilotName: validateField("pilotName", pilotName, hasPilot),
      hours: validateField("hours", hours, hasPilot),
    };

    Object.keys(nextErrors).forEach((key) => {
      const field = key as FieldName;
      if (!nextErrors[field]) delete nextErrors[field];
    });

    setTouched(nextTouched);
    setFieldErrors(nextErrors);
    setError("");

    if (Object.keys(nextErrors).length > 0) {
      setStatus("idle");
      focusFirstInvalid(nextErrors);
      return;
    }

    setStatus("submitting");

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

      if (res.status === 409 && data.error === "That IGN is already used by another submission.") {
        setFieldErrors((current) => ({ ...current, ign: data.error }));
        setTouched((current) => ({ ...current, ign: true }));
        setError("");
        setStatus("error");
        focusFirstInvalid({ ign: data.error });
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setStatus("idle");
      setError("");
      setSuccessTitle(data.created ? "Attendance submitted" : "Attendance updated");
      setSuccessOpen(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <>
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

      <form onSubmit={handleSubmit} noValidate className="premium-card mx-auto w-full p-6 sm:p-7">
      <div className="mb-6">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-ink2">
          Your response
        </p>
        <p className="text-sm leading-6 text-ink2">
          {initialSubmission
            ? "Your existing response is loaded below. You can update only your own submission for this op."
            : "Complete the fields below. Your response is tied to your Discord account for this op."}
        </p>
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
          onChange={(e) => {
            const value = e.target.value;
            setIgn(value);
            updateField("ign", value);
          }}
          onBlur={(e) => touchField("ign", e.target.value)}
          aria-invalid={Boolean(fieldErrors.ign)}
          aria-describedby={fieldErrors.ign ? "ign-error" : undefined}
          className={fieldErrors.ign ? "border-red focus:border-red" : ""}
          placeholder="In-game name"
        />
        {fieldErrors.ign && (
          <p id="ign-error" className="text-xs text-red" role="alert">
            {fieldErrors.ign}
          </p>
        )}
      </div>

      <fieldset className="mb-6">
        <legend className="mb-2.5 text-sm font-medium text-ink">Attendance</legend>
        <div className="grid grid-cols-2 gap-2.5">
          <ToggleOption
            label="Attending"
            selected={attending === "yes"}
            color="cyan"
            onClick={() => setAttending("yes")}
          />
          <ToggleOption
            label="Not Attending"
            selected={attending === "no"}
            color="red"
            onClick={() => setAttending("no")}
          />
        </div>
      </fieldset>

      <fieldset className="mb-6">
        <legend className="mb-2.5 text-sm font-medium text-ink">Pilot</legend>
        <div className="grid grid-cols-2 gap-2.5">
          <ToggleOption
            label="Have Pilot"
            selected={hasPilot === "yes"}
            color="cyan"
            onClick={() => handlePilotChange("yes")}
          />
          <ToggleOption
            label="No Pilot"
            selected={hasPilot === "no"}
            color="red"
            onClick={() => handlePilotChange("no")}
          />
        </div>
      </fieldset>

      {hasPilot === "yes" && (
        <div className="mb-6 space-y-2">
          <label htmlFor="pilotName" className="text-sm font-medium text-ink">
            Pilot Name
          </label>
          <input
            id="pilotName"
            type="text"
            required
            value={pilotName}
            onChange={(e) => {
              const value = e.target.value;
              setPilotName(value);
              updateField("pilotName", value);
            }}
            onBlur={(e) => touchField("pilotName", e.target.value)}
            aria-invalid={Boolean(fieldErrors.pilotName)}
            aria-describedby={fieldErrors.pilotName ? "pilotName-error" : undefined}
            className={fieldErrors.pilotName ? "border-red focus:border-red" : ""}
            placeholder="Pilot's name"
          />
          {fieldErrors.pilotName && (
            <p id="pilotName-error" className="text-xs text-red" role="alert">
              {fieldErrors.pilotName}
            </p>
          )}
        </div>
      )}

      <div className="mb-6 space-y-2">
        <label htmlFor="hours" className="text-sm font-medium text-ink">
          Hours
        </label>
        <input
          id="hours"
          type="number"
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

      <div className="mb-7 space-y-2">
        <label htmlFor="notes" className="text-sm font-medium text-ink">
          Notes <span className="font-normal text-ink2">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else worth flagging"
        />
      </div>

      {error && (
        <div
          className="mb-4 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-red"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="premium-button w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Submit attendance"}
      </button>
      </form>
    </>
  );
}

const SELECTED_STYLES = {
  cyan: "border-cyan bg-cyan/10 text-cyan",
  red: "border-red bg-red/10 text-red",
};

function ToggleOption({
  label,
  selected,
  color,
  onClick,
}: {
  label: string;
  selected: boolean;
  color: keyof typeof SELECTED_STYLES;
  onClick: () => void;
}) {
  const classes = ["premium-toggle", selected ? SELECTED_STYLES[color] : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" onClick={onClick} className={classes}>
      {label}
    </button>
  );
}

