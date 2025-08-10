import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Setup action to initialize the database with default data
export const initializeDatabase = action({
  handler: async (ctx): Promise<{ success: boolean; message: string; courses?: any }> => {
    try {
      // Initialize default courses
      const coursesResult: any = await ctx.runMutation(internal.courses.initializeDefaultCoursesInternal);

      return {
        success: true,
        message: "Database initialized successfully",
        courses: coursesResult,
      };
    } catch (error) {
      console.error("Failed to initialize database:", error);
      return {
        success: false,
        message: `Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
