const API = "https://discord.com/api/v10";
const VIEW_CHANNEL = 1n << 10n;
const ADMINISTRATOR = 1n << 3n;

export type DiscordChannelMember = {
  user: { id: string };
  roles: string[];
};

type Overwrite = { id: string; type: 0 | 1; allow: string; deny: string };
type Role = { id: string; permissions: string };

function isNumericString(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]+$/.test(value);
}

async function discord<T>(path: string): Promise<T> {
  const token = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!token) throw new Error("Discord bot token is not configured.");

  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bot ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Discord ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function getChannelViewerIds(
  guildId: string,
  channelId: string,
  members: DiscordChannelMember[],
): Promise<Set<string>> {
  const [guild, roles, channel] = await Promise.all([
    discord<{ owner_id: string }>(`/guilds/${guildId}`),
    discord<Role[]>(`/guilds/${guildId}/roles`),
    discord<{ guild_id: string; permission_overwrites: Overwrite[] }>(
      `/channels/${channelId}`,
    ),
  ]);

  if (!isNumericString(guild.owner_id)) {
    throw new Error("Discord returned an invalid guild owner ID.");
  }
  if (
    !Array.isArray(roles) ||
    !roles.every(
      (role) =>
        role &&
        isNumericString(role.id) &&
        isNumericString(role.permissions),
    )
  ) {
    throw new Error("Discord returned invalid role permissions.");
  }
  if (
    channel.guild_id !== guildId ||
    !Array.isArray(channel.permission_overwrites) ||
    !channel.permission_overwrites.every(
      (overwrite) =>
        overwrite &&
        isNumericString(overwrite.id) &&
        (overwrite.type === 0 || overwrite.type === 1) &&
        isNumericString(overwrite.allow) &&
        isNumericString(overwrite.deny),
    )
  ) {
    throw new Error("Discord returned invalid channel permissions or the channel belongs to a different guild.");
  }

  const rolePerms = new Map(roles.map((role) => [role.id, BigInt(role.permissions)]));
  const overwrites = channel.permission_overwrites;
  const everyoneOverwrite = overwrites.find(
    (overwrite) => overwrite.type === 0 && overwrite.id === guildId,
  );
  const viewers = new Set<string>();

  for (const member of members) {
    const userId = member.user.id;
    if (userId === guild.owner_id) {
      viewers.add(userId);
      continue;
    }

    // Base permissions: @everyone plus all member roles.
    let permissions = rolePerms.get(guildId) ?? 0n;
    for (const roleId of member.roles) {
      permissions |= rolePerms.get(roleId) ?? 0n;
    }
    if (permissions & ADMINISTRATOR) {
      viewers.add(userId);
      continue;
    }

    // Apply the @everyone overwrite first.
    if (everyoneOverwrite) {
      permissions &= ~BigInt(everyoneOverwrite.deny);
      permissions |= BigInt(everyoneOverwrite.allow);
    }

    // Aggregate role denies, then role allows, regardless of overwrite order.
    let roleDeny = 0n;
    let roleAllow = 0n;
    for (const overwrite of overwrites) {
      if (overwrite.type === 0 && member.roles.includes(overwrite.id)) {
        roleDeny |= BigInt(overwrite.deny);
        roleAllow |= BigInt(overwrite.allow);
      }
    }
    permissions &= ~roleDeny;
    permissions |= roleAllow;

    // Member-specific overwrites are applied last.
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
