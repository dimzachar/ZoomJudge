import type { NextConfig } from "next";

// Security headers configuration (CSP and frame options now handled by Clerk middleware)
const securityHeaders = [
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
    value: 'camera=(), microphone=(), geolocation=()',
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
  // Server external packages for email functionality
  serverExternalPackages: ['resend', '@react-email/render'],

  // Page extensions
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],

  // Output configuration for deployment
  output: 'standalone',

  async headers() {
    const headers = [
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
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
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

    // Add no-cache headers in development to prevent stale code issues
    if (process.env.NODE_ENV === 'development') {
      headers.push({
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      });
    }

    return headers;
  },

  // Temporarily disable experimental features to fix React 19 hook issues in production
  // experimental: {
  //   optimizePackageImports: [
  //     '@radix-ui/react-icons',
  //     '@tabler/icons-react',
  //     'lucide-react',
  //     '@radix-ui/react-avatar',
  //     '@radix-ui/react-checkbox',
  //     '@radix-ui/react-collapsible',
  //     '@radix-ui/react-dialog',
  //     '@radix-ui/react-dropdown-menu',
  //     '@radix-ui/react-label',
  //     '@radix-ui/react-progress',
  //     '@radix-ui/react-select',
  //     '@radix-ui/react-separator',
  //     '@radix-ui/react-slot',
  //     '@radix-ui/react-switch',
  //     '@radix-ui/react-tabs',
  //     '@radix-ui/react-toggle',
  //     '@radix-ui/react-toggle-group',
  //     '@radix-ui/react-tooltip',
  //   ],
  // },

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
          destination: 'https://www.zoomjudge.com/:path*',
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
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    unoptimized: false,
    loader: 'default',
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'randomuser.me',
        port: '',
        pathname: '/api/**',
      },
    ],
  },

  // Webpack configuration
  webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    // Handle server-side bundling for email packages
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'resend': 'commonjs resend',
        '@react-email/render': 'commonjs @react-email/render',
      });
    }

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

  // Performance optimizations - temporarily disable console removal for debugging
  compiler: {
    removeConsole: false, // Temporarily disabled to help debug React 19 issues
  },
};

export default nextConfig;
