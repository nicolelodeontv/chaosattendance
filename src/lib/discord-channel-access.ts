const API = "https://discord.com/api/v10";
const VIEW_CHANNEL = BigInt(1) << BigInt(10);
const ADMINISTRATOR = BigInt(1) << BigInt(3);

export type DiscordChannelMember = {
  user: { id: string };
  roles: string[];
};

type Overwrite = { id: string; type: 0 | 1; allow: string; deny: string };
type Role = { id: string; permissions: string };

export type DiscordChannelFailureReason =
  | "http_error"
  | "network_error"
  | "invalid_json"
  | "invalid_payload"
  | "guild_mismatch";

export class DiscordChannelAccessError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
    readonly discordCode: number | string | null,
    readonly reason: DiscordChannelFailureReason,
  ) {
    super("Discord channel permission lookup failed.");
    this.name = "DiscordChannelAccessError";
  }
}

function isNumericString(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]+$/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function discord<T>(path: string): Promise<T> {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) {
    throw new DiscordChannelAccessError(path, 0, null, "network_error");
  }

  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    });
  } catch {
    throw new DiscordChannelAccessError(path, 0, null, "network_error");
  }

  if (!response.ok) {
    let discordCode: number | string | null = null;
    const body: unknown = await response.json().catch(() => null);
    if (isRecord(body)) {
      const value = body.code;
      if (typeof value === "number" || (typeof value === "string" && /^[0-9]+$/.test(value))) {
        discordCode = value;
      }
    }
    throw new DiscordChannelAccessError(path, response.status, discordCode, "http_error");
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new DiscordChannelAccessError(path, response.status, null, "invalid_json");
  }
}

export async function getChannelViewerIds(
  guildId: string,
  channelId: string,
  members: DiscordChannelMember[],
): Promise<Set<string>> {
  const channelPath = `/channels/${channelId}`;
  const [guildRaw, rolesRaw, channelRaw] = await Promise.all([
    discord<unknown>(`/guilds/${guildId}`),
    discord<unknown>(`/guilds/${guildId}/roles`),
    discord<unknown>(channelPath),
  ]);

  if (!isRecord(guildRaw) || !isNumericString(guildRaw.owner_id)) {
    throw new DiscordChannelAccessError(`/guilds/${guildId}`, 200, null, "invalid_payload");
  }
  const ownerId = guildRaw.owner_id;

  if (
    !Array.isArray(rolesRaw) ||
    !rolesRaw.every(
      (role) =>
        isRecord(role) &&
        isNumericString(role.id) &&
        isNumericString(role.permissions),
    )
  ) {
    throw new DiscordChannelAccessError(`/guilds/${guildId}/roles`, 200, null, "invalid_payload");
  }
  const roles = rolesRaw as Role[];

  if (!isRecord(channelRaw)) {
    throw new DiscordChannelAccessError(channelPath, 200, null, "invalid_payload");
  }

  // Check guild identity before channel shape to clearly diagnose a wrong-server ID.
  if (channelRaw.guild_id !== guildId) {
    throw new DiscordChannelAccessError(channelPath, 200, null, "guild_mismatch");
  }

  const overwriteData = channelRaw.permission_overwrites;
  if (
    !Array.isArray(overwriteData) ||
    !overwriteData.every(
      (overwrite) =>
        isRecord(overwrite) &&
        isNumericString(overwrite.id) &&
        (overwrite.type === 0 || overwrite.type === 1) &&
        isNumericString(overwrite.allow) &&
        isNumericString(overwrite.deny),
    )
  ) {
    // Threads and non-standard channel types can omit normal channel overwrites.
    throw new DiscordChannelAccessError(channelPath, 200, null, "invalid_payload");
  }
  const overwrites = overwriteData as Overwrite[];

  const rolePerms = new Map(
    roles.map((role) => [role.id, BigInt(role.permissions)]),
  );
  const everyoneOverwrite = overwrites.find(
    (overwrite) => overwrite.type === 0 && overwrite.id === guildId,
  );
  const viewers = new Set<string>();

  for (const member of members) {
    const userId = member.user.id;
    if (userId === ownerId) {
      viewers.add(userId);
      continue;
    }

    let permissions = rolePerms.get(guildId) ?? BigInt(0);
    for (const roleId of member.roles) {
      permissions |= rolePerms.get(roleId) ?? BigInt(0);
    }
    if (permissions & ADMINISTRATOR) {
      viewers.add(userId);
      continue;
    }

    if (everyoneOverwrite) {
      permissions &= ~BigInt(everyoneOverwrite.deny);
      permissions |= BigInt(everyoneOverwrite.allow);
    }

    let roleDeny = BigInt(0);
    let roleAllow = BigInt(0);
    for (const overwrite of overwrites) {
      if (overwrite.type === 0 && member.roles.includes(overwrite.id)) {
        roleDeny |= BigInt(overwrite.deny);
        roleAllow |= BigInt(overwrite.allow);
      }
    }
    permissions &= ~roleDeny;
    permissions |= roleAllow;

    const memberOverwrite = overwrites.find(
      (overwrite) => overwrite.type === 1 && overwrite.id === userId,
    );
    if (memberOverwrite) {
      permissions &= ~BigInt(memberOverwrite.deny);
      permissions |= BigInt(memberOverwrite.allow);
    }

    if (permissions & VIEW_CHANNEL) viewers.add(userId);
  }

  return viewers;
}
