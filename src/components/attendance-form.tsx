"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "done" | "error";

export function AttendanceForm() {
  const [ign, setIgn] = useState("");
  const [attending, setAttending] = useState<"yes" | "no">("yes");
  const [hasPilot, setHasPilot] = useState<"yes" | "no">("yes");
  const [pilotName, setPilotName] = useState("");
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed");
      }
      setStatus("done");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded border border-line bg-panel p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-cyan text-cyan">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p className="font-display text-base text-ink">Logged</p>
        <p className="mt-1 text-sm text-ink2">Your attendance was recorded and posted to the server.</p>
        <button
          onClick={() => {
            setIgn("");
            setPilotName("");
            setHours("");
            setNotes("");
            setStatus("idle");
          }}
          className="mt-4 text-sm text-cyan hover:underline"
        >
          Submit another entry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded border border-line bg-panel p-6">
      <div className="mb-5 space-y-1.5">
        <label htmlFor="ign" className="text-sm text-ink2">
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

      <fieldset className="mb-5">
        <legend className="mb-2 text-sm text-ink2">Attendance</legend>
        <div className="grid grid-cols-2 gap-2">
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

      <fieldset className="mb-5">
        <legend className="mb-2 text-sm text-ink2">Pilot</legend>
        <div className="grid grid-cols-2 gap-2">
          <ToggleOption
            label="Have Pilot"
            selected={hasPilot === "yes"}
            color="cyan"
            onClick={() => setHasPilot("yes")}
          />
          <ToggleOption
            label="No Pilot"
            selected={hasPilot === "no"}
            color="amber"
            onClick={() => setHasPilot("no")}
          />
        </div>
      </fieldset>

      {hasPilot === "yes" && (
        <div className="mb-5 space-y-1.5">
          <label htmlFor="pilotName" className="text-sm text-ink2">
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

      <div className="mb-5 space-y-1.5">
        <label htmlFor="hours" className="text-sm text-ink2">
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

      <div className="mb-6 space-y-1.5">
        <label htmlFor="notes" className="text-sm text-ink2">
          Notes <span className="text-ink2/70">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else worth flagging"
        />
      </div>

      {error && <p className="mb-4 text-sm text-red">{error}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded border border-amber bg-amber/10 py-2.5 font-display text-sm text-amber transition-colors hover:bg-amber/20 disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Submit attendance"}
      </button>
    </form>
  );
}

const SELECTED_STYLES = {
  cyan: "border-cyan text-cyan bg-cyan/10",
  red: "border-red text-red bg-red/10",
  amber: "border-amber text-amber bg-amber/10",
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-3 py-2 text-left text-sm transition-colors ${
        selected ? SELECTED_STYLES[color] : "border-line text-ink2 hover:border-ink2"
      }`}
    >
      {label}
    </button>
  );
}
