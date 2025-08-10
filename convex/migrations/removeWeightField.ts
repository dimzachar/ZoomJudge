import { internalMutation } from "../_generated/server";

// Migration to remove weight field from existing course criteria and update to new rubrics
export const removeWeightFieldAndUpdateCriteria = internalMutation({
  handler: async (ctx) => {
    console.log("Starting migration: removing weight field and updating criteria...");
    
    // Get all existing courses
    const existingCourses = await ctx.db.query("courses").collect();
    console.log(`Found ${existingCourses.length} existing courses to migrate`);
    
    // Delete all existing courses to start fresh with new schema-compliant data
    for (const course of existingCourses) {
      console.log(`Deleting old course: ${course.courseId}`);
      await ctx.db.delete(course._id);
    }
    
    // Now create the new courses with the correct schema and criteria from docs
    const newCourses = [
      {
        courseId: "data-engineering",
        courseName: "Data Engineering Zoomcamp",
        description: "Comprehensive data engineering course covering pipelines, infrastructure, and best practices",
        maxScore: 28,
        rubricVersion: 1,
        criteria: [
          {
            name: "Problem description",
            description: "0 points: Problem is not described, 2 points: Problem is described but shortly or not clearly, 4 points: Problem is well described and it's clear what the problem the project solves",
            maxScore: 4,
          },
          {
            name: "Cloud",
            description: "0 points: Cloud is not used, things run only locally, 2 points: The project is developed in the cloud, 4 points: The project is developed in the cloud and IaC tools are used",
            maxScore: 4,
          },
          {
            name: "Data ingestion",
            description: "Batch: 0 points: No workflow orchestration, 2 points: Partial workflow orchestration, 4 points: End-to-end pipeline. Stream: 0 points: No streaming system, 2 points: Simple pipeline, 4 points: Using consumer/producers and streaming technologies",
            maxScore: 4,
          },
          {
            name: "Data warehouse",
            description: "0 points: No DWH is used, 2 points: Tables are created in DWH but not optimized, 4 points: Tables are partitioned and clustered in a way that makes sense for the upstream queries",
            maxScore: 4,
          },
          {
            name: "Transformations",
            description: "0 points: No transformations, 2 points: Simple SQL transformation (no dbt or similar tools), 4 points: Transformations are defined with dbt, Spark or similar technologies",
            maxScore: 4,
          },
          {
            name: "Dashboard",
            description: "0 points: No dashboard, 2 points: A dashboard with 1 tile, 4 points: A dashboard with 2 tiles",
            maxScore: 4,
          },
          {
            name: "Reproducibility",
            description: "0 points: No instructions how to run the code at all, 2 points: Some instructions are there but they are not complete, 4 points: Instructions are clear, it's easy to run the code, and the code works",
            maxScore: 4,
          },
        ],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    // Insert all new courses
    const insertedIds = [];
    for (const course of newCourses) {
      console.log(`Creating new course: ${course.courseId}`);
      const courseId = await ctx.db.insert("courses", course);
      insertedIds.push(courseId);
    }

    console.log(`Migration completed! Recreated ${insertedIds.length} courses with new schema.`);
    return { 
      message: "Migration completed successfully", 
      recreatedCourses: insertedIds.length,
      courseIds: newCourses.map(c => c.courseId)
    };
  },
});
