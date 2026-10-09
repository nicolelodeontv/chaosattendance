"use client";

import { useEffect, useRef, useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n: number) => String(n).padStart(2, "0");

type DeadlineDraft = {
  year: number;
  month: number;
  day: number;
  hour12: number;
  minute: number;
  pm: boolean;
};

function toDraft(value: string): DeadlineDraft {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  const date = match
    ? new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5])
      )
    : new Date();
  const hour = date.getHours();

  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    hour12: hour % 12 || 12,
    minute: date.getMinutes(),
    pm: hour >= 12,
  };
}

function toLocalValue(draft: DeadlineDraft): string {
  const hour24 = (draft.hour12 % 12) + (draft.pm ? 12 : 0);
  return (
    String(draft.year).padStart(4, "0") +
    "-" + pad(draft.month + 1) +
    "-" + pad(draft.day) +
    "T" + pad(hour24) +
    ":" + pad(draft.minute)
  );
}

function formatValue(value: string): string {
  if (!value) return "Select date and time";
  const draft = toDraft(value);
  return (
    MONTHS[draft.month].slice(0, 3) +
    " " + draft.day +
    ", " + draft.year +
    " · " + draft.hour12 +
    ":" + pad(draft.minute) +
    " " + (draft.pm ? "PM" : "AM")
  );
}

export function DeadlinePicker({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DeadlineDraft>(() => toDraft(value));
  const [view, setView] = useState(() => {
    const initial = toDraft(value);
    return { year: initial.year, month: initial.month };
  });

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function openPicker() {
    const next = toDraft(value);
    setDraft(next);
    setView({ year: next.year, month: next.month });
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function shiftMonth(delta: number) {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  const firstDay = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cellCount = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const calendarCells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstDay + 1;
    return day < 1 || day > daysInMonth ? null : day;
  });
  const currentTime = new Date();
  const isToday = (day: number) =>
    currentTime.getFullYear() === view.year &&
    currentTime.getMonth() === view.month &&
    currentTime.getDate() === day;
  const isSelected = (day: number) =>
    draft.year === view.year && draft.month === view.month && draft.day === day;
  const minuteOptions = Array.from(
    new Set([
      ...Array.from({ length: 12 }, (_, index) => index * 5),
      draft.minute,
    ])
  ).sort((a, b) => a - b);

  return (
    <div className="deadline-picker" ref={rootRef}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="deadline-picker__trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id + "-panel"}
        onClick={() => (open ? closePicker() : openPicker())}
      >
        <span className="deadline-picker__trigger-value">{formatValue(value)}</span>
        <span className="deadline-picker__trigger-icon" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div
          id={id + "-panel"}
          className="deadline-picker__panel"
          role="dialog"
          aria-label="Choose submission deadline"
        >
          <div className="deadline-picker__main">
            <section className="deadline-picker__calendar" aria-label="Calendar">
              <div className="deadline-picker__month-header">
                <button
                  type="button"
                  className="deadline-picker__nav"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <span>{MONTHS[view.month]} {view.year}</span>
                <button
                  type="button"
                  className="deadline-picker__nav"
                  onClick={() => shiftMonth(1)}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              <div className="deadline-picker__grid">
                {DAYS.map((day) => (
                  <span key={day} className="deadline-picker__weekday">{day}</span>
                ))}
                {calendarCells.map((day, index) =>
                  day === null ? (
                    <span key={"blank-" + index} aria-hidden="true" />
                  ) : (
                    <button
                      key={day}
                      type="button"
                      className={
                        "deadline-picker__day" +
                        (isSelected(day) ? " is-selected" : "") +
                        (isToday(day) ? " is-today" : "")
                      }
                      aria-pressed={isSelected(day)}
                      onClick={() => setDraft((current) => ({
                        ...current,
                        year: view.year,
                        month: view.month,
                        day,
                      }))}
                    >
                      {day}
                    </button>
                  )
                )}
              </div>
            </section>

            <section className="deadline-picker__time" aria-label="Time">
              <div className="deadline-picker__time-column" role="group" aria-label="Hour">
                {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    className={draft.hour12 === hour ? "is-selected" : ""}
                    aria-pressed={draft.hour12 === hour}
                    onClick={() => setDraft((current) => ({ ...current, hour12: hour }))}
                  >
                    {pad(hour)}
                  </button>
                ))}
              </div>

              <div className="deadline-picker__time-column" role="group" aria-label="Minute">
                {minuteOptions.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    className={draft.minute === minute ? "is-selected" : ""}
                    aria-pressed={draft.minute === minute}
                    onClick={() => setDraft((current) => ({ ...current, minute }))}
                  >
                    {pad(minute)}
                  </button>
                ))}
              </div>

              <div className="deadline-picker__time-column deadline-picker__ampm" role="group" aria-label="AM or PM">
                <button
                  type="button"
                  className={!draft.pm ? "is-selected" : ""}
                  aria-pressed={!draft.pm}
                  onClick={() => setDraft((current) => ({ ...current, pm: false }))}
                >
                  AM
                </button>
                <button
                  type="button"
                  className={draft.pm ? "is-selected" : ""}
                  aria-pressed={draft.pm}
                  onClick={() => setDraft((current) => ({ ...current, pm: true }))}
                >
                  PM
                </button>
              </div>
            </section>
          </div>

          <div className="deadline-picker__actions">
            <button type="button" className="premium-button-secondary px-3" onClick={closePicker}>
              Cancel
            </button>
            <button
              type="button"
              className="premium-button px-3"
              onClick={() => {
                onChange(toLocalValue(draft));
                closePicker();
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
