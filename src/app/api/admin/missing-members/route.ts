import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type DiscordMember = {
  user?: {
    id?: unknown;
    username?: unknown;
    global_name?: unknown;
    bot?: unknown;
  };
  roles?: unknown;
};

export const dynamic = "force-dynamic";

const DISCORD_API = "https://discord.com/api/v10";
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = session.user as { discordId?: unknown };
  const discordId =
    typeof user?.discordId === "string" ? user.discordId.trim() : "";
  if (!(await isAdmin(discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const guildId = process.env.DISCORD_GUILD_ID?.trim() ?? "";
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim() ?? "";
  const memberRoleId = process.env.DISCORD_MEMBER_ROLE_ID?.trim() ?? "";

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

  const settings = await prisma.settings.findUnique({
    where: { id: 1 },
    select: { currentOpId: true },
  });
  const currentOpId = settings?.currentOpId?.trim() || "current";

  const members: Array<{ discordId: string; username: string }> = [];
  let after = "0";
  let complete = false;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL(`${DISCORD_API}/guilds/${guildId}/members`);
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (after !== "0") url.searchParams.set("after", after);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: "Bot " + botToken },
        cache: "no-store",
      });
    } catch {
      return NextResponse.json(
        { error: "Discord could not be reached. Try refreshing the roster." },
        { status: 502 }
      );
    }

    if (!response.ok) {
      const message =
        response.status === 401 || response.status === 403
          ? "Discord rejected the bot credentials or member-list permissions. Check the bot token and enable the Server Members intent."
          : response.status === 429
            ? "Discord rate-limited the roster sync. Wait a moment, then refresh."
            : "Discord roster sync failed with status " + response.status + ".";
      return NextResponse.json(
        { error: message, code: "DISCORD_ROSTER_FAILED" },
        { status: 502 }
      );
    }

    const payload: unknown = await response.json().catch(() => null);
    if (
      !Array.isArray(payload) ||
      !payload.every((member) => member && typeof member === "object")
    ) {
      return NextResponse.json(
        { error: "Discord returned an invalid member list." },
        { status: 502 }
      );
    }

    const pageMembers = payload as DiscordMember[];
    for (const member of pageMembers) {
      const id = member.user?.id;
      if (typeof id !== "string" || !/^\d+$/.test(id)) {
        return NextResponse.json(
          { error: "Discord returned a member without a valid account ID." },
          { status: 502 }
        );
      }
      if (
        memberRoleId &&
        (!Array.isArray(member.roles) ||
          !member.roles.every((role) => typeof role === "string"))
      ) {
        return NextResponse.json(
          { error: "Discord returned an invalid member-role list." },
          { status: 502 }
        );
      }
      if (
        member.user?.bot === true ||
        (memberRoleId && !(member.roles as string[]).includes(memberRoleId))
      ) {
        continue;
      }
      const username =
        (typeof member.user?.global_name === "string" && member.user.global_name.trim()) ||
        (typeof member.user?.username === "string" && member.user.username.trim()) ||
        "Unknown member";
      members.push({ discordId: id, username });
    }

    if (pageMembers.length < PAGE_SIZE) {
      complete = true;
      break;
    }

    const lastId = pageMembers[pageMembers.length - 1]?.user?.id;
    if (typeof lastId !== "string" || !/^\d+$/.test(lastId) || lastId === after) {
      return NextResponse.json(
        { error: "Discord roster pagination returned an invalid cursor." },
        { status: 502 }
      );
    }
    after = lastId;
  }

  if (!complete) {
    return NextResponse.json(
      {
        error:
          "The server roster is larger than the safe sync limit. No partial missing-member list was returned.",
        code: "ROSTER_LIMIT_REACHED",
      },
      { status: 503 }
    );
  }

  const submitted = await prisma.submission.findMany({
    where: { opId: currentOpId },
    select: { discordId: true },
  });
  const submittedIds = new Set(submitted.map((row) => row.discordId));
  const missing = members
    .filter((member) => !submittedIds.has(member.discordId))
    .sort((a, b) => a.username.localeCompare(b.username));

  return NextResponse.json({
    opId: currentOpId,
    rosterCount: members.length,
    submittedCount: members.length - missing.length,
    missingCount: missing.length,
    missing,
    syncedAt: new Date().toISOString(),
    scope: memberRoleId ? "configured-role" : "all-server-members",
  });
}
