export function logServerError(context: string, error: unknown) {
  const details: { name: string; code?: string } = {
    name: error instanceof Error ? error.name : "UnknownError",
  };

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    details.code = (error as { code: string }).code;
  }

  console.error(context, details);
}
