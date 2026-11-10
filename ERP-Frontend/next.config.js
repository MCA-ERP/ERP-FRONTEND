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

  // Type errors fail the build (CI also runs `tsc --noEmit`). Lint runs separately via `npm run lint`.
  typescript: {
    ignoreBuildErrors: false,
  },

  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
