"use client"

import Image, { ImageProps } from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError' | 'loading' | 'priority' | 'quality'> {
  fallback?: string
  showPlaceholder?: boolean
  placeholderClassName?: string
  priority?: boolean
  loading?: 'lazy' | 'eager'
  quality?: number
}

export function OptimizedImage({
  src,
  alt,
  className,
  fallback = '/icon.svg',
  showPlaceholder = true,
  placeholderClassName,
  priority,
  loading,
  quality = 85,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Determine loading strategy - priority takes precedence over loading prop
  // When priority is true, we don't set loading prop to avoid conflicts
  const loadingStrategy = priority ? undefined : (loading || 'lazy')

  // Debug logging in development
  if (process.env.NODE_ENV === 'development' && priority && loading) {
    console.warn('OptimizedImage: Both priority and loading props provided. Using priority, ignoring loading.')
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  if (hasError && fallback) {
    return (
      <Image
        src={fallback}
        alt={alt}
        className={className}
        onLoad={handleLoad}
        onError={() => setHasError(false)}
        loading={loadingStrategy}
        priority={priority}
        quality={quality}
        {...props}
      />
    )
  }

  return (
    <div className="relative">
      {isLoading && showPlaceholder && (
        <div
          className={cn(
            "absolute inset-0 bg-muted animate-pulse rounded",
            placeholderClassName
          )}
        />
      )}
      <Image
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading={loadingStrategy}
        priority={priority}
        quality={quality}
        {...props}
      />
    </div>
  )
}
