export type DiscordRosterMember = {
  id: string;
  nick: string | null;
  globalName: string | null;
  username: string;
  roles: string[];
};

type DiscordApiGuildMember = {
  nick?: unknown;
  roles?: unknown;
  user?: {
    id?: unknown;
    username?: unknown;
    global_name?: unknown;
    bot?: unknown;
  };
};

export type DiscordRosterErrorCode =
  | "not_configured"
  | "network"
  | "http"
  | "invalid_payload"
  | "invalid_roles"
  | "limit_reached";

export class DiscordRosterFetchError extends Error {
  constructor(
    public readonly code: DiscordRosterErrorCode,
    public readonly status?: number
  ) {
    super(code);
    this.name = "DiscordRosterFetchError";
  }
}

const DISCORD_API = "https://discord.com/api/v10";
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const CACHE_TTL_MS = 15_000;

let cachedRoster:
  | { guildId: string; expiresAt: number; members: DiscordRosterMember[] }
  | null = null;

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function fetchDiscordRoster(options: {
  forceRefresh?: boolean;
} = {}): Promise<DiscordRosterMember[]> {
  const guildId = process.env.DISCORD_GUILD_ID?.trim() ?? "";
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim() ?? "";

  if (!/^\d+$/.test(guildId) || !botToken) {
    throw new DiscordRosterFetchError("not_configured");
  }

  if (
    !options.forceRefresh &&
    cachedRoster &&
    cachedRoster.guildId === guildId &&
    cachedRoster.expiresAt > Date.now()
  ) {
    return cachedRoster.members;
  }

  const members: DiscordRosterMember[] = [];
  let after = "0";
  let complete = false;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(DISCORD_API + "/guilds/" + guildId + "/members");
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (after !== "0") url.searchParams.set("after", after);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: "Bot " + botToken },
        cache: "no-store",
      });
    } catch {
      throw new DiscordRosterFetchError("network");
    }

    if (!response.ok) {
      throw new DiscordRosterFetchError("http", response.status);
    }

    const payload: unknown = await response.json().catch(() => null);
    if (
      !Array.isArray(payload) ||
      !payload.every((member) => member && typeof member === "object")
    ) {
      throw new DiscordRosterFetchError("invalid_payload");
    }

    const pageMembers = payload as DiscordApiGuildMember[];
    for (const member of pageMembers) {
      const id = member.user?.id;
      if (typeof id !== "string" || !/^\d+$/.test(id)) {
        throw new DiscordRosterFetchError("invalid_payload");
      }

      if (
        !Array.isArray(member.roles) ||
        !member.roles.every((role) => typeof role === "string")
      ) {
        throw new DiscordRosterFetchError("invalid_roles");
      }

      // Bots are intentionally excluded from every consumer of this roster.
      if (member.user?.bot === true) continue;

      members.push({
        id,
        nick: cleanName(member.nick),
        globalName: cleanName(member.user?.global_name),
        username: cleanName(member.user?.username) ?? "Unknown member",
        roles: member.roles as string[],
      });
    }

    if (pageMembers.length < PAGE_SIZE) {
      complete = true;
      break;
    }

    const lastId = pageMembers[pageMembers.length - 1]?.user?.id;
    if (typeof lastId !== "string" || !/^\d+$/.test(lastId) || lastId === after) {
      throw new DiscordRosterFetchError("invalid_payload");
    }
    after = lastId;
  }

  if (!complete) {
    throw new DiscordRosterFetchError("limit_reached");
  }

  cachedRoster = {
    guildId,
    expiresAt: Date.now() + CACHE_TTL_MS,
    members,
  };
  return members;
}
