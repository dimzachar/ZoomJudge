/**
 * Email Service for ZoomJudge
 * Handles all email functionality using Resend
 *
 * Based on official Resend documentation:
 * https://resend.com/docs/send-with-nextjs
 * https://resend.com/docs/knowledge-base/vercel
 */

import { Resend } from 'resend';
import { ConfigurationService } from '../config/ConfigurationService';
import { sanitizeEmail } from '../sanitization';
import { EMAIL_TEMPLATES } from '../email-templates';

export interface EmailTemplate {
  templateId: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
}

export interface EmailSendOptions {
  to: string | string[];
  templateId: string;
  variables?: Record<string, string>;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  resendId?: string;
}

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedEmail?: string;
}

export class EmailService {
  private resend: Resend | null = null;
  private config: ReturnType<typeof ConfigurationService.getInstance>;
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();
  
  // Rate limiting: 100 emails per hour per recipient
  private readonly RATE_LIMIT_COUNT = 100;
  private readonly RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor() {
    this.config = ConfigurationService.getInstance();
    this.initializeResend();
  }

  /**
   * Initialize Resend client
   * Uses environment variables as recommended by Resend docs
   */
  private initializeResend(): void {
    const apiKey = process.env.RESEND_API_KEY;

    if (apiKey) {
      try {
        this.resend = new Resend(apiKey);
      } catch (error) {
        console.warn('Failed to initialize Resend:', error);
        this.resend = null;
      }
    } else {
      console.warn('RESEND_API_KEY not found - email functionality will be disabled');
    }
  }

  /**
   * Check if email service is available
   */
  public isAvailable(): boolean {
    if (!this.resend) {
      this.initializeResend();
    }
    return this.resend !== null && !!process.env.RESEND_API_KEY;
  }

  /**
   * Validate email address
   */
  public validateEmail(email: string): EmailValidationResult {
    try {
      const sanitizedEmail = sanitizeEmail(email);
      return {
        isValid: true,
        sanitizedEmail,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid email format',
      };
    }
  }

  /**
   * Check rate limiting for email sending
   */
  private checkRateLimit(email: string): boolean {
    const now = Date.now();
    const key = email.toLowerCase();
    const limit = this.rateLimitMap.get(key);

    if (!limit) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return true;
    }

    if (now > limit.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return true;
    }

    if (limit.count >= this.RATE_LIMIT_COUNT) {
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Process template variables with optimized single-pass approach
   * Replaces O(n²) complexity with O(n) for better performance
   */
  private processTemplate(template: string, variables: Record<string, string> = {}): string {
    // Add default variables
    const defaultVariables: Record<string, string> = {
      appName: process.env.NEXT_PUBLIC_SITE_NAME || 'ZoomJudge',
      appUrl: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
      supportEmail: process.env.RESEND_FROM_EMAIL || 'noreply@zoomjudge.com',
      currentYear: new Date().getFullYear().toString(),
    };

    // Merge user variables with defaults (user variables take precedence)
    const allVariables: Record<string, string> = { ...defaultVariables, ...variables };

    // Single-pass replacement using a single regex that captures all variable patterns
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
      return allVariables[key] ?? match; // Return original if variable not found
    });
  }

  /**
   * Send email using template
   */
  public async sendTemplatedEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    const isAvailable = this.isAvailable();
    if (!isAvailable) {
      return {
        success: false,
        error: 'Email service not available - Resend not configured',
      };
    }

    try {
      // Validate recipient emails
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const validatedRecipients: string[] = [];

      for (const email of recipients) {
        const validation = this.validateEmail(email);
        if (!validation.isValid) {
          return {
            success: false,
            error: `Invalid email address: ${email} - ${validation.error}`,
          };
        }

        // Check rate limiting
        if (!this.checkRateLimit(validation.sanitizedEmail!)) {
          return {
            success: false,
            error: `Rate limit exceeded for email: ${email}`,
          };
        }

        validatedRecipients.push(validation.sanitizedEmail!);
      }

      // Get email configuration from environment variables
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@zoomjudge.com';
      const fromName = process.env.RESEND_FROM_NAME || 'ZoomJudge';
      
      // For now, we'll use a simple template system
      // In a real implementation, you'd fetch the template from the database
      const template = this.getBuiltInTemplate(options.templateId);
      if (!template) {
        return {
          success: false,
          error: `Template not found: ${options.templateId}`,
        };
      }

      // Process template variables
      const processedSubject = this.processTemplate(template.subject, options.variables);
      const processedHtml = this.processTemplate(template.htmlContent, options.variables);
      const processedText = template.textContent 
        ? this.processTemplate(template.textContent, options.variables)
        : undefined;

      // Add unsubscribe URLs for the first recipient (for single emails)
      const firstRecipient = Array.isArray(options.to) ? options.to[0] : options.to;
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.zoomjudge.com"}/unsubscribe?email=${encodeURIComponent(firstRecipient)}`;

      // Send email via Resend
      const result = await this.resend!.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: validatedRecipients,
        subject: processedSubject,
        html: processedHtml,
        text: processedText,
        replyTo: options.replyTo,
        attachments: options.attachments,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      });

      return {
        success: true,
        messageId: result.data?.id,
        resendId: result.data?.id,
      };

    } catch (error) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email sending error',
      };
    }
  }

  /**
   * Get built-in email templates
   * In a real implementation, these would be stored in the database
   */
  private getBuiltInTemplate(templateId: string): EmailTemplate | null {
    const templates: Record<string, EmailTemplate> = {
      welcome: {
        templateId: 'welcome',
        subject: 'Welcome to {{appName}}! 🎉',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to {{appName}}! 🎉</h1>
            <p>Hi {{userName}},</p>
            <p>Thanks for signing up! We're excited to have you on board.</p>
            <p>Here's how to get started:</p>
            <ul>
              <li>Complete your profile</li>
              <li>Try evaluating your first repository</li>
              <li>Explore our course offerings</li>
            </ul>
            <p style="margin: 30px 0;">
              <a href="{{appUrl}}/dashboard" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Get Started
              </a>
            </p>
            <p>Best,<br>The {{appName}} Team</p>
            <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              © {{currentYear}} {{appName}}. All rights reserved.
            </p>
          </div>
        `,
        textContent: `Welcome to {{appName}}!

Hi {{userName}},

Thanks for signing up! We're excited to have you on board.

Here's how to get started:
- Complete your profile
- Try evaluating your first repository  
- Explore our course offerings

Get started: {{appUrl}}/dashboard


Best,
The {{appName}} Team`,
        variables: ['userName', 'appName', 'appUrl', 'supportEmail', 'currentYear'],
      },

      'feedback-request': {
        templateId: 'feedback-request',
        subject: 'How are we doing? Your feedback matters! 🤔',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">How are we doing? 🤔</h1>
            <p>Hi {{userName}},</p>
            <p>You've been using {{appName}} for a while now. How's it going?</p>
            <p>We'd love to hear:</p>
            <ul>
              <li>What's working well?</li>
              <li>What could be better?</li>
              <li>What features are you missing?</li>
            </ul>
            <p style="margin: 30px 0;">
              <a href="{{feedbackUrl}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Share Your Thoughts (2 minutes)
              </a>
            </p>
            <p>Your feedback directly shapes what we build next!</p>
            <p>Thanks,<br>The {{appName}} Team</p>
          </div>
        `,
        textContent: `How are we doing?

Hi {{userName}},

You've been using {{appName}} for a while now. How's it going?

We'd love to hear:
- What's working well?
- What could be better?
- What features are you missing?

Share your thoughts: {{feedbackUrl}}

Your feedback directly shapes what we build next!

Thanks,
The {{appName}} Team`,
        variables: ['userName', 'feedbackUrl'],
      },

      'product-update': {
        templateId: 'product-update',
        subject: "What's New in {{appName}} ✨",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">What's New in {{appName}} ✨</h1>
            <p>Hi {{userName}},</p>
            <p>We've been busy building new features based on your feedback:</p>
            <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
              <h3 style="margin-top: 0; color: #007bff;">{{updateTitle}}</h3>
              <p style="margin-bottom: 0;">{{updateDescription}}</p>
            </div>
            <p style="margin: 30px 0;">
              <a href="{{appUrl}}/dashboard" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Try it now
              </a>
            </p>
            <p>Happy coding!<br>The {{appName}} Team</p>
          </div>
        `,
        variables: ['userName', 'updateTitle', 'updateDescription'],
      },
    };

    // Use the real production templates from lib/email-templates
    const template = EMAIL_TEMPLATES[templateId];
    if (!template) {
      return null;
    }

    return {
      templateId: template.templateId,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      variables: template.variables,
    };
  }

  /**
   * Send welcome email to new user
   */
  public async sendWelcomeEmail(userEmail: string, userName: string): Promise<EmailSendResult> {
    return this.sendTemplatedEmail({
      to: userEmail,
      templateId: 'welcome',
      variables: {
        userName,
      },
    });
  }

  /**
   * Send feedback request email
   */
  public async sendFeedbackRequestEmail(userEmail: string, userName: string): Promise<EmailSendResult> {
    const siteConfig = this.config.getSiteConfig();
    return this.sendTemplatedEmail({
      to: userEmail,
      templateId: 'feedback-request',
      variables: {
        userName,
        feedbackUrl: `${siteConfig.url}/feedback`,
      },
    });
  }

  /**
   * Send product update email
   */
  public async sendProductUpdateEmail(
    userEmail: string,
    userName: string,
    updateTitle: string,
    updateDescription: string
  ): Promise<EmailSendResult> {
    return this.sendTemplatedEmail({
      to: userEmail,
      templateId: 'product-update',
      variables: {
        userName,
        updateTitle,
        updateDescription,
      },
    });
  }

  /**
   * Send bulk emails to multiple recipients using Resend's batch API
   */
  public async sendBulkEmail(
    recipients: string[],
    templateId: string,
    variables: Record<string, string> = {}
  ): Promise<EmailSendResult[]> {
    if (!this.resend) {
      throw new Error("Resend client not initialized");
    }

    const template = this.getBuiltInTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Get email configuration from environment variables
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@zoomjudge.com';
    const fromName = process.env.RESEND_FROM_NAME || 'ZoomJudge';

    const results: EmailSendResult[] = [];

    // Resend batch API supports up to 100 emails per batch
    const batchSize = 100;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      try {
        // Prepare batch emails for Resend's batch API
        const batchEmails = batch.map(email => {
          const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.zoomjudge.com").replace(/\/$/, '');
          const processedVariables = {
            ...variables,
            recipientEmail: email,
            appUrl: baseUrl,
            unsubscribeUrl: `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`,
            preferencesUrl: `${baseUrl}/preferences?email=${encodeURIComponent(email)}`
          };

          return {
            from: `${fromName} <${fromEmail}>`,
            to: email,
            subject: this.processTemplate(template.subject, processedVariables),
            html: this.processTemplate(template.htmlContent, processedVariables),
            headers: {
              'List-Unsubscribe': `<${processedVariables.unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            }
          };
        });

        // Send batch using Resend's batch API
        const batchResult = await this.resend.batch.send(batchEmails);

        // Process batch results
        if (batchResult.data && Array.isArray(batchResult.data)) {
          for (let j = 0; j < batch.length; j++) {
            const email = batch[j];
            const emailResult = batchResult.data[j];

            if (emailResult && typeof emailResult === 'object' && 'id' in emailResult) {
              results.push({
                success: true,
                messageId: emailResult.id as string,
                resendId: emailResult.id as string
              });

              // Note: logEmail method would need to be implemented or use Convex directly
              console.log(`Email sent successfully to ${email} with ID: ${emailResult.id}`);
            } else {
              results.push({
                success: false,
                error: "Failed to send email in batch"
              });
            }
          }
        } else {
          // Handle batch failure
          batch.forEach(() => {
            results.push({
              success: false,
              error: batchResult.error?.message || "Batch send failed"
            });
          });
        }

        // Add delay between batches to respect rate limits
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error("Batch email error:", error);

        // Handle batch error
        batch.forEach(() => {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        });
      }
    }

    return results;
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}
