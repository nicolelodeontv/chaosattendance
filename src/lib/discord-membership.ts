export type DiscordMembershipStatus = "member" | "not_member" | "unavailable";

export async function checkDiscordGuildMembership(
  discordId: string
): Promise<DiscordMembershipStatus> {
  const guildId = process.env.DISCORD_GUILD_ID?.trim() ?? "";
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim() ?? "";

  if (!guildId || !botToken || !/^\d+$/.test(guildId) || !/^\d+$/.test(discordId)) {
    console.error("Discord guild membership check is not configured correctly.");
    return "unavailable";
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        cache: "no-store",
      }
    );

    if (response.ok) return "member";
    if (response.status === 404) return "not_member";

    console.error(
      "Discord guild membership check failed:",
      response.status,
      response.statusText
    );
    return "unavailable";
  } catch (error) {
    console.error("Discord guild membership check failed:", error);
    return "unavailable";
  }
}
