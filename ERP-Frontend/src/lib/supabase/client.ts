import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client. The session lives in cookies (not localStorage) so the server-side
 * middleware can see it and protect /admin and /school before any page code runs.
 * Set NEXT_PUBLIC_COOKIE_DOMAIN (e.g. ".myclassassist.in") to share the session across subdomains.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN
    ? { cookieOptions: { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN, sameSite: "lax", secure: true } }
    : undefined
);
