export type DiscordNameFields = {
  nick?: string | null;
  globalName?: string | null;
  username?: string | null;
};

export type DiscordNameParts = {
  primary: string;
  secondary: string[];
};

function clean(value: string | null | undefined): string | null {
  const result = value?.trim();
  return result || null;
}

function normalizedName(value: string): string {
  return value.trim().replace(/^@/, "").toLocaleLowerCase("en");
}

export function getDiscordNameParts(
  member: DiscordNameFields,
  fallbackName?: string | null,
  options: { alwaysShowUsername?: boolean } = {}
): DiscordNameParts {
  const nick = clean(member.nick);
  const globalName = clean(member.globalName);
  const username = clean(member.username);
  const fallback = clean(fallbackName);
  const primary = nick || globalName || username || fallback || "Unknown member";
  const primaryKey = normalizedName(primary);
  const secondary: string[] = [];

  if (options.alwaysShowUsername) {
    // In Missing Members, always show the account handle. A global name is
    // redundant only when it matches the primary name, case-insensitively.
    if (globalName && normalizedName(globalName) !== primaryKey) {
      secondary.push(globalName);
    }
    if (username) secondary.push("@" + username);
  } else {
    const seen = new Set<string>([primaryKey]);
    const candidates = [globalName, username ? "@" + username : null];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const key = normalizedName(candidate);
      if (seen.has(key)) continue;
      seen.add(key);
      secondary.push(candidate);
    }
  }

  return { primary, secondary };
}
