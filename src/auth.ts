import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
// Force a fresh Vercel Preview deployment after OAuth diagnostics.
import { checkDiscordGuildMembership } from "@/lib/discord-membership";

const authSecret =
  process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();

const discordClientId =
  process.env.AUTH_DISCORD_ID?.trim() ||
  process.env.DISCORD_CLIENT_ID?.trim() ||
  process.env.DISCORD_ID?.trim();

const discordClientSecret =
  process.env.AUTH_DISCORD_SECRET?.trim() ||
  process.env.DISCORD_CLIENT_SECRET?.trim() ||
  process.env.DISCORD_SECRET?.trim();

function logAuthError(error: unknown) {
  if (error instanceof Error) {
    console.error(`[auth][error] ${error.name}: ${error.message}`);
    if (error.cause instanceof Error) {
      console.error(`[auth][cause] ${error.cause.name}: ${error.cause.message}`);
    }
    if (error.stack) console.error(error.stack);
    return;
  }

  console.error("[auth][error]", error);
}

const configuredAuthUrl =
  process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();

function isValidAbsoluteUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const missingConfig = [
  !authSecret && "AUTH_SECRET",
  !discordClientId && "AUTH_DISCORD_ID",
  !discordClientSecret && "AUTH_DISCORD_SECRET",
].filter(Boolean);

if (configuredAuthUrl && !isValidAbsoluteUrl(configuredAuthUrl)) {
  console.error(
    "[auth][config] AUTH_URL/NEXTAUTH_URL is set but is not a valid absolute URL."
  );
}

if (
  process.env.AUTH_URL?.trim() &&
  process.env.NEXTAUTH_URL?.trim() &&
  process.env.AUTH_URL.trim() !== process.env.NEXTAUTH_URL.trim()
) {
  console.error(
    "[auth][config] Both AUTH_URL and NEXTAUTH_URL are set; AUTH_URL takes precedence in Auth.js v5."
  );
}

if (missingConfig.length > 0) {
  console.error(
    `[auth][config] Missing required auth env vars: ${missingConfig.join(", ")}`
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: process.env.AUTH_DEBUG === "true",
  logger: {
    error: logAuthError,
  },
  secret: authSecret,
  providers: [
    Discord({
      clientId: discordClientId,
      clientSecret: discordClientSecret,
      authorization: {
        url: "https://discord.com/api/oauth2/authorize",
        params: {
          scope: "identify guilds",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile, account }) {
      const discordId =
        typeof (profile as any)?.id === "string"
          ? (profile as any).id.trim()
          : "";
      const accessToken =
        typeof account?.access_token === "string"
          ? account.access_token.trim()
          : "";

      if (!discordId || !accessToken) return false;

      const membership = await checkDiscordGuildMembership(
        discordId,
        accessToken
      );

      console.info(
        "[auth] Discord membership decision:",
        "hasAccessToken=",
        Boolean(accessToken),
        "result=",
        membership
      );

      return membership === "member";
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.discordId = (profile as any).id;
        token.username =
          (profile as any).global_name ?? (profile as any).username;
        const avatarHash = (profile as any).avatar;
        token.avatar = avatarHash
          ? `https://cdn.discordapp.com/avatars/${(profile as any).id}/${avatarHash}.png`
          : null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).discordId = token.discordId as string;
        (session.user as any).username = token.username as string;
        (session.user as any).avatar = token.avatar as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
});
