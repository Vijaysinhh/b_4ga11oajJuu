import { NextResponse } from 'next/server';

export default function middleware(request) {
  const pathname = request.nextUrl.pathname;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // For protected routes, check for Supabase auth token in cookies
  // Supabase sets this automatically via the SupabaseAuthProvider
  const supabaseToken = request.cookies.get('sb-auth-token')?.value;
  
  if (!supabaseToken) {
    console.log(`[Middleware] Unauthenticated access to ${pathname}, redirecting to login`);
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon|manifest.json).*)'],
};
