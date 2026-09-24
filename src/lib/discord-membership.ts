export type DiscordMembershipStatus = "member" | "not_member" | "unavailable";

interface DiscordGuild {
  id: string;
}

export async function checkDiscordGuildMembership(
  discordId: string,
  accessToken: string
): Promise<DiscordMembershipStatus> {
  const guildId = process.env.DISCORD_GUILD_ID?.trim() ?? "";

  if (
    !guildId ||
    !accessToken ||
    !/^\d+$/.test(guildId) ||
    !/^\d+$/.test(discordId)
  ) {
    console.error("Discord guild membership check is not configured correctly.");
    return "unavailable";
  }

  try {
    const response = await fetch(
      "https://discord.com/api/v10/users/@me/guilds",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "Discord guild membership check failed:",
        response.status,
        response.statusText
      );
      return "unavailable";
    }

    const guilds = (await response.json()) as DiscordGuild[];
    return guilds.some((guild) => guild.id === guildId)
      ? "member"
      : "not_member";
  } catch (error) {
    console.error("Discord guild membership check failed:", error);
    return "unavailable";
  }
}
