import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { checkDiscordGuildMembership } from "@/lib/discord-membership";

function parseKnownIds(value: string | null): Set<string> {
  if (!value) return new Set();
  return new Set(
    value.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 20)
  );
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const user = session.user as any;
  const discordId = typeof user?.discordId === "string" ? user.discordId.trim() : "";
  const membership = await checkDiscordGuildMembership(discordId);
  if (membership === "not_member") {
    return NextResponse.json(
      { error: "You must be a member of the Chaos Discord server." },
      { status: 403 }
    );
  }
  if (membership === "unavailable") {
    return NextResponse.json(
      { error: "We couldn't verify your Chaos membership. Please try again." },
      { status: 503 }
    );
  }

  if (!(await isAdmin(discordId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const sinceParam = Number(url.searchParams.get("since") ?? "0");
  const since = Number.isFinite(sinceParam) ? sinceParam : 0;
  const knownIds = parseKnownIds(url.searchParams.get("knownIds"));

  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      ign: true,
      attending: true,
      hasPilot: true,
      pilotName: true,
      hours: true,
      createdAt: true,
    },
  });

  const latestTimestamp = submissions.reduce(
    (latest, submission) => Math.max(latest, submission.createdAt.getTime()),
    since
  );

  const notifications = submissions.map((submission) => {
    const timestamp = submission.createdAt.getTime();
    return {
      id: submission.id,
      ign: submission.ign,
      attendance: submission.attending ? "Attending" : "Not Attending",
      hasPilot: submission.hasPilot,
      pilotName: submission.pilotName,
      hours: submission.hours,
      timestamp: submission.createdAt.toISOString(),
      eventType:
        knownIds.has(submission.id) || timestamp <= since ? "updated" : "created",
    };
  });

  return NextResponse.json({
    notifications,
    latestTimestamp,
    serverNow: Date.now(),
  });
}
