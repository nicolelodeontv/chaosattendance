import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { DiscordChannelAccessError, getChannelViewerIds, type DiscordChannelMember } from "@/lib/discord-channel-access";
import { DiscordRosterFetchError, fetchDiscordRoster, type DiscordRosterMember } from "@/lib/discord-roster";
import { getDiscordNameParts } from "@/lib/discord-names";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const user = session?.user as { discordId?: unknown } | undefined;
  const discordId =
    typeof user?.discordId === "string" ? user.discordId.trim() : "";

  if (!/^\d+$/.test(discordId)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!(await isAdmin(discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const guildId = process.env.DISCORD_GUILD_ID?.trim() ?? "";
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim() ?? "";
  const memberRoleId = process.env.DISCORD_MEMBER_ROLE_ID?.trim() ?? "";
  const channelId = process.env.DISCORD_ROSTER_CHANNEL_ID?.trim() ?? "";

  if (!/^\d+$/.test(guildId) || !botToken) {
    return NextResponse.json(
      {
        error:
          "Roster sync is not configured. Set DISCORD_GUILD_ID and DISCORD_BOT_TOKEN in the server environment.",
        code: "ROSTER_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }
  if (memberRoleId && !/^\d+$/.test(memberRoleId)) {
    return NextResponse.json(
      { error: "DISCORD_MEMBER_ROLE_ID must be a Discord role ID." },
      { status: 503 }
    );
  }
  if (channelId && !/^\d+$/.test(channelId)) {
    return NextResponse.json(
      { error: "DISCORD_ROSTER_CHANNEL_ID must be a Discord channel ID." },
      { status: 503 }
    );
  }

  const settings = await prisma.settings.findUnique({
    where: { id: 1 },
    select: { currentOpId: true },
  });
  const currentOpId = settings?.currentOpId?.trim() || "current";

  let roster: DiscordRosterMember[];
  try {
    roster = await fetchDiscordRoster({ forceRefresh: true });
  } catch (error) {
    if (error instanceof DiscordRosterFetchError) {
      if (error.code === "network") {
        return NextResponse.json(
          { error: "Discord could not be reached. Try refreshing the roster." },
          { status: 502 }
        );
      }
      if (error.code === "http") {
        const message =
          error.status === 401 || error.status === 403
            ? "Discord rejected the bot credentials or member-list permissions. Check the bot token and enable the Server Members intent."
            : error.status === 429
              ? "Discord rate-limited the roster sync. Wait a moment, then refresh."
              : "Discord roster sync failed with status " + error.status + ".";
        return NextResponse.json(
          { error: message, code: "DISCORD_ROSTER_FAILED" },
          { status: 502 }
        );
      }
      if (error.code === "limit_reached") {
        return NextResponse.json(
          {
            error:
              "The server roster is larger than the safe sync limit. No partial missing-member list was returned.",
            code: "ROSTER_LIMIT_REACHED",
          },
          { status: 503 }
        );
      }
      const message =
        error.code === "invalid_roles"
          ? "Discord returned an invalid member-role list."
          : "Discord returned an invalid member list.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
    console.error("[missing-members] Roster sync failed", { reason: "unexpected_error" });
    return NextResponse.json(
      { error: "Discord roster sync failed. Try refreshing the roster." },
      { status: 502 }
    );
  }

  // Match and filter exclusively by Discord account ID and configured role IDs.
  let members = roster.filter(
    (member) => !memberRoleId || member.roles.includes(memberRoleId)
  );
  const channelMembers: DiscordChannelMember[] = members.map((member) => ({
    user: { id: member.id },
    roles: member.roles,
  }));

  let scope = memberRoleId ? "configured-role" : "all-server-members";
  if (channelId) {
    try {
      const viewerIds = await getChannelViewerIds(guildId, channelId, channelMembers);
      members = members.filter((member) => viewerIds.has(member.id));
      scope = memberRoleId ? "configured-role-and-channel" : "configured-channel-viewers";
    } catch (error) {
      if (error instanceof DiscordChannelAccessError) {
        // Safe diagnostics only; never log headers, tokens, or response bodies.
        console.error("[missing-members] Channel permission lookup failed", {
          endpoint: error.endpoint,
          status: error.status,
          discordCode: error.discordCode,
          reason: error.reason,
        });

        const errorMessage =
          error.reason === "guild_mismatch"
            ? "The configured roster channel belongs to a different Discord server than DISCORD_GUILD_ID."
            : error.discordCode === 50001
              ? `The bot cannot access the configured roster channel (HTTP ${error.status}, Discord code 50001: Missing Access). Grant the bot View Channel permission.`
              : error.discordCode === 10003
                ? `Discord could not find the configured roster channel (HTTP ${error.status}, code 10003: Unknown Channel). Verify the channel ID and server.`
                : error.discordCode === 50013
                  ? `The bot lacks permissions for a Discord channel lookup (HTTP ${error.status}, code 50013: Missing Permissions).`
                  : error.reason === "invalid_payload"
                    ? "Discord returned unexpected channel or permission data. Confirm the configured ID is a regular channel in the configured server, not a thread or category."
                    : `Could not verify channel visibility (Discord endpoint ${error.endpoint}, HTTP ${error.status || "network error"}${error.discordCode === null ? "" : `, code ${error.discordCode}`}). Check the bot's channel access and try again.`;

        return NextResponse.json(
          { error: errorMessage, code: "DISCORD_CHANNEL_FILTER_FAILED" },
          { status: 502 }
        );
      }

      console.error("[missing-members] Channel permission lookup failed", {
        reason: "unexpected_error",
      });
      return NextResponse.json(
        {
          error: "Could not verify channel visibility for the roster. Check the channel configuration and bot permissions.",
          code: "DISCORD_CHANNEL_FILTER_FAILED",
        },
        { status: 502 }
      );
    }
  }

  const submitted = await prisma.submission.findMany({
    where: { opId: currentOpId },
    select: { discordId: true },
  });
  const submittedIds = new Set(submitted.map((row) => row.discordId));
  const missing = members
    .filter((member) => !submittedIds.has(member.id))
    .map(({ id, nick, globalName, username }) => ({ id, nick, globalName, username }))
    .sort((a, b) =>
      getDiscordNameParts(a).primary.localeCompare(getDiscordNameParts(b).primary)
    );

  return NextResponse.json({
    opId: currentOpId,
    rosterCount: members.length,
    submittedCount: members.length - missing.length,
    missingCount: missing.length,
    missing,
    syncedAt: new Date().toISOString(),
    scope,
  });
}
