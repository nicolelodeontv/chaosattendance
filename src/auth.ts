import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { checkDiscordGuildMembership } from "@/lib/discord-membership";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      authorization: {
        params: {
          scope: "identify",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      const discordId =
        typeof (profile as any)?.id === "string"
          ? (profile as any).id.trim()
          : "";

      if (!discordId) return false;

      const membership = await checkDiscordGuildMembership(discordId);
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
  },
});
