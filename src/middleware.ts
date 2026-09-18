import { auth } from "@/auth";
import { NextResponse } from "next/server";

// This only confirms someone is logged in (fast, edge-safe). The actual
// admin-role check (against the database) happens in the admin page and
// API routes themselves, since that requires a real database query.
export default auth((req) => {
  if (!req.auth) {
    const url = new URL("/", req.nextUrl.origin);
    url.searchParams.set("authRequired", "1");
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
