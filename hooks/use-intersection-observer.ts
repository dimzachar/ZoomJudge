import { useEffect, useRef, useState, RefObject } from 'react'

interface UseIntersectionObserverOptions<T extends HTMLElement = HTMLElement> {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
  ref?: RefObject<T | null>
}

export function useIntersectionObserver<T extends HTMLElement = HTMLElement>(
  options: UseIntersectionObserverOptions<T> = {}
) {
  const { threshold = 0.1, rootMargin = '0px', triggerOnce = true, ref } = options
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)
  const internalRef = useRef<T | null>(null)
  const elementRef = ref || internalRef

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // If triggerOnce and already triggered, don't observe
    if (triggerOnce && hasTriggered) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting
        setIsIntersecting(isVisible)
        
        if (isVisible && triggerOnce) {
          setHasTriggered(true)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [threshold, rootMargin, triggerOnce, hasTriggered])

  return { elementRef, isIntersecting, hasTriggered }
}
