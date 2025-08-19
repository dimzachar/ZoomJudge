/**
 * Structured Error Handling with Security Considerations
 * Provides type-safe error handling with proper logging and response formatting
 */

/**
 * Base security error class
 */
export class SecurityError extends Error {
  constructor(
    message: string, 
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends SecurityError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

/**
 * Rate limiting error
 */
export class RateLimitError extends SecurityError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends SecurityError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends SecurityError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

/**
 * Repository access error
 */
export class RepositoryError extends SecurityError {
  constructor(message: string = 'Repository access failed') {
    super(message, 'REPOSITORY_ERROR', 400);
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends SecurityError {
  constructor(message: string = 'Configuration error') {
    super(message, 'CONFIG_ERROR', 500);
  }
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string;
  code: string;
  statusCode: number;
  timestamp?: string;
  requestId?: string;
}

/**
 * Handle security errors with proper logging and response formatting
 */
export function handleSecurityError(error: unknown, requestId?: string): ErrorResponse {
  const timestamp = new Date().toISOString();
  
  if (error instanceof SecurityError) {
    // Log security event (but don't expose sensitive details)
    console.error(`Security Error [${error.code}]:`, {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp,
      requestId,
      stack: error.stack,
    });
    
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp,
      requestId,
    };
  }
  
  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    console.error('Validation Error:', {
      issues: error.issues,
      timestamp,
      requestId,
    });
    
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      timestamp,
      requestId,
    };
  }
  
  // Log unexpected errors
  console.error('Unexpected error:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp,
    requestId,
  });
  
  // Don't expose internal errors to clients
  return {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
    timestamp,
    requestId,
  };
}

/**
 * Create a standardized error response for API routes
 */
export function createErrorResponse(
  error: unknown,
  requestId?: string
): Response {
  const errorResponse = handleSecurityError(error, requestId);
  
  return new Response(
    JSON.stringify(errorResponse),
    {
      status: errorResponse.statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...(requestId && { 'X-Request-ID': requestId }),
      },
    }
  );
}

/**
 * Generate a unique request ID for error correlation
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleSecurityError(error);
    }
  };
}

/**
 * Error boundary for React components (if needed)
 */
export class ErrorBoundary {
  static handleError(error: Error, errorInfo: any) {
    console.error('React Error Boundary:', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Validate and sanitize error messages for client responses
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove potentially sensitive information
  return message
    .replace(/api[_-]?key[s]?[:\s=]+[^\s]+/gi, 'API_KEY_REDACTED')
    .replace(/token[s]?[:\s=]+[^\s]+/gi, 'TOKEN_REDACTED')
    .replace(/password[s]?[:\s=]+[^\s]+/gi, 'PASSWORD_REDACTED')
    .replace(/secret[s]?[:\s=]+[^\s]+/gi, 'SECRET_REDACTED')
    .trim();
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Determine error severity based on error type
 */
export function getErrorSeverity(error: unknown): ErrorSeverity {
  if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
    return ErrorSeverity.HIGH;
  }
  
  if (error instanceof RateLimitError) {
    return ErrorSeverity.MEDIUM;
  }
  
  if (error instanceof ValidationError) {
    return ErrorSeverity.LOW;
  }
  
  if (error instanceof ConfigurationError) {
    return ErrorSeverity.CRITICAL;
  }
  
  return ErrorSeverity.MEDIUM;
}
