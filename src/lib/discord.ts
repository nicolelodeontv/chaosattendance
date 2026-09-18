import { prisma } from "./prisma";

type SubmissionPayload = {
  discordUsername: string;
  ign: string;
  attending: boolean;
  hasPilot: boolean;
  pilotName?: string | null;
  hours: number;
  notes?: string | null;
};

export async function notifyDiscord(sub: SubmissionPayload) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const webhookUrl = settings?.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const color = sub.attending ? 0x3fc1c9 : 0xe0575b;

  const fields = [
    { name: "IGN", value: sub.ign, inline: true },
    { name: "Attendance", value: sub.attending ? "Attending" : "Not Attending", inline: true },
    { name: "Pilot", value: sub.hasPilot ? "Have Pilot" : "No Pilot", inline: true },
  ];

  if (sub.hasPilot && sub.pilotName) {
    fields.push({ name: "Pilot Name", value: sub.pilotName, inline: true });
  }
  fields.push({ name: "Hours", value: String(sub.hours), inline: true });
  if (sub.notes) fields.push({ name: "Notes", value: sub.notes, inline: false });

  const body = {
    embeds: [
      {
        title: "New attendance submission",
        description: `Submitted by ${sub.discordUsername}`,
        color,
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("Failed to notify Discord webhook", err);
  }
}
