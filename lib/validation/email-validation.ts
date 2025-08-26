/**
 * Email validation utilities for ZoomJudge
 * Provides comprehensive validation for email addresses, content, and templates
 */

import { z } from 'zod';

// Email address validation schema
export const emailSchema = z.string()
  .email('Invalid email address')
  .min(5, 'Email address too short')
  .max(254, 'Email address too long')
  .transform(email => email.toLowerCase().trim());

// Email template validation schema
export const emailTemplateSchema = z.object({
  templateId: z.string()
    .min(1, 'Template ID is required')
    .max(50, 'Template ID too long')
    .regex(/^[a-z0-9-_]+$/, 'Template ID can only contain lowercase letters, numbers, hyphens, and underscores'),
  
  name: z.string()
    .min(1, 'Template name is required')
    .max(100, 'Template name too long'),
  
  description: z.string()
    .min(1, 'Template description is required')
    .max(500, 'Template description too long'),
  
  subject: z.string()
    .min(1, 'Email subject is required')
    .max(200, 'Email subject too long'),
  
  htmlContent: z.string()
    .min(10, 'HTML content too short')
    .max(100000, 'HTML content too long'),
  
  textContent: z.string()
    .min(10, 'Text content too short')
    .max(50000, 'Text content too long')
    .optional(),
  
  variables: z.array(z.string())
    .max(20, 'Too many template variables'),
});

// Email send options validation schema
export const emailSendOptionsSchema = z.object({
  to: z.union([
    emailSchema,
    z.array(emailSchema).min(1, 'At least one recipient required').max(100, 'Too many recipients')
  ]),
  
  templateId: z.string().min(1, 'Template ID is required'),
  
  variables: z.record(z.string(), z.string()).optional(),
  
  replyTo: emailSchema.optional(),
  
  attachments: z.array(z.object({
    filename: z.string().min(1, 'Filename is required'),
    content: z.union([z.string(), z.instanceof(Buffer)]),
    contentType: z.string().optional(),
  })).max(10, 'Too many attachments').optional(),
});

// Email campaign validation schema
export const emailCampaignSchema = z.object({
  campaignId: z.string()
    .min(1, 'Campaign ID is required')
    .max(50, 'Campaign ID too long')
    .regex(/^[a-z0-9-_]+$/, 'Campaign ID can only contain lowercase letters, numbers, hyphens, and underscores'),
  
  name: z.string()
    .min(1, 'Campaign name is required')
    .max(100, 'Campaign name too long'),
  
  description: z.string()
    .min(1, 'Campaign description is required')
    .max(500, 'Campaign description too long'),
  
  templateId: z.string().min(1, 'Template ID is required'),
  
  targetAudience: z.object({
    userSegment: z.enum(['all', 'free', 'paid', 'inactive', 'active']),
    filters: z.any().optional(),
  }),
  
  scheduledAt: z.number().optional(),
});

/**
 * Validate email address
 */
export function validateEmailAddress(email: string): { isValid: boolean; error?: string; sanitizedEmail?: string } {
  try {
    const sanitizedEmail = emailSchema.parse(email);
    return { isValid: true, sanitizedEmail };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.issues[0]?.message || 'Invalid email address' };
    }
    return { isValid: false, error: 'Invalid email address' };
  }
}

/**
 * Validate email template
 */
export function validateEmailTemplate(template: any): { isValid: boolean; errors?: string[]; sanitizedTemplate?: any } {
  try {
    const sanitizedTemplate = emailTemplateSchema.parse(template);
    
    // Additional validation for template content
    const contentValidation = validateTemplateContent(sanitizedTemplate);
    if (!contentValidation.isValid) {
      return { isValid: false, errors: contentValidation.errors };
    }
    
    return { isValid: true, sanitizedTemplate };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error.issues.map(e => e.message) };
    }
    return { isValid: false, errors: ['Invalid template format'] };
  }
}

/**
 * Validate template content for security and best practices
 */
export function validateTemplateContent(template: { htmlContent: string; textContent?: string; variables: string[] }): { isValid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  // Check for potentially dangerous HTML
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  ];
  
  dangerousPatterns.forEach(pattern => {
    if (pattern.test(template.htmlContent)) {
      errors.push('HTML content contains potentially dangerous elements');
    }
  });
  
  // Check for required template variables
  const requiredVariables = ['appName', 'appUrl', 'currentYear'];
  const missingRequired = requiredVariables.filter(variable => 
    !template.htmlContent.includes(`{{${variable}}}`) && 
    (!template.textContent || !template.textContent.includes(`{{${variable}}`))
  );
  
  if (missingRequired.length > 0) {
    errors.push(`Missing required template variables: ${missingRequired.join(', ')}`);
  }
  
  // Check for undefined variables in content
  const variablePattern = /\{\{\s*(\w+)\s*\}\}/g;
  const usedVariables = new Set<string>();
  
  let match;
  while ((match = variablePattern.exec(template.htmlContent)) !== null) {
    usedVariables.add(match[1]);
  }
  
  if (template.textContent) {
    variablePattern.lastIndex = 0;
    while ((match = variablePattern.exec(template.textContent)) !== null) {
      usedVariables.add(match[1]);
    }
  }
  
  const undefinedVariables = Array.from(usedVariables).filter(variable => 
    !template.variables.includes(variable) && !requiredVariables.includes(variable)
  );
  
  if (undefinedVariables.length > 0) {
    errors.push(`Undefined template variables: ${undefinedVariables.join(', ')}`);
  }
  
  // Check for accessibility issues
  if (!template.htmlContent.includes('alt=')) {
    errors.push('HTML content should include alt attributes for images');
  }
  
  // Check for mobile responsiveness indicators
  if (!template.htmlContent.includes('max-width') && !template.htmlContent.includes('@media')) {
    errors.push('HTML content should include responsive design elements');
  }
  
  return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Validate email send options
 */
export function validateEmailSendOptions(options: any): { isValid: boolean; errors?: string[]; sanitizedOptions?: any } {
  try {
    const sanitizedOptions = emailSendOptionsSchema.parse(options);
    return { isValid: true, sanitizedOptions };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error.issues.map(e => e.message) };
    }
    return { isValid: false, errors: ['Invalid send options format'] };
  }
}

/**
 * Validate email campaign
 */
export function validateEmailCampaign(campaign: any): { isValid: boolean; errors?: string[]; sanitizedCampaign?: any } {
  try {
    const sanitizedCampaign = emailCampaignSchema.parse(campaign);
    
    // Additional validation for scheduled campaigns
    if (sanitizedCampaign.scheduledAt && sanitizedCampaign.scheduledAt <= Date.now()) {
      return { isValid: false, errors: ['Scheduled time must be in the future'] };
    }
    
    return { isValid: true, sanitizedCampaign };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, errors: error.issues.map(e => e.message) };
    }
    return { isValid: false, errors: ['Invalid campaign format'] };
  }
}

/**
 * Validate bulk email recipients
 */
export function validateBulkEmailRecipients(recipients: string[]): { isValid: boolean; errors?: string[]; validRecipients?: string[] } {
  if (recipients.length === 0) {
    return { isValid: false, errors: ['No recipients provided'] };
  }
  
  if (recipients.length > 1000) {
    return { isValid: false, errors: ['Too many recipients (max 1000)'] };
  }
  
  const validRecipients: string[] = [];
  const errors: string[] = [];
  
  recipients.forEach((email, index) => {
    const validation = validateEmailAddress(email);
    if (validation.isValid && validation.sanitizedEmail) {
      validRecipients.push(validation.sanitizedEmail);
    } else {
      errors.push(`Invalid email at index ${index}: ${email} - ${validation.error}`);
    }
  });
  
  // Check for duplicates
  const uniqueRecipients = [...new Set(validRecipients)];
  if (uniqueRecipients.length !== validRecipients.length) {
    errors.push('Duplicate email addresses found');
  }
  
  return {
    isValid: errors.length === 0 && validRecipients.length > 0,
    errors: errors.length > 0 ? errors : undefined,
    validRecipients: uniqueRecipients,
  };
}

/**
 * Check if email content passes spam filters
 */
export function checkSpamScore(subject: string, htmlContent: string, textContent?: string): { score: number; warnings: string[] } {
  const warnings: string[] = [];
  let score = 0;
  
  // Check subject line
  if (subject.includes('!!!') || subject.includes('FREE') || subject.includes('URGENT')) {
    score += 2;
    warnings.push('Subject line contains spam trigger words');
  }
  
  if (subject.length > 50) {
    score += 1;
    warnings.push('Subject line is too long');
  }
  
  // Check content
  const spamWords = ['free', 'urgent', 'limited time', 'act now', 'click here', 'guarantee'];
  const contentLower = htmlContent.toLowerCase();
  
  spamWords.forEach(word => {
    if (contentLower.includes(word)) {
      score += 1;
      warnings.push(`Content contains potential spam word: ${word}`);
    }
  });
  
  // Check for excessive capitalization
  const capsRatio = (htmlContent.match(/[A-Z]/g) || []).length / htmlContent.length;
  if (capsRatio > 0.3) {
    score += 2;
    warnings.push('Excessive use of capital letters');
  }
  
  // Check for missing text version
  if (!textContent) {
    score += 1;
    warnings.push('Missing plain text version');
  }
  
  return { score, warnings };
}
