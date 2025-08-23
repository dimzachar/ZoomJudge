"use client"

import { memo, useMemo, useCallback, useRef, useEffect, useState, useTransition } from 'react'
import { useReducedMotion } from '@/hooks/use-reduced-motion'

interface OptimizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string
  className?: string
  chunkSize?: number
}

/**
 * Optimized list component that renders items in chunks to prevent blocking
 */
export function OptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  chunkSize = 10,
}: OptimizedListProps<T>) {
  const shouldReduceMotion = useReducedMotion()

  // Memoize chunked items to prevent unnecessary recalculations
  const chunkedItems = useMemo(() => {
    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize))
    }
    return chunks
  }, [items, chunkSize])

  // Memoized render function
  const renderChunk = useCallback((chunk: T[], chunkIndex: number) => {
    return chunk.map((item, itemIndex) => {
      const globalIndex = chunkIndex * chunkSize + itemIndex
      return (
        <OptimizedListItem
          key={keyExtractor(item, globalIndex)}
          item={item}
          index={globalIndex}
          renderItem={renderItem}
        />
      )
    })
  }, [renderItem, keyExtractor, chunkSize])

  if (shouldReduceMotion || items.length <= chunkSize) {
    // Render all items at once for small lists or reduced motion
    return (
      <div className={className}>
        {items.map((item, index) => (
          <OptimizedListItem
            key={keyExtractor(item, index)}
            item={item}
            index={index}
            renderItem={renderItem}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      {chunkedItems.map((chunk, chunkIndex) => (
        <ChunkedRenderer
          key={chunkIndex}
          chunk={chunk}
          chunkIndex={chunkIndex}
          renderChunk={renderChunk}
        />
      ))}
    </div>
  )
}

// Memoized list item component
const OptimizedListItem = memo(function OptimizedListItem({
  item,
  index,
  renderItem,
}: {
  item: any
  index: number
  renderItem: (item: any, index: number) => React.ReactNode
}) {
  return <>{renderItem(item, index)}</>
})

// Chunked renderer with transition
const ChunkedRenderer = memo(function ChunkedRenderer({
  chunk,
  chunkIndex,
  renderChunk,
}: {
  chunk: any[]
  chunkIndex: number
  renderChunk: (chunk: any[], chunkIndex: number) => React.ReactNode
}) {
  return <>{renderChunk(chunk, chunkIndex)}</>
})

/**
 * Hook for optimized state updates using React's concurrent features
 */
export function useOptimizedState<T>(initialValue: T) {
  const [state, setState] = useState(initialValue)
  const [isPending, startTransition] = useTransition()

  const setOptimizedState = useCallback((newValue: T | ((prev: T) => T)) => {
    startTransition(() => {
      setState(newValue)
    })
  }, [])

  return [state, setOptimizedState, isPending] as const
}

/**
 * Debounced callback hook to prevent excessive function calls
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  ) as T

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * Throttled callback hook to limit function execution frequency
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0)

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now
        callback(...args)
      }
    },
    [callback, delay]
  ) as T

  return throttledCallback
}
