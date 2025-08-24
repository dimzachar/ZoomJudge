import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { logSecurityEvent } from '@/lib/security-audit'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  skipSuccessfulRequests: false,
}

// In-memory rate limiting store (fallback when Redis is not available)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Initialize Redis rate limiter if available
let redisRateLimit: any = null
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Ratelimit } = require('@upstash/ratelimit')
    const { Redis } = require('@upstash/redis')

    redisRateLimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_CONFIG.maxRequests, '1 m'),
      analytics: true,
    })
    console.log('✅ Redis rate limiting enabled')
  } else {
    console.log('⚠️ Redis not configured, using in-memory rate limiting')
  }
} catch (error) {
  console.warn('⚠️ Failed to initialize Redis rate limiting, falling back to memory:', error)
}

async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  // Skip rate limiting for static files and internal routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('.') ||
    !request.nextUrl.pathname.startsWith('/api/')
  ) {
    return null
  }

  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '127.0.0.1'

  // Use Redis rate limiting if available
  if (redisRateLimit) {
    try {
      const { success, pending, limit, reset, remaining } = await redisRateLimit.limit(ip)

      if (!success) {
        // Log rate limit exceeded event
        logSecurityEvent({
          type: 'rate_limit_exceeded',
          ip,
          userAgent: request.headers.get('user-agent') || undefined,
          details: {
            path: request.nextUrl.pathname,
            limit,
            reset: new Date(reset).toISOString(),
            provider: 'redis'
          }
        })

        return new NextResponse('Rate limit exceeded', {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          }
        })
      }

      return null
    } catch (error) {
      console.warn('Redis rate limiting failed, falling back to memory:', error)
      // Fall through to memory-based rate limiting
    }
  }

  // Fallback to in-memory rate limiting
  const now = Date.now()

  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }

  // Get or create rate limit entry
  const entry = rateLimitStore.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_CONFIG.windowMs }

  // Reset if window has passed
  if (entry.resetTime < now) {
    entry.count = 0
    entry.resetTime = now + RATE_LIMIT_CONFIG.windowMs
  }

  // Increment request count
  entry.count++
  rateLimitStore.set(ip, entry)

  // Check if rate limit exceeded
  if (entry.count > RATE_LIMIT_CONFIG.maxRequests) {
    // Log rate limit exceeded event
    logSecurityEvent({
      type: 'rate_limit_exceeded',
      ip,
      userAgent: request.headers.get('user-agent') || undefined,
      details: {
        path: request.nextUrl.pathname,
        count: entry.count,
        limit: RATE_LIMIT_CONFIG.maxRequests,
        resetTime: new Date(entry.resetTime).toISOString(),
        provider: 'memory'
      }
    })

    return new NextResponse('Rate limit exceeded', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': entry.resetTime.toString(),
        'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
      }
    })
  }

  return null
}

export default clerkMiddleware(async (auth, req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin')
    const allowedOrigins = [
      'https://www.zoomjudge.com',
      'https://zoomjudge.com',
      'https://accounts.zoomjudge.com',
      'https://clerk.zoomjudge.com',
      'https://billing.clerk.com'
    ]

    const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : 'https://www.zoomjudge.com'

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  // Apply rate limiting first
  const rateLimitResponse = await applyRateLimit(req)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Then apply Clerk authentication
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  // Add CORS headers to all responses
  const response = NextResponse.next()
  const origin = req.headers.get('origin')
  const allowedOrigins = [
    'https://www.zoomjudge.com',
    'https://zoomjudge.com',
    'https://accounts.zoomjudge.com',
    'https://clerk.zoomjudge.com',
    'https://billing.clerk.com'
  ]

  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : 'https://www.zoomjudge.com'

  response.headers.set('Access-Control-Allow-Origin', corsOrigin)
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin')

  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}