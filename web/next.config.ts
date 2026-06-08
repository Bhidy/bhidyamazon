import type { NextConfig } from "next";

// Content-Security-Policy that keeps the app working (Next.js + Tailwind inline
// styles + RSC inline bootstrap need 'unsafe-inline'/'unsafe-eval'). Scheme
// sources (data:, https:) are bare; keyword sources are single-quoted per spec.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "font-src 'self' data:",
  "connect-src 'self'",
].join("; ");

// Applied to every route — defense-in-depth baseline (clickjacking, MIME
// sniffing, referrer leakage, powerful-feature lockdown, CSP).
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to this app (multiple lockfiles exist on the machine).
  turbopack: { root: import.meta.dirname },
  // Bundle the real-data JSON into serverless functions on Vercel — otherwise the
  // process.cwd() fs reads in real-store.ts miss the files and the app silently
  // falls back to seed data in production.
  outputFileTracingIncludes: {
    "/**": ["./src/data/real/**"],
  },
  // Don't advertise the framework in responses.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
