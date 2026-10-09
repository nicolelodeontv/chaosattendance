import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (url.pathname === "/api/auth/callback/discord") {
    // Log only the public issuer identifier; never log OAuth code or state.
    console.info(
      "[auth][discord-callback] iss:",
      url.searchParams.get("iss") ?? "(missing)"
    );
  }

  return handlers.GET(request);
}

export const POST = handlers.POST;
