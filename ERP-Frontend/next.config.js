const isDev = process.env.NODE_ENV !== "production";

/** Origin (scheme + host) of a URL, or null when it is not set or not a URL. */
const originOf = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

// Content-Security-Policy. Next.js needs inline scripts without a nonce setup, so script-src keeps
// 'unsafe-inline'; everything else is limited to what the app really loads.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://checkout.razorpay.com`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  [
    "connect-src 'self'",
    supabaseOrigin,
    supabaseOrigin && supabaseOrigin.replace(/^http/, "ws"),
    apiOrigin,
    "https://*.razorpay.com",
    isDev ? "ws://localhost:*" : null,
  ]
    .filter(Boolean)
    .join(" "),
  "frame-src https://api.razorpay.com https://checkout.razorpay.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.razorpay.com\")" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" }]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  // One project serves two addresses: the public front page on the main domain (myclassassist.in) and the ERP on the
  // app address (NEXT_PUBLIC_ADMIN_DASHBOARD_URL, like https://erp.myclassassist.in). Sign-in and every portal belong on the
  // app address, so they are sent there from the main domain, and "/" on the app address opens the sign-in page.
  // When both are the same address (or on localhost) nothing is redirected.
  async redirects() {
    const appUrl = (process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || "").replace(/\/$/, "");
    const rootDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "";
    let appHost = "";
    try {
      appHost = appUrl ? new URL(appUrl).host : "";
    } catch {
      appHost = "";
    }
    if (!appHost || !rootDomain || appHost === rootDomain) return [];

    const escape = (host) => host.replace(/\./g, "\\.");
    const onMainDomain = [{ type: "host", value: `(www\\.)?${escape(rootDomain)}` }];
    const onAppAddress = [{ type: "host", value: escape(appHost) }];

    return [
      { source: "/", has: onAppAddress, destination: "/login", permanent: false },
      ...["/login", "/change-password", "/reset-password", "/admin/:path*", "/school/:path*"].map((source) => ({
        source,
        has: onMainDomain,
        destination: `${appUrl}${source}`,
        permanent: false,
      })),
    ];
  },

  // Type errors fail the build (CI also runs `tsc --noEmit`). Lint runs separately via `npm run lint`.
  typescript: {
    ignoreBuildErrors: false,
  },

  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
