import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hostKindOf, siblingHost, type PortalKind } from "@/lib/hosts";

/**
 * Keeps each portal on its own address: the platform team on admin.<domain>, schools on erp.<domain>, and the public
 * website on the main domain. Wrong-address requests are sent to the right one. Returns null when no rule applies.
 */
function hostRule(request: NextRequest): NextResponse | null {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const kind = hostKindOf(host);
  if (kind === "other") return null;
  const path = request.nextUrl.pathname;
  const under = (p: string) => path === p || path.startsWith(p + "/");
  const to = (target: PortalKind) => {
    const url = request.nextUrl.clone();
    url.host = siblingHost(host, target);
    return NextResponse.redirect(url);
  };
  const here = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (kind === "admin") {
    if (under("/school") || under("/teacher") || under("/accounts") || under("/admissions") || under("/applicant")) return to("erp");
    if (path === "/") return here("/super-admin");
  } else if (kind === "erp") {
    if (under("/super-admin")) return to("admin");
    if (path === "/") return here("/school");
  } else {
    // the public website: the portals and their sign-in pages live on their own addresses
    if (under("/super-admin")) return to("admin");
    if (under("/school") || under("/teacher") || under("/accounts") || under("/admissions") || under("/applicant")) return to("erp");
    if (under("/login") || under("/apply") || under("/reset-password") || under("/change-password")) return to("erp");
  }
  return null;
}

/**
 * Server-side gate for the signed-in areas. It verifies the session with Supabase (not just that a
 * cookie exists) and redirects visitors to /login before any page code or data is sent.
 * Which portal a user belongs in, and what they may do, is still decided by the backend API.
 */
export async function proxy(request: NextRequest) {
  const moved = hostRule(request);
  if (moved) return moved;
  if (!/^\/(super-admin|school|teacher|accounts|admissions|applicant|change-password)(\/|$)/.test(request.nextUrl.pathname)) return NextResponse.next();

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
  // every page (the address rules need to see "/" and "/login"), but not files, images or the API
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json)$).*)"],
};
