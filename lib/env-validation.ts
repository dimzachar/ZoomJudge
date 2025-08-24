/**
 * Enhanced Environment Validation with Runtime Checks
 * Provides comprehensive validation for all environment variables
 */

import { z } from 'zod';

const envSchema = z.object({
  // Public vars (available on client)
  NEXT_PUBLIC_CONVEX_URL: z.string().url('Invalid Convex URL'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_FRONTEND_API_URL: z.string().url('Invalid Clerk Frontend API URL').optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_NAME: z.string().optional(),
  
  // Server-only vars
  OPENROUTER_API_KEY: z.string().min(32, 'OpenRouter API key too short'),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().min(16, 'Webhook secret too weak').optional(),
  CONVEX_DEPLOYMENT: z.string().optional(),
  
  // Optional with defaults
  MAX_FILE_SIZE: z.coerce.number().min(1).max(50).default(10), // MB
  REQUEST_TIMEOUT: z.coerce.number().min(1000).max(30000).default(10000), // ms
  
  // Rate limiting (optional - falls back to memory if not provided)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Feature flags
  SIMPLE_LOGGER_ENABLED: z.string().optional().default('false').transform(val => val === 'true'),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Validate environment variables with comprehensive error reporting
 */
export function validateEnv(): ValidatedEnv {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      console.error('Environment validation failed:\n', errorMessages);
      throw new Error(`Invalid environment configuration:\n${errorMessages}`);
    }
    
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
}

/**
 * Runtime validation with client/server awareness
 * Only validates appropriate variables based on environment
 */
export function validateRuntimeEnv(): ValidatedEnv {
  if (typeof window !== 'undefined') {
    // Client-side: only validate public vars
    const clientSchema = envSchema.pick({
      NEXT_PUBLIC_CONVEX_URL: true,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: true,
      NEXT_PUBLIC_CLERK_FRONTEND_API_URL: true,
      NEXT_PUBLIC_SITE_URL: true,
      NEXT_PUBLIC_SITE_NAME: true,
      NODE_ENV: true,
    });
    
    try {
      return clientSchema.parse(process.env) as ValidatedEnv;
    } catch (error) {
      console.error('Client environment validation failed:', error);
      throw new Error('Invalid client environment configuration');
    }
  }
  
  // Server-side: validate all
  return validateEnv();
}

/**
 * Check if all required environment variables are present
 */
export function checkRequiredEnvVars(): {
  isValid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Critical variables
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    missing.push('NEXT_PUBLIC_CONVEX_URL');
  }
  
  if (!process.env.OPENROUTER_API_KEY) {
    missing.push('OPENROUTER_API_KEY');
  }
  
  // Optional but recommended
  if (!process.env.CLERK_SECRET_KEY) {
    warnings.push('CLERK_SECRET_KEY not set - authentication may not work');
  }

  if (!process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL) {
    warnings.push('NEXT_PUBLIC_CLERK_FRONTEND_API_URL not set - Convex authentication may not work');
  }
  
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    warnings.push('UPSTASH_REDIS_REST_URL not set - rate limiting will use memory');
  }
  
  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Get environment-specific configuration
 */
export function getEnvConfig() {
  const env = validateRuntimeEnv();
  
  return {
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    hasRedis: !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
    hasAuth: !!(env.CLERK_SECRET_KEY && env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    maxFileSize: env.MAX_FILE_SIZE,
    requestTimeout: env.REQUEST_TIMEOUT,
  };
}

/**
 * Validate environment on application startup
 */
export function validateStartupEnv(): void {
  const check = checkRequiredEnvVars();
  
  if (!check.isValid) {
    console.error('❌ Missing required environment variables:', check.missing);
    throw new Error(`Missing required environment variables: ${check.missing.join(', ')}`);
  }
  
  if (check.warnings.length > 0) {
    console.warn('⚠️ Environment warnings:', check.warnings);
  }
  
  // Validate the full environment
  try {
    validateRuntimeEnv();
    console.log('✅ Environment validation passed');
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    throw error;
  }
}
