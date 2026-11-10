import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Server-side gate for the signed-in areas. It verifies the session with Supabase (not just that a
 * cookie exists) and redirects visitors to /login before any page code or data is sent.
 * Which portal a user belongs in, and what they may do, is still decided by the backend API.
 */
export async function proxy(request: NextRequest) {
  const toLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return toLogin(); // misconfigured: fail closed

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getUser() asks Supabase to validate the token, and refreshes it when it is close to expiry
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return toLogin();

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/school/:path*", "/change-password"],
};
