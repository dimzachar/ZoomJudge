/**
 * Convex functions for email functionality
 */

import { mutation, query, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUserId, getCurrentUser } from "./users";
import { internal, api } from "./_generated/api";

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

      // Initialize Resend
      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);

      // Send the welcome email
      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.userEmail,
        subject: `Welcome to ZoomJudge! 🎉 Your AI Code Evaluation Journey Begins`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Welcome to ZoomJudge, ${args.userName}! 🎉</h1>
            <p>We're excited to have you join our community of developers using AI-powered code evaluation.</p>
            <p>Here's what you can do with ZoomJudge:</p>
            <ul>
              <li>📝 Submit your code for AI evaluation</li>
              <li>📊 Get detailed feedback and scoring</li>
              <li>🎯 Track your progress over time</li>
              <li>🏆 Improve your coding skills</li>
            </ul>
            <p>Ready to get started? <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="color: #2563eb;">Visit your dashboard</a></p>
            <p>Happy coding!</p>
            <p>The ZoomJudge Team</p>
          </div>
        `,
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
      console.error("Failed to send welcome email:", error);

      // Log the failed attempt
      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: args.userId,
        recipientEmail: args.userEmail,
        templateId: "welcome",
        subject: `Welcome to ZoomJudge! 🎉 Your AI Code Evaluation Journey Begins`,
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

export const sendFeedbackRequestEmail = action({
  args: {
    userId: v.string(),
    userEmail: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const { getEmailService } = await import("../lib/services/EmailService");
      const emailService = getEmailService();

      if (!emailService.isAvailable()) {
        console.warn("Email service not available - skipping feedback request email");
        return { success: false, error: "Email service not configured" };
      }

      const result = await emailService.sendFeedbackRequestEmail(args.userEmail, args.userName);

      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: args.userId,
        recipientEmail: args.userEmail,
        templateId: "feedback-request",
        subject: `How is ZoomJudge working for you? 🤔 Your feedback shapes our future`,
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
      const { getEmailService } = await import("../lib/services/EmailService");
      const emailService = getEmailService();

      if (!emailService.isAvailable()) {
        console.warn("Email service not available - skipping product update email");
        return { success: false, error: "Email service not configured" };
      }

      const result = await emailService.sendProductUpdateEmail(
        args.userEmail,
        args.userName,
        args.updateTitle,
        args.updateDescription
      );

      await ctx.runMutation(internal.emails.logEmailSent, {
        userId: args.userId,
        recipientEmail: args.userEmail,
        templateId: "product-update",
        subject: `What's New in ZoomJudge ✨ ${args.updateTitle}`,
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
  args: {},
  handler: async (ctx) => {
    try {
      // Find users who registered 2 weeks ago and haven't received feedback request yet
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      // Get users for feedback request (simplified implementation)
      const users = await ctx.runQuery(internal.emails.getUsersForFeedbackRequest, {
        registeredAfter: twoWeeksAgo,
        registeredBefore: oneWeekAgo,
      });

      let successCount = 0;
      let failureCount = 0;

      for (const user of users) {
        try {
          const result = await ctx.runAction(api.emails.sendFeedbackRequestEmail, {
            userId: user.externalId,
            userEmail: user.email,
            userName: user.name,
          });

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }

          // Add delay between emails to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to send feedback email to user ${user.externalId}:`, error);
          failureCount++;
        }
      }

      console.log(`Feedback email campaign completed: ${successCount} sent, ${failureCount} failed`);
      return { success: true, sent: successCount, failed: failureCount };
    } catch (error) {
      console.error("Failed to run feedback email campaign:", error);
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
      if (!RESEND_API_KEY) {
        console.warn("RESEND_API_KEY not configured - skipping test email");
        return { success: false, error: "Email service not configured" };
      }

      // Initialize Resend
      const { Resend } = await import("resend");
      const resend = new Resend(RESEND_API_KEY);

      const recipientName = args.recipientName || "there";

      // Send the test email
      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.recipientEmail,
        subject: `🧪 Test Email from ZoomJudge`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">🧪 Test Email Successful!</h1>
            <p>Hi ${recipientName},</p>
            <p>This is a test email from your ZoomJudge application to verify that the email system is working correctly.</p>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin: 0 0 10px 0;">✅ Email System Status</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Resend integration: Working</li>
                <li>Email delivery: Successful</li>
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
      console.error("Failed to send test email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
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

      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.recipientEmail,
        subject: `Welcome to ZoomJudge! 🎉 Your AI Code Evaluation Journey Begins`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Welcome to ZoomJudge, ${recipientName}! 🎉</h1>
            <p>We're excited to have you join our community of developers using AI-powered code evaluation.</p>
            <p>Here's what you can do with ZoomJudge:</p>
            <ul>
              <li>📝 Submit your code for AI evaluation</li>
              <li>📊 Get detailed feedback and scoring</li>
              <li>🎯 Track your progress over time</li>
              <li>🏆 Improve your coding skills</li>
            </ul>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin: 0 0 10px 0;">🚀 Getting Started</h3>
              <p style="margin: 0;">Ready to evaluate your first project? <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/new-evaluation" style="color: #2563eb; font-weight: bold;">Start your first evaluation</a></p>
            </div>
            <p>Happy coding!</p>
            <p>The ZoomJudge Team</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This is a test of the welcome email template. In production, this would be sent automatically when users sign up.
            </p>
          </div>
        `,
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

      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.recipientEmail,
        subject: `How is your Zoomcamp journey going? 🚀 Help us improve ZoomJudge`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">How's your Zoomcamp experience, ${recipientName}? 🚀</h1>
            <p>You've been using ZoomJudge to evaluate your Zoomcamp projects, and we'd love to hear how it's helping your learning journey!</p>

            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3 style="color: #1e40af; margin: 0 0 15px 0;">🤖 Your AI Code Evaluation Experience</h3>
              <p style="margin: 0 0 10px 0; color: #1e40af;">Help us understand how ZoomJudge is supporting your Zoomcamp learning:</p>
              <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
                <li>How helpful are the AI-generated code reviews?</li>
                <li>Are the evaluation criteria clear for your course?</li>
                <li>How accurate are the automated scores vs manual review?</li>
                <li>What specific feedback helps you improve most?</li>
              </ul>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin: 0 0 15px 0;">📊 Course-Specific Feedback</h3>
              <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                <li>Which Zoomcamp course are you taking?</li>
                <li>How can we better support your specific course requirements?</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.zoomjudge.com/dashboard?feedback=open"
                 style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                💬 Share Feedback on ZoomJudge.com
              </a>
            </div>

            <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #1e40af;">
                <strong>🌟 New Domain:</strong> We've moved to <a href="https://www.zoomjudge.com" style="color: #2563eb; font-weight: bold;">www.zoomjudge.com</a> for a better experience! Use our in-app feedback widget to share your thoughts directly.
              </p>
            </div>

            <p>Your feedback directly influences how we improve ZoomJudge for the entire Zoomcamp community. Every insight helps us build better AI evaluation tools for data science and ML education.</p>

            <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #166534;">
                <strong>🎯 Recent improvements based on student feedback:</strong> Enhanced Python code analysis, better Jupyter notebook support, and improved ML model evaluation criteria.
              </p>
            </div>

            <p>Keep building amazing projects!</p>
            <p>The ZoomJudge Team<br><em>Supporting your Zoomcamp journey with AI-powered code evaluation</em></p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This is a test of the feedback request email template. In production, this would be sent periodically to active Zoomcamp students.
            </p>
          </div>
        `,
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

      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.recipientEmail,
        subject: `🎉 New ZoomJudge Features: Better Zoomcamp Project Evaluation`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">🎉 Exciting Updates for Zoomcamp Students!</h1>
            <p>Hi ${recipientName},</p>
            <p>We've been working hard to improve ZoomJudge based on feedback from the Zoomcamp community. Here's what's new for your project evaluations:</p>

            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin: 0 0 15px 0;">🤖 Smarter AI for Data Science Projects</h3>
              <p style="margin: 0 0 10px 0;">Our AI evaluation engine now better understands Zoomcamp projects:</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Enhanced Jupyter Notebook Analysis:</strong> Better evaluation of data exploration and visualization</li>
                <li><strong>ML Model Assessment:</strong> Improved scoring for model performance and validation techniques</li>
                <li><strong>Python Best Practices:</strong> More accurate detection of pandas, scikit-learn, and TensorFlow patterns</li>
                <li><strong>Docker & Deployment:</strong> Better evaluation of containerization and cloud deployment</li>
              </ul>
            </div>

            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #166534; margin: 0 0 15px 0;">📊 Course-Specific Evaluation Criteria</h3>
              <p style="margin: 0 0 10px 0;">Tailored evaluation rubrics for each Zoomcamp course:</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>ML Zoomcamp:</strong> Focus on model training, validation, and deployment</li>
                <li><strong>Data Engineering:</strong> Emphasis on pipeline design, data quality, and scalability</li>
                <li><strong>MLOps:</strong> Evaluation of monitoring, CI/CD, and model versioning</li>
                <li><strong>Analytics Engineering:</strong> Assessment of dbt models and data transformation</li>
              </ul>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin: 0 0 15px 0;">⚡ Faster GitHub Integration</h3>
              <p style="margin: 0 0 10px 0;">Streamlined workflow for Zoomcamp project submissions:</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>One-click evaluation from GitHub repository URLs</li>
                <li>Automatic detection of project structure and requirements</li>
                <li>Support for both individual and capstone projects</li>
              </ul>
            </div>

            <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #be185d; margin: 0 0 15px 0;">📈 Progress Tracking Dashboard</h3>
              <p style="margin: 0;">New analytics to track your Zoomcamp journey:</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Course completion progress visualization</li>
                <li>Skill development metrics across projects</li>
                <li>Comparison with cohort performance (anonymized)</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/new-evaluation"
                 style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
                🚀 Evaluate Your Next Project
              </a>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/analytics"
                 style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                📊 View Your Progress
              </a>
            </div>

            <p>These improvements are designed specifically for Zoomcamp students to get more accurate, helpful feedback on your data science and ML projects.</p>

            <p>Keep building amazing projects and advancing your data career!</p>
            <p>The ZoomJudge Team<br><em>Empowering Zoomcamp students with AI-powered project evaluation</em></p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This is a test of the product update email template. In production, this would be sent when we release new features for Zoomcamp students.
            </p>
          </div>
        `,
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

      // Sample evaluation data for testing - Zoomcamp specific
      const sampleData = {
        repositoryName: "ml-zoomcamp-midterm-project",
        courseName: "ML Zoomcamp 2024",
        score: 87,
        maxScore: 100,
        summaryFeedback: "Excellent work on your ML project! Your model training pipeline is well-structured and you've implemented proper cross-validation. The Docker deployment setup is solid. Consider adding more comprehensive feature engineering and model monitoring for production readiness."
      };

      const isPaidUser = userTier === "paid";

      const emailResult = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: args.recipientEmail,
        subject: `🎯 Your ${sampleData.courseName} project evaluation is complete - Score: ${sampleData.score}/${sampleData.maxScore}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">🎯 Your Zoomcamp Project Evaluation is Ready!</h1>
            <p>Hi ${recipientName},</p>
            <p>Great news! Your AI-powered evaluation for <strong>${sampleData.repositoryName}</strong> in <strong>${sampleData.courseName}</strong> is complete.</p>

            <div style="background: #f0f9ff; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <h2 style="color: #0369a1; margin: 0 0 15px 0;">🤖 AI Evaluation Score</h2>
              <div style="font-size: 48px; font-weight: bold; color: ${sampleData.score >= 80 ? '#059669' : sampleData.score >= 60 ? '#d97706' : '#dc2626'}; margin: 10px 0;">
                ${sampleData.score}/${sampleData.maxScore}
              </div>
              <div style="background: ${sampleData.score >= 80 ? '#d1fae5' : sampleData.score >= 60 ? '#fef3c7' : '#fee2e2'};
                          color: ${sampleData.score >= 80 ? '#065f46' : sampleData.score >= 60 ? '#92400e' : '#991b1b'};
                          padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold;">
                ${sampleData.score >= 80 ? '🎉 Outstanding Work!' : sampleData.score >= 60 ? '👍 Solid Progress!' : '💪 Keep Building!'}
              </div>
            </div>

            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin: 0 0 15px 0;">🤖 AI Feedback Summary</h3>
              <p style="margin: 0; line-height: 1.6; color: #4b5563;">${sampleData.summaryFeedback}</p>
            </div>

            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #166534; margin: 0 0 15px 0;">📊 Zoomcamp Evaluation Criteria</h3>
              <ul style="margin: 0; padding-left: 20px; color: #166534;">
                <li><strong>Problem Understanding:</strong> How well you addressed the project requirements</li>
                <li><strong>Data Science Methodology:</strong> EDA, feature engineering, model selection</li>
                <li><strong>Code Quality:</strong> Structure, readability, and best practices</li>
                <li><strong>ML Implementation:</strong> Model training, validation, and evaluation</li>
                <li><strong>Deployment & Reproducibility:</strong> Docker, dependencies, documentation</li>
                <li><strong>Business Impact:</strong> Practical applicability and insights</li>
              </ul>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #92400e; margin: 0 0 15px 0;">🎯 Next Steps for Your Zoomcamp Journey</h3>
              <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                <li>Review the detailed feedback to improve your next project</li>
                <li>Compare your approach with course best practices</li>
                <li>Apply the suggestions to your capstone project</li>
                <li>Share your project with the Zoomcamp community</li>
              </ul>
            </div>

            ${isPaidUser ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.zoomjudge.com/dashboard/history"
                 style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
                📊 View Detailed Report
              </a>
              <a href="https://www.zoomjudge.com/dashboard/new-evaluation"
                 style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                🚀 Evaluate Next Project
              </a>
            </div>
            ` : `
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 15px 0;">🔓 Unlock Detailed Feedback</h3>
              <p style="margin: 0 0 10px 0; color: #92400e;">Want to see the full AI analysis, line-by-line feedback, and improvement suggestions?</p>
              <div style="text-align: center; margin: 15px 0;">
                <a href="https://www.zoomjudge.com/dashboard/billing"
                   style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  ⭐ Upgrade to Pro
                </a>
              </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.zoomjudge.com/dashboard/new-evaluation"
                 style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                🚀 Evaluate Next Project
              </a>
            </div>
            `}

            <div style="background: #fdf2f8; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #be185d;">
                <strong>💡 Pro tip:</strong> Use this feedback to refine your approach for the next module. Each project builds on the previous one in your Zoomcamp journey!
              </p>
            </div>

            <p>Keep up the excellent work on your data science journey! Every project evaluation brings you closer to mastering ML engineering.</p>
            <p>The ZoomJudge Team<br><em>Supporting your success in ${sampleData.courseName}</em></p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              This is a test of the evaluation complete email template. In production, this would be sent automatically when Zoomcamp project evaluations finish.
            </p>
          </div>
        `,
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

// Internal helper functions for the admin dashboard
export const getUsersForFeedbackRequest = internalQuery({
  args: {
    registeredAfter: v.number(),
    registeredBefore: v.number(),
  },
  handler: async (ctx, args) => {
    // This is a simplified implementation
    // In a real app, you'd query users based on registration date and email preferences
    const users = await ctx.db
      .query("users")
      .collect();

    // Filter users and add mock email addresses (in real implementation, get from Clerk)
    return users.slice(0, 10).map(user => ({
      ...user,
      email: `${user.name.toLowerCase().replace(' ', '.')}@example.com`, // Mock email
    }));
  },
});
