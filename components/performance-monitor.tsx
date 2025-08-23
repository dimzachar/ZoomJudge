"use client"

import { useEffect } from 'react'

/**
 * Performance monitoring component for development
 * Tracks and logs performance metrics
 */
export function PerformanceMonitor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 200) {
            console.warn(`Long task detected: ${entry.duration}ms`, entry)
          }
        }
      })

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] })
      } catch (e) {
        console.log('Long task monitoring not supported')
      }

      // Monitor layout shifts
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).value > 0.1) {
            console.warn(`Layout shift detected: ${(entry as any).value}`, entry)
          }
        }
      })

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] })
      } catch (e) {
        console.log('Layout shift monitoring not supported')
      }

      // Monitor largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`LCP: ${entry.startTime}ms`, entry)
        }
      })

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (e) {
        console.log('LCP monitoring not supported')
      }

      return () => {
        longTaskObserver.disconnect()
        clsObserver.disconnect()
        lcpObserver.disconnect()
      }
    }
  }, [])

  // Monitor memory usage
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const used = memory.usedJSHeapSize / 1048576 // Convert to MB
        const total = memory.totalJSHeapSize / 1048576
        const limit = memory.jsHeapSizeLimit / 1048576

        if (used > 500) { // Warn if using more than 500MB
          console.warn(`High memory usage: ${used.toFixed(2)}MB / ${total.toFixed(2)}MB (limit: ${limit.toFixed(2)}MB)`)
        }
      }
    }

    const interval = setInterval(checkMemory, 10000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [])

  return null
}
