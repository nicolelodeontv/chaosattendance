/** Upper bound for self-reported hours. Keeps typos/abuse out of the log and Discord posts. */
export const MAX_HOURS = 100_000;

/**
 * Parses a submitted "hours" value.
 *
 * Accepts a finite number, or a non-empty numeric string, between 0 and MAX_HOURS.
 * Returns null for anything else. Unlike a bare `Number(value)`, this rejects
 * `null`, `""`, booleans and arrays instead of silently turning them into 0 or 1.
 */
export function parseHours(value: unknown): number | null {
  let parsed: number;

  if (typeof value === "number") {
    parsed = value;
  } else if (typeof value === "string" && value.trim() !== "") {
    parsed = Number(value);
  } else {
    return null;
  }

  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_HOURS
    ? parsed
    : null;
}
