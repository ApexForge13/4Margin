import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      // Decoder-only MVP — redirect supplement routes to policy decoder
      {
        source: "/dashboard/supplements",
        destination: "/dashboard/policy-decoder",
        permanent: false,
      },
      {
        source: "/dashboard/supplements/:id",
        destination: "/dashboard/policy-decoder",
        permanent: false,
      },
      {
        source: "/dashboard/upload",
        destination: "/dashboard/policy-decoder",
        permanent: false,
      },
      {
        source: "/dashboard/policy-checks",
        destination: "/dashboard/policy-decoder",
        permanent: false,
      },
      {
        source: "/dashboard/policy-checks/:id",
        destination: "/dashboard/policy-decoder",
        permanent: false,
      },
    ];
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
