import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize a base URL by removing trailing slash to prevent double slashes
 * when concatenating with paths
 */
export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '')
}

/**
 * Join URL parts safely, preventing double slashes
 */
export function joinUrl(baseUrl: string, ...paths: string[]): string {
  const normalizedBase = normalizeBaseUrl(baseUrl)
  const normalizedPaths = paths.map(path => path.replace(/^\/+|\/+$/g, ''))
  return [normalizedBase, ...normalizedPaths].join('/')
}
