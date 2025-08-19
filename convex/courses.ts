import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

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
    })),
    rubricVersion: v.optional(v.number()),
    promptTemplate: v.optional(v.string()),
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
      rubricVersion: args.rubricVersion ?? 1,
      promptTemplate: args.promptTemplate,
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
        maxScore: 30,
        rubricVersion: 1,
        criteria: [
          {
            name: "Problem description",
            description: "0: The problem is not described, 1: The problem is described but shortly or not clearly, 2: The problem is well described and it's clear what the problem the project solves",
            maxScore: 2,
          },
          {
            name: "Cloud",
            description: "0: Cloud is not used, things run only locally, 2: The project is developed in the cloud, 4: The project is developed in the cloud and IaC tools are used",
            maxScore: 4,
          },
          {
            name: "Data Ingestion: Batch / Workflow orchestration",
            description: "0: No workflow orchestration, 2: Partial workflow orchestration: some steps are orchestrated, some run manually, 4: End-to-end pipeline: multiple steps in the DAG, uploading data to data lake",
            maxScore: 4,
          },
          {
            name: "Data Ingestion: Stream",
            description: "0: No streaming system (like Kafka, Pulsar, etc), 2: A simple pipeline with one consumer and one producer, 4: Using consumer/producers and streaming technologies (like Kafka streaming, Spark streaming, Flink, etc)",
            maxScore: 4,
          },
          {
            name: "Data warehouse",
            description: "0: No DWH is used, 2: Tables are created in DWH, but not optimized, 4: Tables are partitioned and clustered in a way that makes sense for the upstream queries (with explanation)",
            maxScore: 4,
          },
          {
            name: "Transformations (dbt, spark, etc)",
            description: "0: No transformations, 2: Simple SQL transformation (no dbt or similar tools), 4: Transformations are defined with dbt, Spark or similar technologies",
            maxScore: 4,
          },
          {
            name: "Dashboard",
            description: "0: No dashboard, 2: A dashboard with 1 tile, 4: A dashboard with 2 tiles",
            maxScore: 4,
          },
          {
            name: "Reproducibility",
            description: "0: No instructions how to run the code at all, 2: Some instructions are there, but they are not complete, 4: Instructions are clear, it's easy to run the code, and the code works",
            maxScore: 4,
          },
        ],
        isActive: true,
      },
      {
        courseId: "machine-learning",
        courseName: "Machine Learning Zoomcamp",
        description: "Machine learning course focusing on practical ML implementation and deployment",
        maxScore: 16,
        rubricVersion: 1,
        criteria: [
          {
            name: "Problem description",
            description: "0 points: Problem is not described, 1 point: Problem is described in README briefly without much details, 2 points: Problem is described in README with enough context, so it's clear what the problem is and how the solution will be used",
            maxScore: 2,
          },
          {
            name: "EDA",
            description: "0 points: No EDA, 1 point: Basic EDA (looking at min-max values, checking for missing values), 2 points: Extensive EDA (ranges of values, missing values, analysis of target variable, feature importance analysis)",
            maxScore: 2,
          },
          {
            name: "Model training",
            description: "0 points: No model training, 1 point: Trained only one model no parameter tuning, 2 points: Trained multiple models (linear and tree-based), 3 points: Trained multiple models and tuned their parameters",
            maxScore: 3,
          },
          {
            name: "Exporting notebook to script",
            description: "0 points: No script for training a model, 1 point: The logic for training the model is exported to a separate script",
            maxScore: 1,
          },
          {
            name: "Reproducibility",
            description: "0 points: Not possible to execute the notebook and the training script. Data is missing or it's not easily accessible, 1 point: It's possible to re-execute the notebook and the training script without errors. The dataset is committed in the project repository or there are clear instructions on how to download the data",
            maxScore: 1,
          },
          {
            name: "Model deployment",
            description: "0 points: Model is not deployed, 1 point: Model is deployed (with Flask, BentoML or a similar framework)",
            maxScore: 1,
          },
          {
            name: "Dependency and environment management",
            description: "0 points: No dependency management, 1 point: Provided a file with dependencies (requirements.txt, pipfile, bentofile.yaml with dependencies, etc), 2 points: Provided a file with dependencies and used virtual environment. README says how to install the dependencies and how to activate the env",
            maxScore: 2,
          },
          {
            name: "Containerization",
            description: "0 points: No containerization, 1 point: Dockerfile is provided or a tool that creates a docker image is used, 2 points: The application is containerized and the README describes how to build a container and how to run it",
            maxScore: 2,
          },
          {
            name: "Cloud deployment",
            description: "0 points: No deployment to the cloud, 1 point: Docs describe clearly (with code) how to deploy the service to cloud or kubernetes cluster, 2 points: There's code for deployment to cloud or kubernetes cluster. There's a URL for testing - or video/screenshot of testing it",
            maxScore: 2,
          },
        ],
        isActive: true,
      },
      {
        courseId: "llm-zoomcamp",
        courseName: "LLM Zoomcamp",
        description: "Large Language Models course covering LLM integration and applications with RAG systems",
        maxScore: 26,
        rubricVersion: 1,
        criteria: [
          {
            name: "Problem description",
            description: "0 points: The problem is not described, 1 point: The problem is described but briefly or unclearly, 2 points: The problem is well-described and it's clear what problem the project solves",
            maxScore: 2,
          },
          {
            name: "Retrieval flow",
            description: "0 points: No knowledge base or LLM is used, 1 point: No knowledge base is used and the LLM is queried directly, 2 points: Both a knowledge base and an LLM are used in the flow",
            maxScore: 2,
          },
          {
            name: "Retrieval evaluation",
            description: "0 points: No evaluation of retrieval is provided, 1 point: Only one retrieval approach is evaluated, 2 points: Multiple retrieval approaches are evaluated and the best one is used",
            maxScore: 2,
          },
          {
            name: "LLM evaluation",
            description: "0 points: No evaluation of final LLM output is provided, 1 point: Only one approach (e.g. one prompt) is evaluated, 2 points: Multiple approaches are evaluated and the best one is used",
            maxScore: 2,
          },
          {
            name: "Interface",
            description: "0 points: No way to interact with the application at all, 1 point: Command line interface a script or a Jupyter notebook, 2 points: UI (e.g. Streamlit) web application (e.g. Django) or an API (e.g. built with FastAPI)",
            maxScore: 2,
          },
          {
            name: "Ingestion pipeline",
            description: "0 points: No ingestion, 1 point: Semi-automated ingestion of the dataset into the knowledge base e.g. with a Jupyter notebook, 2 points: Automated ingestion with a Python script or a special tool (e.g. Mage dlt Airflow Prefect)",
            maxScore: 2,
          },
          {
            name: "Monitoring",
            description: "0 points: No monitoring, 1 point: User feedback is collected OR there's a monitoring dashboard, 2 points: User feedback is collected and there's a dashboard with at least 5 charts",
            maxScore: 2,
          },
          {
            name: "Containerization",
            description: "0 points: No containerization, 1 point: Dockerfile is provided for the main application OR there's a docker-compose for the dependencies only, 2 points: Everything is in docker-compose",
            maxScore: 2,
          },
          {
            name: "Reproducibility",
            description: "0 points: No instructions on how to run the code the data is missing or it's unclear how to access it, 1 point: Some instructions are provided but are incomplete OR instructions are clear and complete the code works but the data is missing, 2 points: Instructions are clear the dataset is accessible it's easy to run the code and it works. The versions for all dependencies are specified",
            maxScore: 2,
          },
          {
            name: "Best practices",
            description: "Hybrid search: combining both text and vector search (at least evaluating it) (1 point), Document re-ranking (1 point), User query rewriting (1 point). Total 3 points possible.",
            maxScore: 3,
          },
          {
            name: "Bonus points",
            description: "Deployment to the cloud (2 points), Up to 3 extra bonus points if you want to award for something extra (write in feedback for what). Total 5 points possible.",
            maxScore: 5,
          },
        ],
        isActive: true,
      },
      {
        courseId: "mlops",
        courseName: "MLOps Zoomcamp",
        description: "MLOps course focusing on ML operations, deployment, and monitoring",
        maxScore: 33,
        rubricVersion: 1,
        criteria: [
          {
            name: "Problem description",
            description: "0 points: The problem is not described, 1 point: The problem is described but shortly or not clearly, 2 points: The problem is well described and it's clear what the problem the project solves",
            maxScore: 2,
          },
          {
            name: "Cloud",
            description: "0 points: Cloud is not used things run only locally, 2 points: The project is developed on the cloud OR uses localstack (or similar tool) OR the project is deployed to Kubernetes or similar container management platforms, 4 points: The project is developed on the cloud and IaC tools are used for provisioning the infrastructure",
            maxScore: 4,
          },
          {
            name: "Experiment tracking and model registry",
            description: "0 points: No experiment tracking or model registry, 2 points: Experiments are tracked or models are registered in the registry, 4 points: Both experiment tracking and model registry are used",
            maxScore: 4,
          },
          {
            name: "Workflow orchestration",
            description: "0 points: No workflow orchestration, 2 points: Basic workflow orchestration, 4 points: Fully deployed workflow",
            maxScore: 4,
          },
          {
            name: "Model deployment",
            description: "0 points: Model is not deployed, 2 points: Model is deployed but only locally, 4 points: The model deployment code is containerized and could be deployed to cloud or special tools for model deployment are used",
            maxScore: 4,
          },
          {
            name: "Model monitoring",
            description: "0 points: No model monitoring, 2 points: Basic model monitoring that calculates and reports metrics, 4 points: Comprehensive model monitoring that sends alerts or runs a conditional workflow if the defined metrics threshold is violated",
            maxScore: 4,
          },
          {
            name: "Reproducibility",
            description: "0 points: No instructions on how to run the code at all the data is missing, 2 points: Some instructions are there but they are not complete OR instructions are clear and complete the code works but the data is missing, 4 points: Instructions are clear it's easy to run the code and it works. The versions for all the dependencies are specified",
            maxScore: 4,
          },
          {
            name: "Best practices",
            description: "There are unit tests (1 point), There is an integration test (1 point), Linter and/or code formatter are used (1 point), There's a Makefile (1 point), There are pre-commit hooks (1 point), There's a CI/CD pipeline (2 points). Total 7 points possible.",
            maxScore: 7,
          },
        ],
        isActive: true,
      },
      {
        courseId: "stock-markets",
        courseName: "Stock Markets Analytics Zoomcamp",
        description: "Stock markets course covering trading strategies and financial analysis",
        maxScore: 36,
        rubricVersion: 1,
        criteria: [
          {
            name: "Problem Description",
            description: "1 point: Problem is described in README briefly without much detail, 1 point: Problem is described in README with enough context and the end goal, 1 point: New problem definition (not just the current setup), 1 point: State-of-the-art clear description of each step and findings. Total 4 points possible.",
            maxScore: 4,
          },
          {
            name: "Data Sources",
            description: "1 point: Use the data sources and features from the lectures, 1 point: 20+ new features with description, 1 point: New data source is introduced, 1 point: Large dataset with >1 million records. Total 4 points possible.",
            maxScore: 4,
          },
          {
            name: "Data Transformations + EDA",
            description: "1 point: Data is combined into one data frame. Feature sets are defined, 1 point: New relevant features are generated from transformations (at least 5), 1 point: Exploratory Data Analysis. Total 3 points possible.",
            maxScore: 3,
          },
          {
            name: "Modeling",
            description: "1 point: One model from the lecture is used, 1 point: More than one model from the lecture is used, 1 point: Custom decision rules on target higher probability events, 1 point: Hyperparameter tuning is used, 1 point: New models are introduced. Total 5 points possible.",
            maxScore: 5,
          },
          {
            name: "Trading Simulation",
            description: "1 point: Vector simulations for at least 1 strategy, 1 point: Two or more strategies are covered, 1 point: Exact simulations with reinvestment, 1 point: Profitability discussion vs benchmark, 1 point: Best strategy has advanced features, 1 point: New strategy introduced, 1 point: Exceptional profitability, 1 point: Deep exploratory analysis. Total 8 points possible.",
            maxScore: 8,
          },
          {
            name: "Automation",
            description: "1 point: All notebooks are exported to scripts, 1 point: Dependencies are managed, 1 point: Full system can be re-run via Cron job, 1 point: Two regimes for the system, 1 point: Incremental data loading/transformations. Total 5 points possible.",
            maxScore: 5,
          },
          {
            name: "Bonus points",
            description: "1 point: Code is well designed and commented, 1 point: Additional code to place bets through Broker's API, 1 point: Additional code for monitoring models, 1 point: Containerization, 1 point: Cloud deployment, 1-2 points: Subjective bonus points. Total 7 points possible.",
            maxScore: 7,
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

// Internal version for setup
export const initializeDefaultCoursesInternal = internalMutation({
  handler: async (ctx) => {
    // Check if courses already exist
    const existingCourses = await ctx.db.query("courses").collect();
    if (existingCourses.length > 0) {
      return { message: "Courses already initialized", count: existingCourses.length };
    }

    // For internal setup, we only need the data engineering course
    const dataEngineeringCourse = {
      courseId: "data-engineering",
      courseName: "Data Engineering Zoomcamp",
      description: "Comprehensive data engineering course covering pipelines, infrastructure, and best practices",
      maxScore: 30,
      rubricVersion: 1,
      promptTemplate: `Please evaluate the following GitHub repository for the Data Engineering Zoomcamp course:

IMPORTANT EVALUATION GUIDELINES:

1. **Dashboard Evaluation**: Look for dashboard evidence in textual descriptions, not just code files. Dashboard information may be documented in:
   - README.md files describing dashboard tiles, visualizations, or BI tools
   - Documentation mentioning dashboard URLs, screenshots, or tile descriptions
   - References to dashboard tools like Metabase, Grafana, Tableau, Looker, etc.
   - Descriptions of data visualizations, charts, or reporting features

   Count the number of dashboard tiles/visualizations mentioned in the documentation. Even if only described textually, this counts as dashboard implementation.

2. **Cloud Infrastructure**: Look for cloud services usage, not just Infrastructure as Code (IaC) files. Cloud evidence includes:
   - Usage of cloud databases (Snowflake, BigQuery, Redshift)
   - Cloud messaging services (Confluent Cloud, AWS Kinesis, Google Pub/Sub)
   - Cloud storage (S3, GCS, Azure Blob)
   - Managed services mentioned in documentation

3. **Data Warehouse**: Consider cloud data warehouses and their optimization features:
   - Partitioning and clustering strategies described in documentation
   - Schema organization (raw, processed, reporting layers)
   - Query optimization techniques

4. **Workflow Orchestration**: Look for orchestration tools and DAG implementations:
   - Apache Airflow DAGs and task dependencies
   - Other orchestration tools (Prefect, Dagster, etc.)
   - Scheduled job descriptions

Repository URL: {repoUrl}

`,
      criteria: [
        {
          name: "Problem description",
          description: "0: The problem is not described, 1: The problem is described but shortly or not clearly, 2: The problem is well described and it's clear what the problem the project solves",
          maxScore: 2,
        },
        {
          name: "Cloud",
          description: "0: Cloud is not used, things run only locally, 2: The project is developed in the cloud, 4: The project is developed in the cloud and IaC tools are used",
          maxScore: 4,
        },
        {
          name: "Data Ingestion: Batch / Workflow orchestration",
          description: "0: No workflow orchestration, 2: Partial workflow orchestration: some steps are orchestrated, some run manually, 4: End-to-end pipeline: multiple steps in the DAG, uploading data to data lake",
          maxScore: 4,
        },
        {
          name: "Data Ingestion: Stream",
          description: "0: No streaming system (like Kafka, Pulsar, etc), 2: A simple pipeline with one consumer and one producer, 4: Using consumer/producers and streaming technologies (like Kafka streaming, Spark streaming, Flink, etc)",
          maxScore: 4,
        },
        {
          name: "Data warehouse",
          description: "0: No DWH is used, 2: Tables are created in DWH, but not optimized, 4: Tables are partitioned and clustered in a way that makes sense for the upstream queries (with explanation)",
          maxScore: 4,
        },
        {
          name: "Transformations (dbt, spark, etc)",
          description: "0: No transformations, 2: Simple SQL transformation (no dbt or similar tools), 4: Transformations are defined with dbt, Spark or similar technologies",
          maxScore: 4,
        },
        {
          name: "Dashboard",
          description: "0: No dashboard, 2: A dashboard with 1 tile, 4: A dashboard with 2 tiles",
          maxScore: 4,
        },
        {
          name: "Reproducibility",
          description: "0: No instructions how to run the code at all, 2: Some instructions are there, but they are not complete, 4: Instructions are clear, it's easy to run the code, and the code works",
          maxScore: 4,
        },
      ],
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Insert the data engineering course
    const courseId = await ctx.db.insert("courses", dataEngineeringCourse);

    return { message: "Default courses initialized", count: 1, ids: [courseId] };
  },
});
