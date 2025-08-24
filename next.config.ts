import type { NextConfig } from "next";

// Security headers configuration
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://js.clerk.dev https://*.clerk.accounts.dev https://*.accounts.dev https://*.clerk.dev https://clerk.zoomjudge.com https://accounts.zoomjudge.com https://js.stripe.com https://va.vercel-scripts.com https://vercel.live https://js.hcaptcha.com https://hcaptcha.com https://*.hcaptcha.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://recaptcha.net blob:",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.clerk.accounts.dev https://*.accounts.dev https://clerk.zoomjudge.com https://accounts.zoomjudge.com https://hcaptcha.com https://*.hcaptcha.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob: https://randomuser.me",
      "connect-src 'self' https://api.convex.cloud https://*.convex.cloud wss://*.convex.cloud https://openrouter.ai https://clerk.dev https://*.clerk.accounts.dev https://*.accounts.dev https://api.clerk.dev https://clerk-telemetry.com https://clerk.zoomjudge.com https://accounts.zoomjudge.com https://api.stripe.com https://*.stripe.com https://vitals.vercel-insights.com https://vercel.live https://hcaptcha.com https://*.hcaptcha.com https://api.hcaptcha.com https://www.google.com https://www.recaptcha.net https://recaptcha.net",
      "frame-src 'self' https://js.clerk.dev https://*.clerk.accounts.dev https://*.accounts.dev https://clerk.zoomjudge.com https://accounts.zoomjudge.com https://js.stripe.com https://*.stripe.com https://hcaptcha.com https://*.hcaptcha.com https://www.google.com https://recaptcha.net https://www.recaptcha.net",
      "form-action 'self' https://*.accounts.dev https://*.clerk.accounts.dev https://clerk.zoomjudge.com https://accounts.zoomjudge.com",
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
      // CORS headers for API routes
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://www.zoomjudge.com, https://zoomjudge.com, https://accounts.zoomjudge.com, https://clerk.zoomjudge.com',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      // Cache static assets
      {
        source: '/icon.svg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      '@tabler/icons-react',
      'lucide-react',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
    ],
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
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    unoptimized: false,
    loader: 'default',
    // Disable optimization for SVG files
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Webpack configuration
  webpack: (config: any, { dev }: { dev: boolean }) => {
    // Reduce Watchpack errors on Windows by excluding system files
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: '**/node_modules/**',
      }
    }

    // Bundle analyzer in development
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new (require('@next/bundle-analyzer')({
          enabled: true,
        }))()
      )
    }

    return config
  },

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
