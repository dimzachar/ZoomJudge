/**
 * Convex functions for email functionality
 */

import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUserId, getCurrentUser } from "./users";
import { internal, api } from "./_generated/api";
import { EMAIL_TEMPLATES } from "../lib/email-templates";

// Optimized template processing utility (single-pass, O(n) complexity)
const processTemplate = (template: string, variables: Record<string, string> = {}): string => {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    variables[key] ?? match
  );
};

// Standardized email result interface
interface EmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
}

// Enhanced error handling utility with proper context logging
const handleEmailError = (
  operation: string,
  error: unknown,
  context: {
    userId?: string;
    recipientEmail?: string;
    templateId?: string;
    functionName?: string;
  } = {}
): EmailResult => {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  // Enhanced error logging with context
  console.error(`Email operation failed: ${operation}`, {
    error: errorMessage,
    context,
    timestamp: new Date().toISOString(),
    stack: error instanceof Error ? error.stack : undefined,
  });

  return {
    success: false,
    error: errorMessage,
  };
};

// Input validation utilities for security
const validateEmailInput = (input: {
  email?: string;
  name?: string;
  subject?: string;
  content?: string;
}): { isValid: boolean; error?: string } => {
  // Email validation
  if (input.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      return { isValid: false, error: "Invalid email format" };
    }

    // Check for potential injection patterns
    const suspiciousPatterns = [
      /[<>]/,  // HTML tags
      /javascript:/i,  // JavaScript protocol
      /data:/i,  // Data protocol
      /vbscript:/i,  // VBScript protocol
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(input.email!))) {
      return { isValid: false, error: "Email contains suspicious content" };
    }
  }

  // Name validation (prevent XSS)
  if (input.name) {
    if (input.name.length > 100) {
      return { isValid: false, error: "Name too long" };
    }

    const htmlPattern = /<[^>]*>/;
    if (htmlPattern.test(input.name)) {
      return { isValid: false, error: "Name contains HTML tags" };
    }
  }

  // Subject validation
  if (input.subject && input.subject.length > 200) {
    return { isValid: false, error: "Subject too long" };
  }

  // Content validation
  if (input.content && input.content.length > 50000) {
    return { isValid: false, error: "Content too long" };
  }

  return { isValid: true };
};

// Simple rate limiting utility (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (identifier: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const key = identifier;

  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
};

// Email service configuration based on Resend best practices
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@zoomjudge.com";
const FROM_NAME = process.env.RESEND_FROM_NAME || "ZoomJudge";

// Email template management
export const getEmailTemplate = query({
  args: { templateId: v.string() },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("byTemplateId", (q) => q.eq("templateId", args.templateId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return template;
  },
});

export const getAllEmailTemplates = query({
  args: {},
  handler: async (ctx) => {
    // Only allow admins to view all templates
    const user = await getCurrentUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    return await ctx.db
      .query("emailTemplates")
      .withIndex("byIsActive", (q) => q.eq("isActive", true))
      .collect();
  },
});

export const createEmailTemplate = mutation({
  args: {
    templateId: v.string(),
    name: v.string(),
    description: v.string(),
    subject: v.string(),
    htmlContent: v.string(),
    textContent: v.optional(v.string()),
    variables: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Only allow admins to create templates
    const user = await getCurrentUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const now = Date.now();
    
    // Check if template already exists
    const existing = await ctx.db
      .query("emailTemplates")
      .withIndex("byTemplateId", (q) => q.eq("templateId", args.templateId))
      .first();

    if (existing) {
      throw new Error(`Template with ID ${args.templateId} already exists`);
    }

    return await ctx.db.insert("emailTemplates", {
      templateId: args.templateId,
      name: args.name,
      description: args.description,
      subject: args.subject,
      htmlContent: args.htmlContent,
      textContent: args.textContent,
      variables: args.variables,
      isActive: true,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: user.externalId,
    });
  },
});

export const updateEmailTemplate = mutation({
  args: {
    templateId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    htmlContent: v.optional(v.string()),
    textContent: v.optional(v.string()),
    variables: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Only allow admins to update templates
    const user = await getCurrentUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("byTemplateId", (q) => q.eq("templateId", args.templateId))
      .first();

    if (!template) {
      throw new Error(`Template with ID ${args.templateId} not found`);
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updateData.name = args.name;
    if (args.description !== undefined) updateData.description = args.description;
    if (args.subject !== undefined) updateData.subject = args.subject;
    if (args.htmlContent !== undefined) updateData.htmlContent = args.htmlContent;
    if (args.textContent !== undefined) updateData.textContent = args.textContent;
    if (args.variables !== undefined) updateData.variables = args.variables;
    if (args.isActive !== undefined) updateData.isActive = args.isActive;

    // Increment version if content changed
    if (args.subject || args.htmlContent || args.textContent) {
      updateData.version = template.version + 1;
    }

    await ctx.db.patch(template._id, updateData);
    return await ctx.db.get(template._id);
  },
});

// Email logging functions
export const logEmailSent = internalMutation({
  args: {
    userId: v.optional(v.string()),
    recipientEmail: v.string(),
    templateId: v.string(),
    subject: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("failed"),
      v.literal("complained")
    ),
    resendId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.object({
      templateVersion: v.number(),
      variables: v.any(),
      userAgent: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("emailLogs", {
      userId: args.userId,
      recipientEmail: args.recipientEmail,
      templateId: args.templateId,
      subject: args.subject,
      status: args.status,
      resendId: args.resendId,
      errorMessage: args.errorMessage,
      metadata: args.metadata,
      sentAt: Date.now(),
    });
  },
});

export const updateEmailStatus = internalMutation({
  args: {
    resendId: v.string(),
    status: v.union(
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("failed"),
      v.literal("complained")
    ),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const emailLog = await ctx.db
      .query("emailLogs")
      .withIndex("byResendId", (q) => q.eq("resendId", args.resendId))
      .first();

    if (!emailLog) {
      console.warn(`Email log not found for Resend ID: ${args.resendId}`);
      return null;
    }

    const updateData: any = {
      status: args.status,
    };

    const timestamp = args.timestamp || Date.now();

    switch (args.status) {
      case "delivered":
        updateData.deliveredAt = timestamp;
        break;
      case "bounced":
      case "failed":
      case "complained":
        // These are final states, no additional timestamp needed
        break;
    }

    await ctx.db.patch(emailLog._id, updateData);
    return await ctx.db.get(emailLog._id);
  },
});

// Email analytics and reporting
export const getEmailStats = query({
  args: {
    templateId: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Only allow admins to view email stats
    const user = await getCurrentUser(ctx);
    if (!user?.isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    let logs;

    if (args.templateId) {
      logs = await ctx.db
        .query("emailLogs")
        .withIndex("byTemplateId", (q) => q.eq("templateId", args.templateId!))
        .collect();
    } else if (args.startDate || args.endDate) {
      let query = ctx.db.query("emailLogs").withIndex("bySentAt");
      if (args.startDate) {
        query = query.filter((q) => q.gte(q.field("sentAt"), args.startDate!));
      }
      if (args.endDate) {
        query = query.filter((q) => q.lte(q.field("sentAt"), args.endDate!));
      }
      logs = await query.collect();
    } else {
      logs = await ctx.db.query("emailLogs").collect();
    }

    // Calculate statistics
    const stats = {
      totalSent: logs.length,
      delivered: logs.filter(log => log.status === "delivered").length,
      bounced: logs.filter(log => log.status === "bounced").length,
      failed: logs.filter(log => log.status === "failed").length,
      complained: logs.filter(log => log.status === "complained").length,
      pending: logs.filter(log => log.status === "pending").length,
    };

    return {
      ...stats,
      deliveryRate: stats.totalSent > 0 ? (stats.delivered / stats.totalSent) * 100 : 0,
      bounceRate: stats.totalSent > 0 ? (stats.bounced / stats.totalSent) * 100 : 0,
      failureRate: stats.totalSent > 0 ? (stats.failed / stats.totalSent) * 100 : 0,
    };
  },
});

export const getRecentEmailLogs = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only allow admins to view email logs, or users to view their own
    const user = await getCurrentUser(ctx);
    if (!user?.isAdmin && args.userId !== user?.externalId) {
      throw new Error("Unauthorized: Can only view your own email logs");
    }

    const limit = args.limit || 50;
    let query = ctx.db.query("emailLogs").withIndex("bySentAt");

    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }

    return await query
      .order("desc")
      .take(limit);
  },
});

// Email preferences management
export const getUserEmailPreferences = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const targetUserId = args.userId || currentUser?.externalId;

    if (!targetUserId) {
      throw new Error("User not authenticated");
    }

    // Users can only view their own preferences, admins can view any
    if (!currentUser?.isAdmin && targetUserId !== currentUser?.externalId) {
      throw new Error("Unauthorized: Can only view your own preferences");
    }

    const preferences = await ctx.db
      .query("emailPreferences")
      .withIndex("byUserId", (q) => q.eq("userId", targetUserId))
      .first();

    // Return default preferences if none exist
    if (!preferences) {
      return {
        welcomeEmails: true,
        productUpdates: true,
        feedbackRequests: true,
        marketingEmails: false,
        securityAlerts: true,
        weeklyReports: true,
        unsubscribedAt: null,
      };
    }

    return preferences;
  },
});

// Get email preferences by email address (for unsubscribe pages)
export const getEmailPreferences = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("emailPreferences")
      .withIndex("byEmail", (q) => q.eq("email", args.email))
      .first();

    // Return default preferences if none exist
    if (!preferences) {
      return {
        email: args.email,
        welcomeEmails: true,
        productUpdates: true,
        feedbackRequests: true,
        marketingEmails: false,
        securityAlerts: true,
        weeklyReports: true,
        unsubscribedAt: null,
        unsubscribeReason: null,
      };
    }

    return preferences;
  },
});

// Update email preferences by email address (for unsubscribe/preferences pages)
export const updateEmailPreferences = mutation({
  args: {
    email: v.string(),
    preferences: v.object({
      welcomeEmails: v.boolean(),
      productUpdates: v.boolean(),
      feedbackRequests: v.boolean(),
      marketingEmails: v.boolean(),
      securityAlerts: v.boolean(),
      weeklyReports: v.boolean(),
    }),
    unsubscribeReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emailPreferences")
      .withIndex("byEmail", (q) => q.eq("email", args.email))
      .first();

    const now = Date.now();
    const isUnsubscribing = !args.preferences.welcomeEmails &&
                           !args.preferences.productUpdates &&
                           !args.preferences.feedbackRequests &&
                           !args.preferences.marketingEmails &&
                           !args.preferences.weeklyReports;

    if (!existing) {
      // Create new preferences
      return await ctx.db.insert("emailPreferences", {
        email: args.email,
        ...args.preferences,
        unsubscribedAt: isUnsubscribing ? now : undefined,
        unsubscribeReason: args.unsubscribeReason,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Update existing preferences
      const updateData: any = {
        ...args.preferences,
        updatedAt: now
      };

      if (isUnsubscribing && !existing.unsubscribedAt) {
        updateData.unsubscribedAt = now;
      } else if (!isUnsubscribing && existing.unsubscribedAt) {
        updateData.unsubscribedAt = undefined;
      }

      if (args.unsubscribeReason) {
        updateData.unsubscribeReason = args.unsubscribeReason;
      }

      await ctx.db.patch(existing._id, updateData);
      return await ctx.db.get(existing._id);
    }
  },
});

// Update email log status (for webhooks)
export const updateEmailLogStatus = mutation({
  args: {
    resendId: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("complained"),
      v.literal("failed")
    ),
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const emailLog = await ctx.db
      .query("emailLogs")
      .withIndex("byResendId", (q) => q.eq("resendId", args.resendId))
      .first();

    if (!emailLog) {
      console.warn(`Email log not found for resendId: ${args.resendId}`);
      return null;
    }

    const updateData: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.sentAt) updateData.sentAt = args.sentAt;
    if (args.deliveredAt) updateData.deliveredAt = args.deliveredAt;
    if (args.errorMessage) updateData.errorMessage = args.errorMessage;

    await ctx.db.patch(emailLog._id, updateData);
    return await ctx.db.get(emailLog._id);
  },
});

export const updateUserEmailPreferences = mutation({
  args: {
    welcomeEmails: v.optional(v.boolean()),
    productUpdates: v.optional(v.boolean()),
    feedbackRequests: v.optional(v.boolean()),
    marketingEmails: v.optional(v.boolean()),
    securityAlerts: v.optional(v.boolean()),
    weeklyReports: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new Error("User not found");
    }

    const existing = await ctx.db
      .query("emailPreferences")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (!existing) {
      // Create new preferences
      return await ctx.db.insert("emailPreferences", {
        userId,
        email: user.name, // This should be the user's email from Clerk
        welcomeEmails: args.welcomeEmails ?? true,
        productUpdates: args.productUpdates ?? true,
        feedbackRequests: args.feedbackRequests ?? true,
        marketingEmails: args.marketingEmails ?? false,
        securityAlerts: args.securityAlerts ?? true,
        weeklyReports: args.weeklyReports ?? true,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Update existing preferences
      const updateData: any = { updatedAt: now };

      if (args.welcomeEmails !== undefined) updateData.welcomeEmails = args.welcomeEmails;
      if (args.productUpdates !== undefined) updateData.productUpdates = args.productUpdates;
      if (args.feedbackRequests !== undefined) updateData.feedbackRequests = args.feedbackRequests;
      if (args.marketingEmails !== undefined) updateData.marketingEmails = args.marketingEmails;
      if (args.securityAlerts !== undefined) updateData.securityAlerts = args.securityAlerts;
      if (args.weeklyReports !== undefined) updateData.weeklyReports = args.weeklyReports;

      await ctx.db.patch(existing._id, updateData);
      return await ctx.db.get(existing._id);
    }
  },
});

// Email sending actions (can call external APIs)
export const sendWelcomeEmail = action({
  args: {
    userId: v.string(),
    userEmail: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      if (!RESEND_API_KEY) {
        console.warn("RESEND_API_KEY not configured - skipping welcome email");
        return { success: false, error: "Email service not configured" };
      }

      // Check if user should receive welcome emails
      const shouldReceive = await ctx.runQuery(internal.emails.shouldReceiveEmail, {
        email: args.userEmail,
        emailType: "welcomeEmails",
      });

      if (!shouldReceive) {
        return {
          success: false,
          error: "User has unsubscribed from welcome emails",
          skipped: true
        };
      }

      // Initialize Resend
      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);

      // Get the real production welcome template
      const welcomeTemplate = EMAIL_TEMPLATES.welcome;

      const templateVariables = {
        userName: args.userName,
        appUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.zoomjudge.com").replace(/\/$/, ''),
        currentYear: new Date().getFullYear().toString(),
        recipientEmail: args.userEmail,
      };

      const processedSubject = processTemplate(welcomeTemplate.subject, templateVariables);
      const processedHtml = processTemplate(welcomeTemplate.htmlContent, templateVariables);
      const processedText = processTemplate(welcomeTemplate.textContent || "", templateVariables);

      // Add unsubscribe headers
      const unsubscribeUrl = `${templateVariables.appUrl}/unsubscribe?email=${encodeURIComponent(args.userEmail)}`;

      // Send the welcome email
      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.userEmail,
        subject: processedSubject,
        html: processedHtml,
        text: processedText,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
      });

      const result = {
        success: !emailResult.error,
        resendId: emailResult.data?.id,
        error: emailResult.error?.message,
      };

      // Log the email send attempt
      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: args.userId,
        recipientEmail: args.userEmail,
        templateId: "welcome",
        subject: `Welcome to ZoomJudge! 🎉 Your AI Code Evaluation Journey Begins`,
        status: result.success ? "sent" : "failed",
        resendId: result.resendId,
        errorMessage: result.error,
        metadata: {
          templateVersion: 1,
          variables: { userName: args.userName },
        },
      });

      return result;
    } catch (error) {
      const result = handleEmailError("sendWelcomeEmail", error, {
        userId: args.userId,
        recipientEmail: args.userEmail,
        templateId: "welcome",
        functionName: "sendWelcomeEmail",
      });

      // Log the failed attempt
      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: args.userId,
        recipientEmail: args.userEmail,
        templateId: "welcome",
        subject: `Welcome to ZoomJudge! 🎉 Your AI Code Evaluation Journey Begins`,
        status: "failed",
        errorMessage: result.error,
        metadata: {
          templateVersion: 1,
          variables: { userName: args.userName },
        },
      });

      return result;
    }
  },
});

export const sendFeedbackRequestEmail = action({
  args: {
    userId: v.string(),
    userEmail: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      if (!RESEND_API_KEY) {
        return { success: false, error: "Email service not configured" };
      }

      // Check if user should receive feedback emails
      const shouldReceive = await ctx.runQuery(internal.emails.shouldReceiveEmail, {
        email: args.userEmail,
        emailType: "feedbackRequests",
      });

      if (!shouldReceive) {
        return {
          success: false,
          error: "User has unsubscribed from feedback emails",
          skipped: true
        };
      }

      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);

      // Get the feedback request template
      const feedbackTemplate = EMAIL_TEMPLATES['feedback-request'];

      const templateVariables = {
        userName: args.userName,
        appUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.zoomjudge.com",
        currentYear: new Date().getFullYear().toString(),
        feedbackUrl: `mailto:support@zoomjudge.com?subject=Feedback%20for%20ZoomJudge`,
      };

      const processedSubject = processTemplate(feedbackTemplate.subject, templateVariables);
      const processedHtml = processTemplate(feedbackTemplate.htmlContent, templateVariables);
      const processedText = processTemplate(feedbackTemplate.textContent || "", templateVariables);

      // Add unsubscribe headers
      const unsubscribeUrl = `${templateVariables.appUrl}/unsubscribe?email=${encodeURIComponent(args.userEmail)}`;

      // Send the feedback request email
      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.userEmail,
        subject: processedSubject,
        html: processedHtml,
        text: processedText,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
      });

      const result = {
        success: !emailResult.error,
        resendId: emailResult.data?.id,
        error: emailResult.error?.message,
      };

      // Log the email send attempt
      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: args.userId,
        recipientEmail: args.userEmail,
        templateId: "feedback-request",
        subject: processedSubject,
        status: result.success ? "sent" : "failed",
        resendId: result.resendId,
        errorMessage: result.error,
        metadata: {
          templateVersion: 1,
          variables: { userName: args.userName },
        },
      });

      return result;
    } catch (error) {
      console.error("Failed to send feedback request email:", error);

      // Log the failed attempt
      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: args.userId,
        recipientEmail: args.userEmail,
        templateId: "feedback-request",
        subject: `How is ZoomJudge working for you? 🤔 Your feedback shapes our future`,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          templateVersion: 1,
          variables: { userName: args.userName },
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

export const sendProductUpdateEmail = action({
  args: {
    userId: v.string(),
    userEmail: v.string(),
    userName: v.string(),
    updateTitle: v.string(),
    updateDescription: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      if (!RESEND_API_KEY) {
        return { success: false, error: "Email service not configured" };
      }

      // Check if user should receive product update emails
      const shouldReceive = await ctx.runQuery(internal.emails.shouldReceiveEmail, {
        email: args.userEmail,
        emailType: "productUpdates",
      });

      if (!shouldReceive) {
        return {
          success: false,
          error: "User has unsubscribed from product update emails",
          skipped: true
        };
      }

      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);

      // Get the product update template
      const productUpdateTemplate = EMAIL_TEMPLATES['product-update'];

      const templateVariables = {
        userName: args.userName,
        updateTitle: args.updateTitle,
        updateDescription: args.updateDescription,
        appUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.zoomjudge.com",
        currentYear: new Date().getFullYear().toString(),
        changelogUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.zoomjudge.com"}/changelog`,
      };

      const processedSubject = processTemplate(productUpdateTemplate.subject, templateVariables);
      const processedHtml = processTemplate(productUpdateTemplate.htmlContent, templateVariables);
      const processedText = processTemplate(productUpdateTemplate.textContent || "", templateVariables);

      // Add unsubscribe headers
      const unsubscribeUrl = `${templateVariables.appUrl}/unsubscribe?email=${encodeURIComponent(args.userEmail)}`;

      // Send the product update email
      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.userEmail,
        subject: processedSubject,
        html: processedHtml,
        text: processedText,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
      });

      const result = {
        success: !emailResult.error,
        resendId: emailResult.data?.id,
        error: emailResult.error?.message,
      };

      // Log the email send attempt
      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: args.userId,
        recipientEmail: args.userEmail,
        templateId: "product-update",
        subject: processedSubject,
        status: result.success ? "sent" : "failed",
        resendId: result.resendId,
        errorMessage: result.error,
        metadata: {
          templateVersion: 1,
          variables: {
            userName: args.userName,
            updateTitle: args.updateTitle,
            updateDescription: args.updateDescription,
          },
        },
      });

      return result;
    } catch (error) {
      console.error("Failed to send product update email:", error);

      // Log the failed attempt
      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: args.userId,
        recipientEmail: args.userEmail,
        templateId: "product-update",
        subject: `What's New in ZoomJudge ✨ ${args.updateTitle}`,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          templateVersion: 1,
          variables: {
            userName: args.userName,
            updateTitle: args.updateTitle,
            updateDescription: args.updateDescription,
          },
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

export const sendEvaluationCompleteEmail = action({
  args: {
    userId: v.string(),
    userEmail: v.string(),
    userName: v.string(),
    repositoryName: v.string(),
    courseName: v.string(),
    score: v.number(),
    maxScore: v.number(),
    summaryFeedback: v.string(),
    evaluationUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const { getEmailService } = await import("../lib/services/EmailService");
      const emailService = getEmailService();

      if (!emailService.isAvailable()) {
        console.warn("Email service not available - skipping evaluation complete email");
        return { success: false, error: "Email service not configured" };
      }

      // Calculate additional variables
      const scorePercentage = Math.round((args.score / args.maxScore) * 100);
      let scoreGrade = "Needs Improvement";
      if (scorePercentage >= 90) scoreGrade = "Excellent";
      else if (scorePercentage >= 80) scoreGrade = "Good";
      else if (scorePercentage >= 70) scoreGrade = "Satisfactory";

      const result = await emailService.sendTemplatedEmail({
        to: args.userEmail,
        templateId: "evaluation-complete",
        variables: {
          userName: args.userName,
          repositoryName: args.repositoryName,
          courseName: args.courseName,
          score: args.score.toString(),
          maxScore: args.maxScore.toString(),
          scorePercentage: scorePercentage.toString(),
          scoreGrade,
          summaryFeedback: args.summaryFeedback,
          topStrengths: "Code structure and documentation",
          improvementAreas: "Error handling and testing coverage",
          evaluationUrl: args.evaluationUrl,
        },
      });

      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: args.userId,
        recipientEmail: args.userEmail,
        templateId: "evaluation-complete",
        subject: `✅ Your ${args.courseName} evaluation is ready - Score: ${args.score}/${args.maxScore}`,
        status: result.success ? "sent" : "failed",
        resendId: result.resendId,
        errorMessage: result.error,
        metadata: {
          templateVersion: 1,
          variables: {
            userName: args.userName,
            repositoryName: args.repositoryName,
            courseName: args.courseName,
            score: args.score.toString(),
            maxScore: args.maxScore.toString(),
          },
        },
      });

      return result;
    } catch (error) {
      console.error("Failed to send evaluation complete email:", error);

      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: args.userId,
        recipientEmail: args.userEmail,
        templateId: "evaluation-complete",
        subject: `✅ Your ${args.courseName} evaluation is ready - Score: ${args.score}/${args.maxScore}`,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          templateVersion: 1,
          variables: {
            userName: args.userName,
            repositoryName: args.repositoryName,
            courseName: args.courseName,
            score: args.score.toString(),
            maxScore: args.maxScore.toString(),
          },
        },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

// Scheduled email functions
export const scheduleFeedbackRequestEmails = action({
  args: {
    daysAgo: v.optional(v.number()), // Optional: how many days ago to start looking (default: all users)
    limitUsers: v.optional(v.number()), // Optional: limit number of users to process (default: 50)
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    skipped: number;
    message?: string;
    error?: string;
  }> => {
    try {
      // More flexible time range - default to all users from the last 30 days
      const daysAgo = args.daysAgo || 30; // Default to last 30 days if not specified
      const startTime = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
      const endTime = Date.now(); // Up to now
      const limitUsers = args.limitUsers || 10; // Default to 10 users for testing

      console.log(`Starting feedback campaign for users registered after ${new Date(startTime).toISOString()}`);
      console.log(`Will process up to ${limitUsers} users`);

      // Get users for feedback request with real email addresses
      const users = await ctx.runAction(api.emails.getUsersWithEmailsForFeedbackRequest, {
        registeredAfter: startTime,
        registeredBefore: endTime,
        limitUsers: limitUsers,
      });

      console.log(`Found ${users.length} users with valid emails for feedback campaign`);

      if (users.length === 0) {
        // Get total user count for debugging
        const allUsers = await ctx.runQuery(internal.emails.getUsersForFeedbackRequest, {
          registeredAfter: startTime,
          registeredBefore: endTime,
        });
        console.log(`Debug: Found ${allUsers.length} total users in database, but 0 with valid emails in Clerk`);
        return {
          success: true,
          sent: 0,
          failed: 0,
          skipped: 0,
          message: `No eligible users found. Found ${allUsers.length} users in database but none have valid emails in Clerk.`
        };
      }

      let successCount = 0;
      let failureCount = 0;
      let skippedCount = 0;

      console.log(`Processing ${users.length} eligible users for feedback campaign`);

      for (const user of users) {
        try {
          // Validate that we have a proper email address
          if (!user.email || !user.email.includes('@')) {
            console.error(`Invalid email for user ${user.externalId}: ${user.email}`);
            failureCount++;
            continue;
          }

          const result = await ctx.runAction(api.emails.sendFeedbackRequestEmail, {
            userId: user.externalId,
            userEmail: user.email,
            userName: user.name,
          });

          if (result.success) {
            successCount++;
            console.log(`✅ Sent feedback email to ${user.email}`);
          } else if ((result as any).skipped) {
            skippedCount++;
            console.log(`⏭️ Skipped feedback email for ${user.email}: ${result.error}`);
          } else {
            failureCount++;
            console.error(`❌ Failed to send feedback email to ${user.email}: ${result.error}`);
          }

          // Add delay between emails to respect rate limits (1 second)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to send feedback email to user ${user.externalId}:`, error);
          failureCount++;
        }
      }

      const summary = `Feedback email campaign completed: ${successCount} sent, ${failureCount} failed, ${skippedCount} skipped (unsubscribed)`;
      console.log(summary);

      return {
        success: true,
        sent: successCount,
        failed: failureCount,
        skipped: skippedCount,
        message: summary
      };
    } catch (error) {
      console.error("Failed to run feedback email campaign:", error);
      return {
        success: false,
        sent: 0,
        failed: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

// Test feedback campaign with a single user for debugging
export const testFeedbackCampaignSingleUser = action({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    userEmail?: string;
    userName?: string;
    message?: string;
  }> => {
    try {
      console.log(`Testing feedback campaign for user: ${args.userId}`);

      // Get user from database
      const user = await ctx.runQuery(internal.users.userByExternalId, {
        externalId: args.userId,
      });

      if (!user) {
        return { success: false, error: 'User not found in database' };
      }

      // Get user email from Clerk
      const emailResult: any = await ctx.runAction(api.emails.getUserEmailFromClerk, {
        userId: args.userId,
      });

      if (!emailResult.success) {
        return { success: false, error: `Failed to get email: ${emailResult.error}` };
      }

      // Check if user should receive feedback emails
      const shouldReceive = await ctx.runQuery(internal.emails.shouldReceiveEmail, {
        email: emailResult.email,
        emailType: "feedbackRequests",
      });

      if (!shouldReceive) {
        return { success: false, error: 'User has unsubscribed from feedback emails' };
      }

      // Send the feedback email
      const result: any = await ctx.runAction(api.emails.sendFeedbackRequestEmail, {
        userId: args.userId,
        userEmail: emailResult.email,
        userName: user.name,
      });

      return {
        success: result.success,
        error: result.error,
        userEmail: emailResult.email,
        userName: user.name,
        message: result.success ? 'Test feedback email sent successfully' : 'Failed to send test feedback email'
      };

    } catch (error) {
      console.error(`Failed to test feedback campaign for user ${args.userId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

// Test email function for admin dashboard
export const sendTestEmail = action({
  args: {
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Input validation
      const validation = validateEmailInput({
        email: args.recipientEmail,
        name: args.recipientName,
      });

      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Rate limiting (5 test emails per minute per email)
      if (!checkRateLimit(`test-email:${args.recipientEmail}`, 5, 60000)) {
        return { success: false, error: "Rate limit exceeded. Please wait before sending another test email." };
      }

      if (!RESEND_API_KEY) {
        console.warn("RESEND_API_KEY not configured - skipping test email");
        return { success: false, error: "Email service not configured" };
      }

      // Initialize Resend
      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);

      const recipientName = args.recipientName || "there";

      // Determine environment for email context
      const environment = process.env.NODE_ENV || 'development';
      const isProduction = environment === 'production';
      const envLabel = isProduction ? 'Production' : 'Development';
      const envColor = isProduction ? '#059669' : '#d97706';

      // Send the test email
      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.recipientEmail,
        subject: `🧪 Test Email from ZoomJudge [${envLabel}]`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">🧪 Test Email Successful!</h1>
            <div style="background: ${isProduction ? '#f0fdf4' : '#fef3c7'}; border: 1px solid ${isProduction ? '#bbf7d0' : '#fde68a'}; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 0; color: ${envColor}; font-weight: bold;">
                📍 Environment: ${envLabel}
                ${!isProduction ? ' (Using production email credentials)' : ''}
              </p>
            </div>
            <p>Hi ${recipientName},</p>
            <p>This is a test email from your ZoomJudge application to verify that the email system is working correctly.</p>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin: 0 0 10px 0;">✅ Email System Status</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Resend integration: Working</li>
                <li>Email delivery: Successful</li>
                <li>Environment: ${envLabel}</li>
                <li>Template rendering: Functional</li>
              </ul>
            </div>
            <p>If you received this email, your email system is configured correctly and ready to send:</p>
            <ul>
              <li>📧 Welcome emails to new users</li>
              <li>📊 Evaluation completion notifications</li>
              <li>💬 Feedback request emails</li>
              <li>📢 Product update announcements</li>
            </ul>
            <p style="margin-top: 30px;">
              <strong>Sent at:</strong> ${new Date().toLocaleString()}<br>
              <strong>From:</strong> ZoomJudge Admin Dashboard
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This is a test email sent from the ZoomJudge admin dashboard.
              If you did not expect this email, please contact your administrator.
            </p>
          </div>
        `,
      });

      const result = {
        success: !emailResult.error,
        resendId: emailResult.data?.id,
        error: emailResult.error?.message,
      };

      // Log the test email
      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: "admin-test",
        recipientEmail: args.recipientEmail,
        templateId: "test-email",
        subject: "🧪 Test Email from ZoomJudge",
        status: result.success ? "sent" : "failed",
        resendId: result.resendId,
        errorMessage: result.error,
        metadata: {
          templateVersion: 1,
          variables: { recipientName },
        },
      });

      return result;
    } catch (error) {
      return handleEmailError("sendTestEmail", error, {
        recipientEmail: args.recipientEmail,
        templateId: "test-email",
        functionName: "sendTestEmail",
      });
    }
  },
});

// Test welcome email function
export const sendTestWelcomeEmail = action({
  args: {
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      if (!RESEND_API_KEY) {
        return { success: false, error: "Email service not configured" };
      }

      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);
      const recipientName = args.recipientName || "there";

      // Get the real production welcome template
      const welcomeTemplate = EMAIL_TEMPLATES.welcome;

      const templateVariables = {
        userName: recipientName,
        appUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.zoomjudge.com").replace(/\/$/, ''),
        currentYear: new Date().getFullYear().toString(),
        recipientEmail: args.recipientEmail,
      };

      const processedSubject = processTemplate(welcomeTemplate.subject, templateVariables);
      const processedHtml = processTemplate(welcomeTemplate.htmlContent, templateVariables);
      const processedText = processTemplate(welcomeTemplate.textContent || "", templateVariables);

      // Add unsubscribe headers
      const unsubscribeUrl = `${templateVariables.appUrl}/unsubscribe?email=${encodeURIComponent(args.recipientEmail)}`;

      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.recipientEmail,
        subject: processedSubject,
        html: processedHtml,
        text: processedText,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
      });

      const result = {
        success: !emailResult.error,
        resendId: emailResult.data?.id,
        error: emailResult.error?.message,
      };

      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: "test-welcome",
        recipientEmail: args.recipientEmail,
        templateId: "welcome-test",
        subject: "Welcome to ZoomJudge! 🎉 Your AI Code Evaluation Journey Begins",
        status: result.success ? "sent" : "failed",
        resendId: result.resendId,
        errorMessage: result.error,
        metadata: {
          templateVersion: 1,
          variables: { recipientName },
        },
      });

      return result;
    } catch (error) {
      console.error("Failed to send test welcome email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

// Test feedback request email function
export const sendTestFeedbackEmail = action({
  args: {
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      if (!RESEND_API_KEY) {
        return { success: false, error: "Email service not configured" };
      }

      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);
      const recipientName = args.recipientName || "there";

      // Get the real production feedback template
      const feedbackTemplate = EMAIL_TEMPLATES['feedback-request'];

      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.zoomjudge.com").replace(/\/$/, '');
      const templateVariables = {
        userName: recipientName,
        appUrl: baseUrl,
        currentYear: new Date().getFullYear().toString(),
        recipientEmail: args.recipientEmail,
        feedbackUrl: `mailto:support@zoomjudge.com?subject=Feedback%20for%20ZoomJudge`,
      };

      const processedSubject = processTemplate(feedbackTemplate.subject, templateVariables);
      const processedHtml = processTemplate(feedbackTemplate.htmlContent, templateVariables);
      const processedText = processTemplate(feedbackTemplate.textContent || "", templateVariables);

      // Add unsubscribe headers
      const unsubscribeUrl = `${templateVariables.appUrl}/unsubscribe?email=${encodeURIComponent(args.recipientEmail)}`;

      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.recipientEmail,
        subject: processedSubject,
        html: processedHtml,
        text: processedText,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
      });

      const result = {
        success: !emailResult.error,
        resendId: emailResult.data?.id,
        error: emailResult.error?.message,
      };

      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: "test-feedback",
        recipientEmail: args.recipientEmail,
        templateId: "zoomcamp-feedback-test",
        subject: "How is your Zoomcamp journey going? 🚀 Help us improve ZoomJudge",
        status: result.success ? "sent" : "failed",
        resendId: result.resendId,
        errorMessage: result.error,
        metadata: {
          templateVersion: 1,
          variables: { recipientName },
        },
      });

      return result;
    } catch (error) {
      console.error("Failed to send test feedback email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

// Test product update email function
export const sendTestProductUpdateEmail = action({
  args: {
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      if (!RESEND_API_KEY) {
        return { success: false, error: "Email service not configured" };
      }

      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);
      const recipientName = args.recipientName || "there";

      // Get the real production product update template
      const productUpdateTemplate = EMAIL_TEMPLATES['product-update'];

      // Sample product update data for testing
      const sampleUpdateData = {
        updateTitle: "Enhanced AI Evaluation for Zoomcamp Projects",
        updateDescription: "Our AI now better understands Jupyter notebooks, ML models, and deployment patterns specific to Zoomcamp courses. Get more accurate feedback on your data science projects.",
        changelogUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.zoomjudge.com"}/changelog`,
      };



      const templateVariables = {
        userName: recipientName,
        appUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.zoomjudge.com").replace(/\/$/, ''),
        currentYear: new Date().getFullYear().toString(),
        recipientEmail: args.recipientEmail,
        ...sampleUpdateData
      };

      const processedSubject = processTemplate(productUpdateTemplate.subject, templateVariables);
      const processedHtml = processTemplate(productUpdateTemplate.htmlContent, templateVariables);
      const processedText = processTemplate(productUpdateTemplate.textContent || "", templateVariables);

      // Add unsubscribe headers
      const unsubscribeUrl = `${templateVariables.appUrl}/unsubscribe?email=${encodeURIComponent(args.recipientEmail)}`;

      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.recipientEmail,
        subject: processedSubject,
        html: processedHtml,
        text: processedText,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
      });

      const result = {
        success: !emailResult.error,
        resendId: emailResult.data?.id,
        error: emailResult.error?.message,
      };

      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: "test-product-update",
        recipientEmail: args.recipientEmail,
        templateId: "zoomcamp-product-update-test",
        subject: "🎉 New ZoomJudge Features: Better Zoomcamp Project Evaluation",
        status: result.success ? "sent" : "failed",
        resendId: result.resendId,
        errorMessage: result.error,
        metadata: {
          templateVersion: 1,
          variables: { recipientName },
        },
      });

      return result;
    } catch (error) {
      console.error("Failed to send test product update email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

// Test evaluation complete email function (for PAID users)
export const sendTestEvaluationCompleteEmail = action({
  args: {
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
    userTier: v.optional(v.string()), // "free" or "paid"
  },
  handler: async (ctx, args) => {
    try {
      if (!RESEND_API_KEY) {
        return { success: false, error: "Email service not configured" };
      }

      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);
      const recipientName = args.recipientName || "there";
      const userTier = args.userTier || "free"; // Default to free for testing

      // Get the real production evaluation complete template
      const evaluationTemplate = EMAIL_TEMPLATES['evaluation-complete'];

      // Sample evaluation data for testing - Zoomcamp specific
      const sampleData = {
        repositoryName: "ml-zoomcamp-midterm-project",
        courseName: "ML Zoomcamp 2024",
        score: 87,
        maxScore: 100,
        scorePercentage: "87",
        scoreGrade: "B+",
        summaryFeedback: "Excellent work on your ML project! Your model training pipeline is well-structured and you've implemented proper cross-validation. The Docker deployment setup is solid. Consider adding more comprehensive feature engineering and model monitoring for production readiness.",
        topStrengths: "Well-structured pipeline, proper validation, solid Docker setup",
        improvementAreas: "Feature engineering, model monitoring, documentation",
        evaluationUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || "https://www.zoomjudge.com").replace(/\/$/, '')}/dashboard/evaluation/sample-123`
      };



      const templateVariables = {
        userName: recipientName,
        appUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://www.zoomjudge.com").replace(/\/$/, ''),
        currentYear: new Date().getFullYear().toString(),
        recipientEmail: args.recipientEmail,
        repositoryName: sampleData.repositoryName,
        courseName: sampleData.courseName,
        score: sampleData.score.toString(),
        maxScore: sampleData.maxScore.toString(),
        scorePercentage: sampleData.scorePercentage,
        scoreGrade: sampleData.scoreGrade,
        summaryFeedback: sampleData.summaryFeedback,
        topStrengths: sampleData.topStrengths,
        improvementAreas: sampleData.improvementAreas,
        evaluationUrl: sampleData.evaluationUrl
      };

      const processedSubject = processTemplate(evaluationTemplate.subject, templateVariables);
      const processedHtml = processTemplate(evaluationTemplate.htmlContent, templateVariables);
      const processedText = processTemplate(evaluationTemplate.textContent || "", templateVariables);

      // Add unsubscribe headers
      const unsubscribeUrl = `${templateVariables.appUrl}/unsubscribe?email=${encodeURIComponent(args.recipientEmail)}`;

      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.recipientEmail,
        subject: processedSubject,
        html: processedHtml,
        text: processedText,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
      });

      const result = {
        success: !emailResult.error,
        resendId: emailResult.data?.id,
        error: emailResult.error?.message,
      };

      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: "test-evaluation-complete",
        recipientEmail: args.recipientEmail,
        templateId: "zoomcamp-evaluation-complete-test",
        subject: `🎯 Your ${sampleData.courseName} project evaluation is complete - Score: ${sampleData.score}/${sampleData.maxScore}`,
        status: result.success ? "sent" : "failed",
        resendId: result.resendId,
        errorMessage: result.error,
        metadata: {
          templateVersion: 1,
          variables: { recipientName, ...sampleData },
        },
      });

      return result;
    } catch (error) {
      console.error("Failed to send test evaluation complete email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

// Simplified function to send evaluation complete emails
// This will be called directly from the evaluation completion logic

// Admin functions to send real emails to any email address
export const sendRealWelcomeEmailToAnyUser = action({
  args: {
    userEmail: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      // Send real welcome email using the production function
      const result = await ctx.runAction(api.emails.sendWelcomeEmail, {
        userId: "admin-sent", // Special ID for admin-sent emails
        userEmail: args.userEmail,
        userName: args.userName,
      });

      return result;
    } catch (error) {
      console.error("Failed to send real welcome email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

export const sendRealFeedbackEmailToAnyUser = action({
  args: {
    userEmail: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      // Send real feedback email using the production function
      const result = await ctx.runAction(api.emails.sendFeedbackRequestEmail, {
        userId: "admin-sent", // Special ID for admin-sent emails
        userEmail: args.userEmail,
        userName: args.userName,
      });

      return result;
    } catch (error) {
      console.error("Failed to send real feedback email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

export const sendRealProductUpdateEmailToAnyUser = action({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    updateTitle: v.string(),
    updateDescription: v.string(),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      // Send real product update email using the production function
      const result = await ctx.runAction(api.emails.sendProductUpdateEmail, {
        userId: "admin-sent", // Special ID for admin-sent emails
        userEmail: args.userEmail,
        userName: args.userName,
        updateTitle: args.updateTitle,
        updateDescription: args.updateDescription,
      });

      return result;
    } catch (error) {
      console.error("Failed to send real product update email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

// Internal helper functions for the admin dashboard
export const getUsersForFeedbackRequest = internalQuery({
  args: {
    registeredAfter: v.number(),
    registeredBefore: v.number(),
  },
  handler: async (ctx, args) => {
    // Get users from the specified time range
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.gte(q.field("_creationTime"), args.registeredAfter),
          q.lte(q.field("_creationTime"), args.registeredBefore)
        )
      )
      .collect();

    console.log(`Found ${users.length} users registered between ${new Date(args.registeredAfter).toISOString()} and ${new Date(args.registeredBefore).toISOString()}`);

    // Return users without emails - emails will be fetched individually during campaign
    return users;
  },
});

// Action to get users with emails for feedback campaign
export const getUsersWithEmailsForFeedbackRequest = action({
  args: {
    registeredAfter: v.number(),
    registeredBefore: v.number(),
    limitUsers: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: any;
    _creationTime: number;
    name: string;
    externalId: string;
    email: string;
  }>> => {
    // Get users from the query
    const users = await ctx.runQuery(internal.emails.getUsersForFeedbackRequest, {
      registeredAfter: args.registeredAfter,
      registeredBefore: args.registeredBefore,
    });

    console.log(`📊 Found ${users.length} users in database for time range`);

    // Log some user details for debugging
    users.slice(0, 3).forEach((user: any) => {
      console.log(`  - ${user.name} (${user.externalId}) registered: ${new Date(user._creationTime).toISOString()}`);
    });

    if (users.length === 0) {
      console.log('❌ No users found in database for the specified time range');
      return [];
    }

    // Limit users to process (for testing/performance)
    const limitedUsers = args.limitUsers ? users.slice(0, args.limitUsers) : users.slice(0, 50);
    console.log(`🔄 Processing ${limitedUsers.length} users (limited from ${users.length})`);

    // Get real email addresses from Clerk API
    const eligibleUsers = [];
    let clerkNotFoundCount = 0;
    let invalidEmailCount = 0;
    let unsubscribedCount = 0;

    if (!process.env.CLERK_SECRET_KEY) {
      console.warn('CLERK_SECRET_KEY not configured - cannot fetch user emails for campaign');
      return [];
    }

    try {
      const { createClerkClient } = await import('@clerk/backend');
      const clerkClient = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY
      });

      for (const user of limitedUsers) {
        try {
          console.log(`Processing user: ${user.name} (${user.externalId})`);

          // Get user data from Clerk including email
          const clerkUser = await clerkClient.users.getUser(user.externalId);

          // Get primary email address
          const primaryEmail = clerkUser.emailAddresses.find(
            email => email.id === clerkUser.primaryEmailAddressId
          );

          if (!primaryEmail?.emailAddress) {
            console.log(`❌ No primary email found for user ${user.externalId}`);
            continue;
          }

          const userEmail = primaryEmail.emailAddress;
          console.log(`📧 Found email for ${user.name}: ${userEmail}`);

          // Validate email format (ASCII only for Resend compatibility)
          if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(userEmail)) {
            console.log(`❌ Invalid email format for user ${user.externalId}: ${userEmail}`);
            invalidEmailCount++;
            continue;
          }

          // Check if user should receive feedback emails
          const shouldReceive = await ctx.runQuery(internal.emails.shouldReceiveEmail, {
            email: userEmail,
            emailType: "feedbackRequests",
          });

          if (shouldReceive) {
            eligibleUsers.push({
              ...user,
              email: userEmail,
            });
            console.log(`✅ User ${user.name} (${userEmail}) is eligible for feedback campaign`);
          } else {
            console.log(`⏭️ User ${user.externalId} has unsubscribed from feedback emails`);
            unsubscribedCount++;
          }

        } catch (clerkError: any) {
          if (clerkError.status === 404) {
            console.log(`❌ User ${user.externalId} (${user.name}) not found in Clerk - may have been deleted`);
            clerkNotFoundCount++;
          } else {
            console.error(`❌ Failed to fetch Clerk data for user ${user.externalId}:`, clerkError.message);
          }
          continue;
        }
      }

    } catch (error) {
      console.error('Failed to initialize Clerk client:', error);
      return [];
    }

    console.log(`📊 Campaign Summary:`);
    console.log(`  - Total users in DB: ${users.length}`);
    console.log(`  - Users processed: ${limitedUsers.length}`);
    console.log(`  - Users not found in Clerk: ${clerkNotFoundCount}`);
    console.log(`  - Users with invalid emails: ${invalidEmailCount}`);
    console.log(`  - Users unsubscribed: ${unsubscribedCount}`);
    console.log(`  - Eligible users: ${eligibleUsers.length}`);

    return eligibleUsers;
  },
});

// Get all users for admin email management with real email addresses from Clerk
export const getAllUsersWithEmails = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser?.isAdmin) {
      throw new Error("Admin access required");
    }

    const users = await ctx.db
      .query("users")
      .order("desc")
      .take(args.limit || 50);

    // Return basic user info without emails for security
    // Emails will be fetched separately when needed for campaigns
    return users.map(user => ({
      id: user._id,
      externalId: user.externalId,
      name: user.name,
      createdAt: user._creationTime,
    }));
  },
});

// Get all users for admin email management (legacy function - kept for compatibility)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .collect();

    return users.map(user => ({
      id: user._id,
      externalId: user.externalId,
      name: user.name,
      createdAt: user._creationTime,
    }));
  },
});

// Helper function to get and validate user email from Clerk (action version)
export const getUserEmailFromClerk = action({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    error?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  }> => {
    if (!process.env.CLERK_SECRET_KEY) {
      return { success: false, error: 'CLERK_SECRET_KEY not configured' };
    }

    try {
      const { createClerkClient } = await import('@clerk/backend');
      const clerkClient = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY
      });

      const clerkUser = await clerkClient.users.getUser(args.userId);

      // Get primary email address
      const primaryEmail = clerkUser.emailAddresses.find(
        email => email.id === clerkUser.primaryEmailAddressId
      );

      if (!primaryEmail?.emailAddress) {
        return { success: false, error: 'No primary email found' };
      }

      const userEmail = primaryEmail.emailAddress;

      // Validate email format (ASCII only for Resend compatibility)
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(userEmail)) {
        return { success: false, error: 'Invalid email format (non-ASCII characters)' };
      }

      return {
        success: true,
        email: userEmail,
        firstName: clerkUser.firstName || undefined,
        lastName: clerkUser.lastName || undefined
      };

    } catch (error) {
      console.error(`Failed to fetch email for user ${args.userId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
});

// Debug function to list all users with their emails (no sending)
export const listAllUsersWithEmails = action({
  args: {
    limitUsers: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    users: Array<{
      name: string;
      externalId: string;
      email?: string;
      status: string;
      registeredAt: string;
    }>;
    summary: {
      totalInDB: number;
      processed: number;
      foundInClerk: number;
      notFoundInClerk: number;
      validEmails: number;
      invalidEmails: number;
    };
  }> => {
    try {
      // Get all users from database
      const allUsers = await ctx.runQuery(internal.emails.getUsersForFeedbackRequest, {
        registeredAfter: 0, // All time
        registeredBefore: Date.now(),
      });

      console.log(`📊 Found ${allUsers.length} total users in database`);

      const limitedUsers = args.limitUsers ? allUsers.slice(0, args.limitUsers) : allUsers;
      console.log(`🔄 Processing ${limitedUsers.length} users`);

      const userList = [];
      let foundInClerk = 0;
      let notFoundInClerk = 0;
      let validEmails = 0;
      let invalidEmails = 0;

      if (!process.env.CLERK_SECRET_KEY) {
        console.warn('CLERK_SECRET_KEY not configured');
        return {
          success: false,
          users: [],
          summary: {
            totalInDB: allUsers.length,
            processed: 0,
            foundInClerk: 0,
            notFoundInClerk: 0,
            validEmails: 0,
            invalidEmails: 0,
          }
        };
      }

      const { createClerkClient } = await import('@clerk/backend');
      const clerkClient = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY
      });

      for (const user of limitedUsers) {
        try {
          console.log(`Processing: ${user.name} (${user.externalId})`);

          const clerkUser = await clerkClient.users.getUser(user.externalId);
          foundInClerk++;

          const primaryEmail = clerkUser.emailAddresses.find(
            email => email.id === clerkUser.primaryEmailAddressId
          );

          if (primaryEmail?.emailAddress) {
            const userEmail = primaryEmail.emailAddress;
            const isValidEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(userEmail);

            if (isValidEmail) {
              validEmails++;
            } else {
              invalidEmails++;
            }

            userList.push({
              name: user.name,
              externalId: user.externalId,
              email: userEmail,
              status: isValidEmail ? 'Valid email' : 'Invalid email format',
              registeredAt: new Date(user._creationTime).toISOString(),
            });

            console.log(`✅ ${user.name}: ${userEmail} (${isValidEmail ? 'valid' : 'invalid format'})`);
          } else {
            userList.push({
              name: user.name,
              externalId: user.externalId,
              status: 'No email found in Clerk',
              registeredAt: new Date(user._creationTime).toISOString(),
            });
            console.log(`❌ ${user.name}: No email found`);
          }

        } catch (clerkError: any) {
          notFoundInClerk++;
          userList.push({
            name: user.name,
            externalId: user.externalId,
            status: clerkError.status === 404 ? 'User not found in Clerk' : `Clerk error: ${clerkError.message}`,
            registeredAt: new Date(user._creationTime).toISOString(),
          });
          console.log(`❌ ${user.name}: ${clerkError.status === 404 ? 'Not found in Clerk' : 'Clerk error'}`);
        }
      }

      const summary = {
        totalInDB: allUsers.length,
        processed: limitedUsers.length,
        foundInClerk,
        notFoundInClerk,
        validEmails,
        invalidEmails,
      };

      console.log('📊 Summary:', summary);

      return {
        success: true,
        users: userList,
        summary,
      };

    } catch (error) {
      console.error('Failed to list users:', error);
      return {
        success: false,
        users: [],
        summary: {
          totalInDB: 0,
          processed: 0,
          foundInClerk: 0,
          notFoundInClerk: 0,
          validEmails: 0,
          invalidEmails: 0,
        }
      };
    }
  },
});

// Helper function to check if user should receive a specific type of email
export const shouldReceiveEmail = internalQuery({
  args: {
    email: v.string(),
    emailType: v.union(
      v.literal("welcomeEmails"),
      v.literal("productUpdates"),
      v.literal("feedbackRequests"),
      v.literal("marketingEmails"),
      v.literal("securityAlerts"),
      v.literal("weeklyReports")
    ),
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("emailPreferences")
      .withIndex("byEmail", (q) => q.eq("email", args.email))
      .first();

    // If no preferences exist, use defaults (most are true except marketing)
    if (!preferences) {
      const defaults = {
        welcomeEmails: true,
        productUpdates: true,
        feedbackRequests: true,
        marketingEmails: false,
        securityAlerts: true,
        weeklyReports: true,
      };
      return defaults[args.emailType];
    }

    // Check if user has unsubscribed from all emails
    if (preferences.unsubscribedAt) {
      // Only allow security alerts for fully unsubscribed users
      return args.emailType === "securityAlerts" && preferences.securityAlerts;
    }

    // Return the specific preference
    return preferences[args.emailType];
  },
});
