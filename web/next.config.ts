import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app (multiple lockfiles exist on the machine).
  turbopack: { root: import.meta.dirname },
  // Bundle the real-data JSON into serverless functions on Vercel — otherwise the
  // process.cwd() fs reads in real-store.ts miss the files and the app silently
  // falls back to seed data in production.
  outputFileTracingIncludes: {
    "/**": ["./src/data/real/**"],
  },
};

export default nextConfig;
