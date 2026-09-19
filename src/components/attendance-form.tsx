"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

type Status = "idle" | "submitting" | "locked" | "error";

export function AttendanceForm({
  alreadySubmitted = false,
  isAdmin = false,
}: {
  alreadySubmitted?: boolean;
  isAdmin?: boolean;
}) {
  const [ign, setIgn] = useState("");
  const [attending, setAttending] = useState<"yes" | "no">("yes");
  const [hasPilot, setHasPilot] = useState<"yes" | "no">("yes");
  const [pilotName, setPilotName] = useState("");
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const router = useRouter();
  const [status, setStatus] = useState<Status>(alreadySubmitted && !isAdmin ? "locked" : "idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [touched, setTouched] = useState<TouchedFields>({ ign: false, pilotName: false, hours: false });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const locked = status === "locked" && !isAdmin;

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

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 2500);
    return () => window.clearTimeout(timer);
  }, [success]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;

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
    setSuccess("");

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

      if (res.status === 409 || data.alreadySubmitted) {
        if (isAdmin) {
          setStatus("error");
          setError(data.error || "Attendance could not be updated.");
        } else {
          setStatus("locked");
          setError("");
          router.refresh();
        }
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setStatus(isAdmin ? "idle" : "locked");
      setError("");
      if (isAdmin) {
        setSuccess(`Attendance updated for ${ign.trim()}`);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setStatus("error");
    }
  }

  if (locked) {
    return <SubmissionLocked />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="premium-card mx-auto w-full p-6 sm:p-7">
      <div className="mb-6">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-ink2">
          Your response
        </p>
        <p className="text-sm leading-6 text-ink2">
          {!isAdmin && "Complete the fields below. Your Discord account will be locked to this op after submission."}
        </p>
      </div>

      {success && (
        <div
          className="mb-4 rounded-md border border-cyan/30 bg-cyan/10 px-3 py-2.5 text-sm text-cyan"
          role="status"
          aria-live="polite"
        >
          {success}
        </div>
      )}

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

function SubmissionLocked() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <section className="premium-card mx-auto w-full p-6 sm:p-7" aria-labelledby="submission-locked-title">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10 text-cyan">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-cyan">
              Submission locked
            </p>
            <h2 id="submission-locked-title" className="font-display text-xl text-ink">
              Already submitted
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-ink2">
              You’ve already submitted for this op. Your response is locked to the current operation.
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-cyan/20 bg-cyan/5 px-4 py-3.5 text-sm leading-6 text-ink2">
          You've already submitted for this op. If you need to change your response, please DM a mod or admin.
        </div>

        <button type="button" onClick={() => setOpen(true)} className="premium-button-secondary">
          Contact mods / admins
        </button>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-mods-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md premium-card p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-cyan">
                  Attendance help
                </p>
                <h3 id="contact-mods-title" className="font-display text-xl text-ink">
                  Contact mods / admins
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="icon-button"
                aria-label="Close contact mods dialog"
              >
                ×
              </button>
            </div>
            <p className="mt-4 text-sm leading-6 text-ink2">
              You've already submitted for this op. If you need to change your response, please DM a mod or admin.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="premium-button mt-6 w-full"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
