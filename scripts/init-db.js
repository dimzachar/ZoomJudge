#!/usr/bin/env node

/**
 * Database initialization script for ZoomJudge
 * This script initializes the database with default courses and configurations
 */

const { ConvexHttpClient } = require("convex/browser");

async function initializeDatabase() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!convexUrl) {
    console.error("❌ NEXT_PUBLIC_CONVEX_URL environment variable is required");
    process.exit(1);
  }

  console.log("🚀 Initializing ZoomJudge database...");
  
  try {
    const client = new ConvexHttpClient(convexUrl);
    
    // Initialize the database
    const result = await client.action("setup:initializeDatabase", {});
    
    if (result.success) {
      console.log("✅ Database initialized successfully!");
      console.log(`📚 Courses initialized: ${result.courses.count}`);
      console.log("\n🎉 ZoomJudge is ready to use!");
    } else {
      console.error("❌ Failed to initialize database:", result.message);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error initializing database:", error.message);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();
