import { auth } from "@/auth";
import { NextResponse } from "next/server";

// This only confirms someone is logged in (fast, edge-safe). The actual
// admin-role check (against the database) happens in the admin page and
// API routes themselves, since that requires a real database query.
export default auth((req) => {
  // Auth.js configuration errors can surface as a truthy object without a
  // real session. Require the Discord user ID that our session callback sets.
  const discordId = req.auth?.user?.discordId;
  const hasAuthenticatedUser =
    typeof discordId === "string" && /^\d+$/.test(discordId.trim());

  if (!hasAuthenticatedUser) {
    const url = new URL("/", req.nextUrl.origin);
    url.searchParams.set("authRequired", "1");
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
