import { prisma } from "./prisma";

type SubmissionPayload = {
  opId: string;
  discordUsername: string;
  ign: string;
  attending: boolean;
  hasPilot: boolean;
  pilotName?: string | null;
  hours: number;
  notes?: string | null;
  created: boolean;
};

const DISABLED_WEBHOOK_PREFIX = "__CHAOS_DISCORD_DISABLED__::";

export async function notifyDiscord(sub: SubmissionPayload) {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const configuredWebhook = settings?.webhookUrl || "";
    if (configuredWebhook.startsWith(DISABLED_WEBHOOK_PREFIX)) return;

    const webhookUrl = configuredWebhook || process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    const color = sub.attending ? 0x47cad6 : 0xe45763;
    const fields = [
      { name: "Op", value: sub.opId, inline: true },
      { name: "IGN", value: sub.ign, inline: true },
      {
        name: "Attendance",
        value: sub.attending ? "Attending" : "Not Attending",
        inline: true,
      },
      {
        name: "Pilot",
        value: sub.hasPilot ? "Have Pilot" : "No Pilot",
        inline: true,
      },
    ];

    if (sub.hasPilot && sub.pilotName) {
      fields.push({ name: "Pilot Name", value: sub.pilotName, inline: true });
    }
    fields.push({ name: "Hours", value: String(sub.hours), inline: true });
    if (sub.notes) fields.push({ name: "Notes", value: sub.notes, inline: false });

    const body = {
      embeds: [
        {
          title: sub.created ? "New attendance submission" : "Attendance response updated",
          description: "Submitted by " + sub.discordUsername,
          color,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("Discord webhook returned a non-success status:", response.status);
    }
  } catch (err) {
    console.error("Failed to notify Discord webhook", err);
  }
}
