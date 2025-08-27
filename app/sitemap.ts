import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  // Normalize base URL by removing trailing slash to prevent double slashes
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zoomjudge.com').replace(/\/$/, '')
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
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/status`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.5,
    }
  ]
}
