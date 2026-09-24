export type DiscordMembershipStatus = "member" | "not_member" | "unavailable";

const NOT_MEMBER_DISCORD_CODES = new Set([10007, 10013]);

function parseDiscordErrorCode(payload: unknown): number | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const code = (payload as { code?: unknown }).code;
  if (typeof code === "number" && Number.isInteger(code)) return code;
  if (typeof code === "string" && /^\d+$/.test(code)) return Number(code);
  return null;
}

export async function checkDiscordGuildMembership(
  discordId: string,
  accessToken?: string
): Promise<DiscordMembershipStatus> {
  const guildId = process.env.DISCORD_GUILD_ID?.trim() ?? "";
  const memberRoleId = process.env.DISCORD_MEMBER_ROLE_ID?.trim() ?? "";

  if (
    !guildId ||
    !/^\d+$/.test(guildId) ||
    !/^\d+$/.test(discordId) ||
    (accessToken !== undefined && !accessToken)
  ) {
    console.error("Discord guild membership check is not configured correctly.", {
      guildIdLength: guildId.length,
      hasMemberRoleId: Boolean(memberRoleId),
    });
    return "unavailable";
  }

  if (memberRoleId && !/^\d+$/.test(memberRoleId)) {
    console.error("Discord member role ID is not configured correctly.", {
      guildIdLength: guildId.length,
    });
    return "unavailable";
  }

  try {
    const response = accessToken
      ? await fetch(
          "https://discord.com/api/v10/users/@me/guilds/" +
            guildId +
            "/member",
          {
            headers: { Authorization: "Bearer " + accessToken },
            cache: "no-store",
          }
        )
      : await fetch(
          "https://discord.com/api/v10/guilds/" +
            guildId +
            "/members/" +
            discordId,
          {
            headers: {
              Authorization:
                "Bot " + (process.env.DISCORD_BOT_TOKEN?.trim() ?? ""),
            },
            cache: "no-store",
          }
        );

    const payload = await response.json().catch(() => null);
    const discordCode = parseDiscordErrorCode(payload);

    if (!response.ok) {
      const result =
        discordCode !== null && NOT_MEMBER_DISCORD_CODES.has(discordCode)
          ? "not_member"
          : "unavailable";

      console.info("Discord guild membership lookup:", {
        guildIdLength: guildId.length,
        status: response.status,
        discordCode,
        result,
      });

      return result;
    }

    if (memberRoleId) {
      const roles =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? (payload as { roles?: unknown }).roles
          : null;

      if (!Array.isArray(roles) || !roles.every((role) => typeof role === "string")) {
        console.error(
          "Discord guild membership lookup returned an invalid roles payload.",
          {
            guildIdLength: guildId.length,
            status: response.status,
          }
        );
        return "unavailable";
      }

      const result = roles.includes(memberRoleId) ? "member" : "not_member";

      console.info("Discord guild membership lookup:", {
        guildIdLength: guildId.length,
        status: response.status,
        discordCode: null,
        result,
        roleConfigured: true,
        roleMatched: result === "member",
      });

      return result;
    }

    console.info("Discord guild membership lookup:", {
      guildIdLength: guildId.length,
      status: response.status,
      discordCode: null,
      result: "member",
      roleConfigured: false,
    });

    return "member";
  } catch (error) {
    console.error("Discord guild membership check failed:", {
      guildIdLength: guildId.length,
      error,
    });
    return "unavailable";
  }
}
