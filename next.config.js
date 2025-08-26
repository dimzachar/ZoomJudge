/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['resend', '@react-email/render'],

  // Exclude backup directories from compilation
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],

  // Ignore backup and test directories during build
  typescript: {
    ignoreBuildErrors: false,
  },


  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle server-side bundling for email packages
      config.externals = config.externals || [];
      config.externals.push({
        'resend': 'commonjs resend',
        '@react-email/render': 'commonjs @react-email/render',
      });
    }

    return config;
  },
  // Enable static optimization
  output: 'standalone',
  
  // Image optimization
  images: {
    domains: ['images.unsplash.com', 'avatars.githubusercontent.com', 'randomuser.me'],
  },
  
  // Security headers and dev cache control
  async headers() {
    const headers = [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
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
};

module.exports = nextConfig;
