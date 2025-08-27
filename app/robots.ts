import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Normalize base URL by removing trailing slash to prevent double slashes
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zoomjudge.com').replace(/\/$/, '')
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/test-*',
          '/_next/',
          '/convex/',
          '/admin/',
          '/private/',
          '/sign-in/',
          '/sign-up/'
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: [
          '/',
          '/demo'
        ],
        disallow: [
          '/api/',
          '/dashboard/',
          '/test-*',
          '/sign-in/',
          '/sign-up/'
        ]
      },
      {
        userAgent: 'ChatGPT-User',
        allow: [
          '/',
          '/demo'
        ],
        disallow: [
          '/api/',
          '/dashboard/',
          '/test-*',
          '/sign-in/',
          '/sign-up/'
        ]
      },
      {
        userAgent: 'Claude-Web',
        allow: [
          '/',
          '/demo'
        ],
        disallow: [
          '/api/',
          '/dashboard/',
          '/test-*',
          '/sign-in/',
          '/sign-up/'
        ]
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl
  }
}
