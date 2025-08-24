import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zoomjudge.com'
  const currentDate = new Date()
  
  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/dashboard/new-evaluation`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/dashboard/history`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/dashboard/analytics`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/dashboard/billing`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/dashboard/settings`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    }
  ]
}
