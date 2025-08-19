/**
 * Input Sanitization Utilities
 * Provides comprehensive sanitization for user inputs and external data
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize general string input
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  
  // Remove potential XSS
  const clean = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  
  // Trim and normalize whitespace
  return clean.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize HTML content (allows safe HTML tags)
 */
export function sanitizeHTML(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'code', 'pre'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize repository data from API requests
 */
export function sanitizeRepoData(data: any): any {
  if (!data || typeof data !== 'object') {
    return {};
  }

  return {
    ...data,
    repoUrl: sanitizeInput(data.repoUrl),
    courseType: sanitizeInput(data.courseType),
    courseId: sanitizeInput(data.courseId),
    userId: sanitizeInput(data.userId),
    
    // Sanitize nested options
    options: data.options ? {
      ...data.options,
      // Ensure numeric values are properly typed
      maxFiles: typeof data.options.maxFiles === 'number' ? 
        Math.max(1, Math.min(1000, data.options.maxFiles)) : undefined,
      timeout: typeof data.options.timeout === 'number' ? 
        Math.max(1000, Math.min(30000, data.options.timeout)) : undefined,
      includeTests: Boolean(data.options.includeTests),
    } : undefined,
  };
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFileName(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unknown';
  }

  return filename
    // Remove dangerous characters
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Remove multiple underscores
    .replace(/_{2,}/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Limit length
    .substring(0, 255)
    // Ensure it's not empty
    || 'sanitized_file';
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizeFilePath(path: string): string {
  if (!path || typeof path !== 'string') {
    return '';
  }

  return path
    // Remove path traversal attempts
    .replace(/\.\./g, '')
    .replace(/\/+/g, '/')
    // Remove leading slash
    .replace(/^\/+/, '')
    // Sanitize each path component
    .split('/')
    .map(sanitizeFileName)
    .filter(Boolean)
    .join('/');
}

/**
 * Sanitize URL to ensure it's a valid GitHub URL
 */
export function sanitizeGitHubURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const urlObj = new URL(url);
    
    // Ensure it's a GitHub URL
    if (urlObj.hostname !== 'github.com') {
      throw new Error('Not a GitHub URL');
    }
    
    // Sanitize the pathname
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub URL format');
    }
    
    // Sanitize owner and repo names
    const owner = sanitizeInput(pathParts[0]);
    const repo = sanitizeInput(pathParts[1]);
    
    if (!owner || !repo) {
      throw new Error('Invalid owner or repository name');
    }
    
    // Reconstruct the URL with sanitized components
    return `https://github.com/${owner}/${repo}${pathParts.length > 2 ? '/' + pathParts.slice(2).join('/') : ''}`;
  } catch (error) {
    throw new Error(`Invalid GitHub URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Basic email sanitization
  const sanitized = email.toLowerCase().trim();
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
}

/**
 * Sanitize numeric input with bounds
 */
export function sanitizeNumber(
  input: unknown,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER
): number {
  const num = Number(input);
  
  if (isNaN(num)) {
    throw new Error('Invalid number');
  }
  
  return Math.max(min, Math.min(max, num));
}

/**
 * Sanitize boolean input
 */
export function sanitizeBoolean(input: unknown): boolean {
  if (typeof input === 'boolean') {
    return input;
  }
  
  if (typeof input === 'string') {
    return input.toLowerCase() === 'true';
  }
  
  return Boolean(input);
}

/**
 * Sanitize array input
 */
export function sanitizeArray<T>(
  input: unknown,
  sanitizer: (item: unknown) => T,
  maxLength: number = 100
): T[] {
  if (!Array.isArray(input)) {
    return [];
  }
  
  return input
    .slice(0, maxLength)
    .map(sanitizer)
    .filter(Boolean);
}

/**
 * Sanitize object keys to prevent prototype pollution
 */
export function sanitizeObjectKeys(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip dangerous keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    
    // Sanitize key name
    const sanitizedKey = sanitizeInput(key);
    if (sanitizedKey) {
      sanitized[sanitizedKey] = value;
    }
  }
  
  return sanitized;
}

/**
 * Deep sanitize an object recursively
 */
export function deepSanitize(obj: any, maxDepth: number = 10): any {
  if (maxDepth <= 0) {
    return null;
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item, maxDepth - 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized = sanitizeObjectKeys(obj);
    const result: any = {};
    
    for (const [key, value] of Object.entries(sanitized)) {
      result[key] = deepSanitize(value, maxDepth - 1);
    }
    
    return result;
  }
  
  return obj;
}
