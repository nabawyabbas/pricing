import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "session_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  const publicPaths = [
    "/login",
    "/not-authorized",
    "/_next",
    "/favicon.ico",
  ];

  // Check if path is public
  const isPublicPath = publicPaths.some((path) => {
    if (path === "/_next") {
      return pathname.startsWith("/_next");
    }
    return pathname === path;
  });

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check if session cookie exists
  const sessionToken = request.cookies.get(COOKIE_NAME);

  if (!sessionToken) {
    // Redirect to login if no session cookie
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
