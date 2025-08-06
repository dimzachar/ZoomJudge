import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUserId } from "./users";

// Get user preferences
export const getUserPreferences = query({
  args: {},
  handler: async (ctx) => {
    try {
      const userId = await getAuthenticatedUserId(ctx);

      const preferences = await ctx.db
        .query("userPreferences")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .unique();

      // Return default preferences if none exist
      if (!preferences) {
        return {
          emailNotifications: true,
          pushNotifications: false,
          marketingEmails: false,
          securityAlerts: true,
          weeklyReports: true,
          twoFactorEnabled: false,
          lastPasswordChange: null,
        };
      }

      return {
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        marketingEmails: preferences.marketingEmails ?? false,
        securityAlerts: preferences.securityAlerts ?? true,
        weeklyReports: preferences.weeklyReports ?? true,
        twoFactorEnabled: preferences.twoFactorEnabled ?? false,
        lastPasswordChange: preferences.lastPasswordChange,
      };
    } catch (error) {
      // Return default preferences if user is not authenticated
      return {
        emailNotifications: true,
        pushNotifications: false,
        marketingEmails: false,
        securityAlerts: true,
        weeklyReports: true,
        twoFactorEnabled: false,
        lastPasswordChange: null,
      };
    }
  },
});

// Update notification preferences
export const updateNotificationPreferences = mutation({
  args: {
    emailNotifications: v.optional(v.boolean()),
    pushNotifications: v.optional(v.boolean()),
    marketingEmails: v.optional(v.boolean()),
    securityAlerts: v.optional(v.boolean()),
    weeklyReports: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    
    const existingPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .unique();

    const now = Date.now();

    if (!existingPreferences) {
      // Create new preferences record
      const preferencesId = await ctx.db.insert("userPreferences", {
        userId,
        emailNotifications: args.emailNotifications ?? true,
        pushNotifications: args.pushNotifications ?? false,
        marketingEmails: args.marketingEmails ?? false,
        securityAlerts: args.securityAlerts ?? true,
        weeklyReports: args.weeklyReports ?? true,
        twoFactorEnabled: false,
        createdAt: now,
        updatedAt: now,
      });

      return await ctx.db.get(preferencesId);
    } else {
      // Update existing preferences
      const updateData: any = {
        updatedAt: now,
      };

      if (args.emailNotifications !== undefined) {
        updateData.emailNotifications = args.emailNotifications;
      }
      if (args.pushNotifications !== undefined) {
        updateData.pushNotifications = args.pushNotifications;
      }
      if (args.marketingEmails !== undefined) {
        updateData.marketingEmails = args.marketingEmails;
      }
      if (args.securityAlerts !== undefined) {
        updateData.securityAlerts = args.securityAlerts;
      }
      if (args.weeklyReports !== undefined) {
        updateData.weeklyReports = args.weeklyReports;
      }

      await ctx.db.patch(existingPreferences._id, updateData);
      return await ctx.db.get(existingPreferences._id);
    }
  },
});

// Update security preferences
export const updateSecurityPreferences = mutation({
  args: {
    twoFactorEnabled: v.optional(v.boolean()),
    lastPasswordChange: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);
    
    const existingPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .unique();

    const now = Date.now();

    if (!existingPreferences) {
      // Create new preferences record
      const preferencesId = await ctx.db.insert("userPreferences", {
        userId,
        emailNotifications: true,
        pushNotifications: false,
        marketingEmails: false,
        securityAlerts: true,
        weeklyReports: true,
        twoFactorEnabled: args.twoFactorEnabled ?? false,
        lastPasswordChange: args.lastPasswordChange,
        createdAt: now,
        updatedAt: now,
      });

      return await ctx.db.get(preferencesId);
    } else {
      // Update existing preferences
      const updateData: any = {
        updatedAt: now,
      };

      if (args.twoFactorEnabled !== undefined) {
        updateData.twoFactorEnabled = args.twoFactorEnabled;
      }
      if (args.lastPasswordChange !== undefined) {
        updateData.lastPasswordChange = args.lastPasswordChange;
      }

      await ctx.db.patch(existingPreferences._id, updateData);
      return await ctx.db.get(existingPreferences._id);
    }
  },
});

// Initialize user preferences (called when user first signs up)
export const initializeUserPreferences = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!existingPreferences) {
      const now = Date.now();
      const preferencesId = await ctx.db.insert("userPreferences", {
        userId: args.userId,
        emailNotifications: true,
        pushNotifications: false,
        marketingEmails: false,
        securityAlerts: true,
        weeklyReports: true,
        twoFactorEnabled: false,
        createdAt: now,
        updatedAt: now,
      });

      return await ctx.db.get(preferencesId);
    }

    return existingPreferences;
  },
});
