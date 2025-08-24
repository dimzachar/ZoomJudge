import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalThemeProvider } from "@/components/theme-provider";

import { ClerkProvider } from '@clerk/nextjs'
import ConvexClientProvider from '@/components/ConvexClientProvider'
import { Toaster } from "sonner"
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// Setup console override to disable logging in production
import "@/lib/console-override";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PerformanceMonitor } from "@/components/performance-monitor";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // Only preload primary font
});

export const metadata: Metadata = {
  title: "ZoomJudge - AI-Powered GitHub Repository Evaluation & Code Review",
  description: "Get instant AI-powered feedback and scoring for your GitHub repositories. Automated evaluation for Data Engineering, ML, MLOps, LLM, and Stock Market projects with detailed rubric-based analysis.",
  keywords: "GitHub repository evaluation, AI code review, automated code analysis, Zoomcamp projects, repository scoring, code quality assessment",
  authors: [{ name: "ZoomJudge Team" }],
  creator: "ZoomJudge",
  publisher: "ZoomJudge",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zoomjudge.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "ZoomJudge - AI-Powered Repository Evaluation",
    description: "Automated GitHub repository evaluation with AI-powered feedback for Zoomcamp courses. Get detailed scoring and improvement suggestions instantly.",
    url: '/',
    siteName: "ZoomJudge",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: "ZoomJudge - AI-Powered Repository Evaluation Platform"
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZoomJudge - AI-Powered Repository Evaluation",
    description: "Get instant AI-powered feedback for your GitHub repositories with detailed rubric-based scoring.",
    images: ['/twitter-image.png'],
    creator: "@zoomjudge",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "Bmen6OWhZJM7DWbSGixW_apslOGZCYe9uKlYMerCXiE",
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.zoomjudge.com/#organization",
        "name": "ZoomJudge",
        "url": "https://www.zoomjudge.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.zoomjudge.com/icon.svg"
        },
        "description": "AI-powered GitHub repository evaluation platform for Zoomcamp projects",
        "sameAs": []
      },
      {
        "@type": "WebSite",
        "@id": "https://www.zoomjudge.com/#website",
        "url": "https://www.zoomjudge.com",
        "name": "ZoomJudge",
        "description": "AI-Powered GitHub Repository Evaluation & Code Review",
        "publisher": {
          "@id": "https://www.zoomjudge.com/#organization"
        },
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://www.zoomjudge.com/dashboard?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        ]
      },
      {
        "@type": "SoftwareApplication",
        "name": "ZoomJudge",
        "description": "AI-powered repository evaluation platform that provides automated feedback and scoring for GitHub repositories across Data Engineering, ML, MLOps, LLM, and Stock Market courses.",
        "url": "https://www.zoomjudge.com",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Web Browser",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "ratingCount": "150",
          "bestRating": "5",
          "worstRating": "1"
        }
      }
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased overscroll-none`}
      >
        <ConditionalThemeProvider>
          <ClerkProvider
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
            signInForceRedirectUrl="/dashboard"
            signUpForceRedirectUrl="/dashboard"
            signInFallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
          >
            <ConvexClientProvider>
              {children}
              <Toaster richColors position="top-right" />
              <Analytics debug={false} />
              <SpeedInsights debug={false} />
              <ServiceWorkerRegistration />
              <PerformanceMonitor />
            </ConvexClientProvider>
          </ClerkProvider>
        </ConditionalThemeProvider>
      </body>
    </html>
  );
}
