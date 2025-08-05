import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all active courses
export const getActiveCourses = query({
  handler: async (ctx) => {
    const courses = await ctx.db
      .query("courses")
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("asc")
      .collect();

    return courses;
  },
});

// Get course by ID
export const getCourse = query({
  args: {
    courseId: v.string(),
  },
  handler: async (ctx, args) => {
    const course = await ctx.db
      .query("courses")
      .withIndex("byCourseId", (q) => q.eq("courseId", args.courseId))
      .first();

    return course;
  },
});

// Create or update course (admin function)
export const upsertCourse = mutation({
  args: {
    courseId: v.string(),
    courseName: v.string(),
    description: v.string(),
    maxScore: v.number(),
    criteria: v.array(v.object({
      name: v.string(),
      description: v.string(),
      maxScore: v.number(),
      weight: v.number(),
    })),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // In a real app, you'd want to check for admin permissions here
    
    const existingCourse = await ctx.db
      .query("courses")
      .withIndex("byCourseId", (q) => q.eq("courseId", args.courseId))
      .first();

    const courseData = {
      courseId: args.courseId,
      courseName: args.courseName,
      description: args.description,
      maxScore: args.maxScore,
      criteria: args.criteria,
      isActive: args.isActive ?? true,
      updatedAt: Date.now(),
    };

    if (existingCourse) {
      await ctx.db.patch(existingCourse._id, courseData);
      return existingCourse._id;
    } else {
      const courseId = await ctx.db.insert("courses", {
        ...courseData,
        createdAt: Date.now(),
      });
      return courseId;
    }
  },
});

// Initialize default courses
export const initializeDefaultCourses = mutation({
  handler: async (ctx) => {
    const defaultCourses = [
      {
        courseId: "data-engineering",
        courseName: "Data Engineering Zoomcamp",
        description: "Comprehensive data engineering course covering pipelines, infrastructure, and best practices",
        maxScore: 100,
        criteria: [
          {
            name: "Data Pipeline Architecture",
            description: "Evaluate the overall design and structure of data pipelines",
            maxScore: 25,
            weight: 0.25,
          },
          {
            name: "Data Processing Logic",
            description: "Assess the quality and efficiency of data transformation code",
            maxScore: 25,
            weight: 0.25,
          },
          {
            name: "Infrastructure as Code",
            description: "Review Terraform, Docker, or other IaC implementations",
            maxScore: 20,
            weight: 0.20,
          },
          {
            name: "Data Quality & Testing",
            description: "Check for data validation, testing, and quality assurance",
            maxScore: 15,
            weight: 0.15,
          },
          {
            name: "Documentation & README",
            description: "Evaluate project documentation and setup instructions",
            maxScore: 15,
            weight: 0.15,
          },
        ],
        isActive: true,
      },
      {
        courseId: "machine-learning",
        courseName: "Machine Learning Zoomcamp",
        description: "Machine learning course focusing on practical ML implementation and deployment",
        maxScore: 100,
        criteria: [
          {
            name: "Model Development",
            description: "Evaluate model selection, training, and validation approaches",
            maxScore: 30,
            weight: 0.30,
          },
          {
            name: "Data Preprocessing",
            description: "Assess data cleaning, feature engineering, and preparation",
            maxScore: 20,
            weight: 0.20,
          },
          {
            name: "Model Evaluation",
            description: "Review metrics, validation strategies, and performance analysis",
            maxScore: 20,
            weight: 0.20,
          },
          {
            name: "Code Quality",
            description: "Evaluate code structure, modularity, and best practices",
            maxScore: 15,
            weight: 0.15,
          },
          {
            name: "Documentation & Reproducibility",
            description: "Check for clear documentation and reproducible results",
            maxScore: 15,
            weight: 0.15,
          },
        ],
        isActive: true,
      },
      {
        courseId: "llm-zoomcamp",
        courseName: "LLM Zoomcamp",
        description: "Large Language Models course covering LLM integration and applications",
        maxScore: 100,
        criteria: [
          {
            name: "LLM Integration",
            description: "Evaluate proper use of language models and APIs",
            maxScore: 30,
            weight: 0.30,
          },
          {
            name: "Prompt Engineering",
            description: "Assess prompt design and optimization techniques",
            maxScore: 25,
            weight: 0.25,
          },
          {
            name: "Application Architecture",
            description: "Review overall system design and structure",
            maxScore: 20,
            weight: 0.20,
          },
          {
            name: "User Experience",
            description: "Evaluate interface design and usability",
            maxScore: 15,
            weight: 0.15,
          },
          {
            name: "Documentation & Setup",
            description: "Check for clear instructions and documentation",
            maxScore: 10,
            weight: 0.10,
          },
        ],
        isActive: true,
      },
      {
        courseId: "mlops",
        courseName: "MLOps Zoomcamp",
        description: "MLOps course focusing on ML operations, deployment, and monitoring",
        maxScore: 100,
        criteria: [
          {
            name: "CI/CD Pipeline",
            description: "Evaluate automated testing, building, and deployment",
            maxScore: 25,
            weight: 0.25,
          },
          {
            name: "Model Monitoring",
            description: "Assess monitoring, logging, and alerting systems",
            maxScore: 25,
            weight: 0.25,
          },
          {
            name: "Infrastructure Management",
            description: "Review containerization, orchestration, and scaling",
            maxScore: 20,
            weight: 0.20,
          },
          {
            name: "Model Versioning",
            description: "Check for proper model and data versioning",
            maxScore: 15,
            weight: 0.15,
          },
          {
            name: "Documentation & Best Practices",
            description: "Evaluate adherence to MLOps best practices",
            maxScore: 15,
            weight: 0.15,
          },
        ],
        isActive: true,
      },
      {
        courseId: "stock-markets",
        courseName: "Stock Markets Analytics Zoomcamp",
        description: "Stock markets course covering trading strategies and financial analysis",
        maxScore: 100,
        criteria: [
          {
            name: "Trading Strategy Implementation",
            description: "Evaluate trading logic and strategy development",
            maxScore: 30,
            weight: 0.30,
          },
          {
            name: "Data Analysis & Visualization",
            description: "Assess market data analysis and visualization",
            maxScore: 25,
            weight: 0.25,
          },
          {
            name: "Risk Management",
            description: "Review risk assessment and management techniques",
            maxScore: 20,
            weight: 0.20,
          },
          {
            name: "Backtesting & Validation",
            description: "Check for proper strategy testing and validation",
            maxScore: 15,
            weight: 0.15,
          },
          {
            name: "Documentation & Results",
            description: "Evaluate documentation and result presentation",
            maxScore: 10,
            weight: 0.10,
          },
        ],
        isActive: true,
      },
    ];

    // Check if courses already exist
    const existingCourses = await ctx.db.query("courses").collect();
    if (existingCourses.length > 0) {
      return { message: "Courses already initialized", count: existingCourses.length };
    }

    // Insert all default courses
    const insertedIds = [];
    for (const course of defaultCourses) {
      const courseId = await ctx.db.insert("courses", {
        ...course,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      insertedIds.push(courseId);
    }

    return { message: "Default courses initialized", count: insertedIds.length, ids: insertedIds };
  },
});
