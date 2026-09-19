"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const locked = status === "locked" && !isAdmin;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;

    setStatus("submitting");
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

      if (res.status === 409 || data.alreadySubmitted) {
        setStatus(isAdmin ? "idle" : "locked");
        setError("");
        router.refresh();
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setStatus(isAdmin ? "idle" : "locked");
      setError("");
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
    <form onSubmit={handleSubmit} className="premium-card p-6 sm:p-7">
      <div className="mb-6">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-ink2">
          Your response
        </p>
        <p className="text-sm leading-6 text-ink2">
          {isAdmin
            ? "Admin mode: you can resubmit and update your existing row for this op."
            : "Complete the fields below. Your Discord account will be locked to this op after submission."}
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
          onChange={(e) => setIgn(e.target.value)}
          placeholder="In-game name"
        />
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
            onClick={() => setHasPilot("yes")}
          />
          <ToggleOption
            label="No Pilot"
            selected={hasPilot === "no"}
            color="red"
            onClick={() => setHasPilot("no")}
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
            onChange={(e) => setPilotName(e.target.value)}
            placeholder="Pilot's name"
          />
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
          onChange={(e) => setHours(e.target.value)}
          placeholder="0"
        />
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
        <div className="mb-4 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-red">
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
      <section className="premium-card p-6 sm:p-7" aria-labelledby="submission-locked-title">
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
