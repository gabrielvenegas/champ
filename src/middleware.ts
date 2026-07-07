import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // If Supabase env variables are not present, do not block routing (useful for initial local setup / fallback)
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Fetch the current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Helper to redirect while preserving session cookies
  const redirect = (to: string) => {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = to;
    const response = NextResponse.redirect(redirectUrl);
    
    // Copy cookies from supabaseResponse to the redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        maxAge: cookie.maxAge,
        expires: cookie.expires,
        sameSite: cookie.sameSite,
      });
    });
    
    return response;
  };

  // Protect Admin dashboard - only ged.venegas@gmail.com can access
  if (path.startsWith('/admin')) {
    if (!user || user.email !== 'ged.venegas@gmail.com') {
      return redirect('/');
    }
  }

  // Protect other core routes from unauthenticated users
  const protectedRoutes = ['/dashboard', '/leaderboard', '/matches'];
  const isProtected = protectedRoutes.some((route) => path.startsWith(route));
  if (isProtected && !user) {
    return redirect('/');
  }

  // If logged in and attempting to visit login/landing page, redirect to dashboard
  if (path === '/' && user) {
    return redirect('/dashboard');
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js / manifest.json (PWA related)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
