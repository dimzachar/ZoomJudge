/**
 * Enhanced API Validation Schemas
 * Provides comprehensive validation for all API endpoints with security considerations
 */

import { z } from 'zod';
import { sanitizeInput, sanitizeGitHubURL } from '@/lib/sanitization';

/**
 * Enhanced GitHub URL validation that handles edge cases
 */
const githubCommitUrlSchema = z.string()
  .url('Invalid repository URL')
  .regex(
    /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/commit\/[a-f0-9]{7,40}\/?$/,
    'Must be a valid GitHub commit URL'
  )
  .transform((url) => {
    try {
      return sanitizeGitHubURL(url);
    } catch (error) {
      throw new z.ZodError([{
        code: 'custom',
        message: error instanceof Error ? error.message : 'Invalid GitHub URL',
        path: ['repoUrl'],
      }]);
    }
  });

/**
 * Course type validation
 */
const courseTypeSchema = z.enum(['cs2030s', 'cs2040s', 'cs2103t'], {
  message: 'Invalid course type. Must be one of: cs2030s, cs2040s, cs2103t'
});

/**
 * Course ID validation (more flexible for different course formats)
 */
const courseIdSchema = z.string()
  .min(1, 'Course ID is required')
  .max(50, 'Course ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Course ID contains invalid characters')
  .transform(sanitizeInput);

/**
 * User ID validation
 */
const userIdSchema = z.string()
  .min(1, 'User ID is required')
  .max(100, 'User ID too long')
  .transform(sanitizeInput)
  .optional();

/**
 * Evaluation options schema
 */
const evaluationOptionsSchema = z.object({
  includeTests: z.boolean().optional().default(false),
  maxFiles: z.number()
    .min(1, 'Must include at least 1 file')
    .max(1000, 'Cannot include more than 1000 files')
    .optional()
    .default(50),
  timeout: z.number()
    .min(1000, 'Timeout must be at least 1 second')
    .max(30000, 'Timeout cannot exceed 30 seconds')
    .optional()
    .default(10000),
  mockMode: z.boolean().optional().default(false),
}).optional();

/**
 * Main hybrid evaluation schema
 */
export const hybridEvaluationSchema = z.object({
  repoUrl: githubCommitUrlSchema,
  courseType: courseTypeSchema.optional(),
  courseId: courseIdSchema,
  userId: userIdSchema,
  options: evaluationOptionsSchema,
});

export type HybridEvaluationRequest = z.infer<typeof hybridEvaluationSchema>;

/**
 * Repository validation schema (for standalone repo validation)
 */
export const repositoryValidationSchema = z.object({
  repoUrl: githubCommitUrlSchema,
  checkAccessibility: z.boolean().optional().default(true),
  validateStructure: z.boolean().optional().default(false),
});

export type RepositoryValidationRequest = z.infer<typeof repositoryValidationSchema>;

/**
 * File selection schema
 */
export const fileSelectionSchema = z.object({
  repoUrl: githubCommitUrlSchema,
  courseId: courseIdSchema,
  userId: userIdSchema,
  evaluationId: z.string()
    .min(1, 'Evaluation ID is required')
    .max(100, 'Evaluation ID too long')
    .transform(sanitizeInput),
  files: z.array(z.string().transform(sanitizeInput))
    .min(1, 'At least one file is required')
    .max(1000, 'Too many files provided'),
  options: z.object({
    useAI: z.boolean().optional().default(true),
    useFingerprinting: z.boolean().optional().default(true),
    useCaching: z.boolean().optional().default(true),
  }).optional(),
});

export type FileSelectionRequest = z.infer<typeof fileSelectionSchema>;

/**
 * Webhook validation schema
 */
export const webhookSchema = z.object({
  type: z.string().min(1, 'Webhook type is required'),
  data: z.record(z.string(), z.any()),
  timestamp: z.string().datetime().optional(),
  signature: z.string().min(1, 'Signature is required'),
});

export type WebhookRequest = z.infer<typeof webhookSchema>;

/**
 * Health check schema
 */
export const healthCheckSchema = z.object({
  service: z.string().optional(),
  detailed: z.boolean().optional().default(false),
});

export type HealthCheckRequest = z.infer<typeof healthCheckSchema>;

/**
 * Error response schema
 */
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  statusCode: z.number(),
  timestamp: z.string().optional(),
  requestId: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Success response schema
 */
export const successResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.any(),
  timestamp: z.string().optional(),
  requestId: z.string().optional(),
});

export type SuccessResponse = z.infer<typeof successResponseSchema>;

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be at least 1').optional().default(1),
  limit: z.number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationRequest = z.infer<typeof paginationSchema>;

/**
 * Search schema
 */
export const searchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(200, 'Search query too long')
    .transform(sanitizeInput),
  filters: z.record(z.string(), z.string()).optional(),
  ...paginationSchema.shape,
});

export type SearchRequest = z.infer<typeof searchSchema>;

/**
 * Validate request body with enhanced error handling
 */
export async function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): Promise<{ success: true; data: T } | { success: false; error: string; details: any }> {
  try {
    const data = await schema.parseAsync(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      };
    }
    
    return {
      success: false,
      error: 'Validation error',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Create a standardized validation middleware
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (body: unknown) => {
    const result = await validateRequestBody(schema, body);
    
    if (!result.success) {
      throw new Error(`Validation failed: ${result.error}`);
    }
    
    return result.data;
  };
}
