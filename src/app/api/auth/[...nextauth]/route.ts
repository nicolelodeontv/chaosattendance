import { handlers } from "@/auth";

export async function GET(request: Request) {
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
