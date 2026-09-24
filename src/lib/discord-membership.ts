export type DiscordMembershipStatus = "member" | "not_member" | "unavailable";

interface DiscordGuild {
  id: string;
}

export async function checkDiscordGuildMembership(
  discordId: string,
  accessToken?: string
): Promise<DiscordMembershipStatus> {
  const guildId = process.env.DISCORD_GUILD_ID?.trim() ?? "";

  if (
    !guildId ||
    !/^\d+$/.test(guildId) ||
    !/^\d+$/.test(discordId) ||
    (accessToken !== undefined && !accessToken)
  ) {
    console.error("Discord guild membership check is not configured correctly.");
    return "unavailable";
  }

  try {
    const response = accessToken
      ? await fetch("https://discord.com/api/v10/users/@me/guilds", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        })
      : await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`,
          {
            headers: {
              Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN?.trim() ?? ""}`,
            },
            cache: "no-store",
          }
        );

    if (response.ok) {
      if (!accessToken) return "member";

      const guilds = (await response.json()) as DiscordGuild[];
      return guilds.some((guild) => guild.id === guildId)
        ? "member"
        : "not_member";
    }

    if (!accessToken && response.status === 404) return "not_member";

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
