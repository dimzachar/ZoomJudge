import type { NextConfig } from "next";

// Security headers configuration
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://js.clerk.dev https://*.clerk.accounts.dev https://*.accounts.dev https://*.clerk.dev https://js.stripe.com https://va.vercel-scripts.com https://vercel.live blob:",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.clerk.accounts.dev https://*.accounts.dev",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.convex.cloud https://*.convex.cloud wss://*.convex.cloud https://openrouter.ai https://clerk.dev https://*.clerk.accounts.dev https://*.accounts.dev https://api.clerk.dev https://clerk-telemetry.com https://api.stripe.com https://*.stripe.com https://vitals.vercel-insights.com https://vercel.live",
      "frame-src 'self' https://js.clerk.dev https://*.clerk.accounts.dev https://*.accounts.dev https://js.stripe.com https://*.stripe.com",
      "form-action 'self' https://*.accounts.dev https://*.clerk.accounts.dev",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons'],
  },

  // Security-related configurations
  poweredByHeader: false,

  // Redirect HTTP to HTTPS in production
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/:path*',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: 'https://zoomjudge.com/:path*',
          permanent: true,
        },
      ];
    }
    return [];
  },

  // Add TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
