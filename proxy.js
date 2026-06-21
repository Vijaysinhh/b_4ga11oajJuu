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
    const response = NextResponse.next();
    // Apply security headers to all responses
    addSecurityHeaders(response);
    return response;
  }

  const cookieObj = request.cookies.get("authToken");
  const authToken = typeof cookieObj === "object" ? cookieObj?.value : cookieObj;

  if (!authToken) {
    console.log(
      `${label} Unauthenticated access to ${pathname}, redirecting to login. Cookie: ${!!cookieObj}`,
    );
    const redirectUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(redirectUrl);
    addSecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next();
  addSecurityHeaders(response);
  return response;
}

function addSecurityHeaders(response) {
  // Security Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (CSP)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self';"
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon|manifest.json|sw.js).*)",
  ],
};
