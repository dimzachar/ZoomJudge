"use client"

import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { ReactNode, useState, useEffect, useRef } from "react"

interface OptimizedAnimationProps {
  children: ReactNode
  fallback?: ReactNode
  className?: string
  threshold?: number
}

/**
 * Wrapper component that conditionally loads animations based on:
 * - User's reduced motion preference
 * - Device type (mobile vs desktop)
 * - Intersection visibility
 */
export function OptimizedAnimation({
  children,
  fallback,
  className,
  threshold = 0.1
}: OptimizedAnimationProps) {
  const shouldReduceMotion = useReducedMotion()
  const elementRef = useRef<HTMLDivElement>(null)
  const { isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold,
    triggerOnce: true,
    ref: elementRef,
  })
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    if (shouldReduceMotion) {
      // Skip animations for reduced motion or mobile
      setShouldRender(false)
    } else if (isIntersecting) {
      // Only render animations when visible
      setShouldRender(true)
    }
  }, [shouldReduceMotion, isIntersecting])

  if (shouldReduceMotion) {
    return (
      <div ref={elementRef} className={className}>
        {fallback || children}
      </div>
    )
  }

  return (
    <div ref={elementRef} className={className}>
      {shouldRender ? children : (fallback || null)}
    </div>
  )
}

/**
 * Lazy-loaded Framer Motion components
 */
export const LazyMotionDiv = ({ children, ...props }: any) => {
  const [MotionDiv, setMotionDiv] = useState<any>(null)
  
  useEffect(() => {
    import('motion/react').then((motion) => {
      setMotionDiv(() => motion.motion.div)
    })
  }, [])

  if (!MotionDiv) {
    return <div {...props}>{children}</div>
  }

  return <MotionDiv {...props}>{children}</MotionDiv>
}

export const LazyAnimatePresence = ({ children, ...props }: any) => {
  const [AnimatePresence, setAnimatePresence] = useState<any>(null)
  
  useEffect(() => {
    import('motion/react').then((motion) => {
      setAnimatePresence(() => motion.AnimatePresence)
    })
  }, [])

  if (!AnimatePresence) {
    return <>{children}</>
  }

  return <AnimatePresence {...props}>{children}</AnimatePresence>
}
