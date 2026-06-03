import { NextResponse } from "next/server";

export function proxy(request) {
  return handleAuthRedirect(request, "[Proxy]");
}

export function handleAuthRedirect(request, label = "[Proxy]") {
  const pathname = request.nextUrl.pathname;

  const publicRoutes = ["/login", "/login/superadmin", "/api/auth"];
  const publicFiles = [
    "/sw.js",
    "/manifest.json",
    "/favicon.ico",
    "/icon.svg",
    "/apple-icon.png",
    "/icon-192x192.png",
    "/icon-512x512.png",
    "/icon-light-32x32.png",
    "/icon-dark-32x32.png",
  ];

  const isPublicRoute =
    pathname === "/" ||
    publicRoutes.some((route) => pathname.startsWith(route));
  const isPublicFile = publicFiles.includes(pathname);

  if (isPublicRoute || isPublicFile) {
    return NextResponse.next();
  }

  const cookieObj = request.cookies.get("authToken");
  const authToken = typeof cookieObj === "object" ? cookieObj?.value : cookieObj;

  if (!authToken) {
    console.log(
      `${label} Unauthenticated access to ${pathname}, redirecting to login. Cookie: ${!!cookieObj}`,
    );
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon|manifest.json|sw.js).*)",
  ],
};
