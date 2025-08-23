import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zoomjudge.vercel.app'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/settings/',
          '/dashboard/billing/',
          '/test-*',
          '/_next/',
          '/convex/',
          '/admin/',
          '/private/'
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: [
          '/',
          '/demo',
          '/dashboard',
        ],
        disallow: [
          '/api/',
          '/dashboard/settings/',
          '/dashboard/billing/',
          '/test-*'
        ]
      },
      {
        userAgent: 'ChatGPT-User',
        allow: [
          '/',
          '/demo',
          '/dashboard',
        ],
        disallow: [
          '/api/',
          '/dashboard/settings/',
          '/dashboard/billing/',
          '/test-*'
        ]
      },
      {
        userAgent: 'Claude-Web',
        allow: [
          '/',
          '/demo',
          '/dashboard',
        ],
        disallow: [
          '/api/',
          '/dashboard/settings/',
          '/dashboard/billing/',
          '/test-*'
        ]
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl
  }
}
