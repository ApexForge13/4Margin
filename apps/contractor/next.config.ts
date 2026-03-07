import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  // Only log Sentry build output in CI
  silent: !process.env.CI,

  // Disable source map upload unless auth token is configured
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },

  // Disable release creation unless auth token is configured
  release: {
    create: !!process.env.SENTRY_AUTH_TOKEN,
  },

  // Tunnel Sentry events through the app to avoid ad-blockers
  // tunnelRoute: "/monitoring-tunnel",
});
