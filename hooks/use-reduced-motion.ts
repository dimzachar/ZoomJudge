import { useEffect, useState } from 'react'

/**
 * Hook to detect if user prefers reduced motion
 * Also considers mobile devices for performance optimization
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    // Check if device is mobile for performance optimization
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768

    setIsMobile(isMobileDevice)

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    const handleResize = () => {
      const isMobileDevice = window.innerWidth < 768
      setIsMobile(isMobileDevice)
    }

    mediaQuery.addEventListener('change', handleChange)
    window.addEventListener('resize', handleResize)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Return true if either reduced motion is preferred OR device is mobile
  return prefersReducedMotion || isMobile
}
