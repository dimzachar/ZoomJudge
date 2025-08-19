/**
 * Complete Workflow Replacement - Replaces the original 4-stage workflow
 * with the Ultimate Hybrid Architecture
 */

import { UltimateHybridSelector } from '../core/UltimateHybridSelector';
import { NotebookAwareHybridSelector } from '../core/NotebookAwareHybridSelector';
import { GitHubRepoInfo, fetchRepoFile } from '../../github-validator';
import { evaluationLogger } from '../../simple-logger';
import { ConvexHttpClient } from 'convex/browser';

export interface WorkflowRequest {
  repoInfo: GitHubRepoInfo;
  courseId: string;
  courseName: string;
  userId?: string;
  evaluationId?: string;
}

export interface WorkflowResult {
  selectedFiles: string[];
  content: Record<string, string>;
  metadata: {
    method: string;
    confidence: number;
    processingTime: number;
    tierUsed: number;
    cacheHit: boolean;
    validationApplied?: boolean;
    totalFiles: number;
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  performance: {
    fileDiscoveryTime: number;
    selectionTime: number;
    contentFetchTime: number;
    totalTime: number;
  };
}

export class WorkflowReplacement {
  private hybridSelector: UltimateHybridSelector;
  private notebookAwareSelector: NotebookAwareHybridSelector | null = null;
  private convexClient: ConvexHttpClient | null;

  constructor(options?: { mockMode?: boolean; convexClient?: ConvexHttpClient }) {
    this.hybridSelector = new UltimateHybridSelector({
      mockMode: options?.mockMode || false,
      convexClient: options?.convexClient
    });
    
    // Initialize notebook-aware selector for courses that commonly use notebooks
    this.notebookAwareSelector = new NotebookAwareHybridSelector({
      mockMode: options?.mockMode || false,
      convexClient: options?.convexClient
    });
    
    this.convexClient = options?.convexClient || null;
  }

  /**
   * Complete workflow replacement - replaces getRepoStructure entirely
   */
  async processRepository(request: WorkflowRequest): Promise<WorkflowResult> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 Ultimate Hybrid Workflow - Processing repository');
      console.log(`   Repository: ${request.repoInfo.url}`);
      console.log(`   Course: ${request.courseName} (${request.courseId})`);
      console.log(`   Commit: ${request.repoInfo.commitHash}`);

      // Set evaluation ID for tracking
      if (request.evaluationId) {
        this.hybridSelector.setEvaluationId(request.evaluationId);
      }

      // Log workflow start
      await evaluationLogger.logGeneral(
        'HYBRID_WORKFLOW_START',
        'INFO',
        'Starting Ultimate Hybrid workflow',
        {
          repoUrl: request.repoInfo.url,
          courseId: request.courseId,
          evaluationId: request.evaluationId
        }
      );

      // Phase 1: Discover all repository files
      const discoveryStart = Date.now();
      const allFiles = await this.discoverRepositoryFiles(request.repoInfo);
      const fileDiscoveryTime = Date.now() - discoveryStart;

      console.log(`📁 File discovery completed: ${allFiles.length} files found`);

      if (allFiles.length === 0) {
        throw new Error('No files found in repository');
      }

      // Phase 2: Ultimate Hybrid file selection
      // Check if repository contains notebook files
      const hasNotebooks = allFiles.some(file => file.endsWith('.ipynb'));
      
      let content: Record<string, string>;
      let selectionResult: any;
      let selectionTime: number;
      let contentFetchTime: number;
      
      if (hasNotebooks && this.notebookAwareSelector) {
        // Use notebook-aware selector when notebooks are present
        console.log('🧠 Using notebook-aware selector for repository with notebooks');
        
        const selectionStart = Date.now();
        const notebookAwareResult = await this.notebookAwareSelector.selectFilesWithNotebookOptimization(
          {
            repoUrl: request.repoInfo.url,
            courseId: request.courseId,
            courseName: request.courseName,
            criteria: await this.getCriteriaForCourse(request.courseId),
            files: allFiles,
            maxFiles: 50,
            repoInfo: request.repoInfo
          },
          {
            courseId: request.courseId,
            courseName: request.courseName
          }
        );
        selectionTime = Date.now() - selectionStart;
        
        selectionResult = {
          selectedFiles: notebookAwareResult.selectedFiles,
          method: 'ai_guided',
          confidence: notebookAwareResult.metadata.confidence,
          processingTime: notebookAwareResult.metadata.processingTime,
          tierUsed: notebookAwareResult.metadata.tierUsed,
          cacheHit: notebookAwareResult.metadata.cacheHit,
          validationApplied: notebookAwareResult.metadata.validationApplied,
          tokenUsage: notebookAwareResult.metadata.tokenUsage
        };
        
        // Use optimized content
        content = this.notebookAwareSelector.getContentMap(notebookAwareResult.optimizedFiles);
        contentFetchTime = notebookAwareResult.performance.optimizationTime || 0;
        
        console.log(`🎯 Notebook-aware selection completed: ${selectionResult.selectedFiles.length} files selected`);
        console.log(`   Token savings: ${notebookAwareResult.totalTokenSavings} tokens`);
      } else {
        // Use standard hybrid selector
        const selectionStart = Date.now();
        selectionResult = await this.hybridSelector.selectFiles({
          repoUrl: request.repoInfo.url,
          courseId: request.courseId,
          courseName: request.courseName,
          criteria: await this.getCriteriaForCourse(request.courseId),
          files: allFiles,
          maxFiles: 50
        });
        selectionTime = Date.now() - selectionStart;

        console.log(`🎯 File selection completed: ${selectionResult.selectedFiles.length} files selected`);
        console.log(`   Method: ${selectionResult.method} (Tier ${selectionResult.tierUsed})`);
        console.log(`   Confidence: ${(selectionResult.confidence * 100).toFixed(1)}%`);
        console.log(`   Cache hit: ${selectionResult.cacheHit || false}`);

        // Phase 3: Fetch content for selected files
        const fetchStart = Date.now();
        content = await this.fetchSelectedFilesContent(
          request.repoInfo,
          selectionResult.selectedFiles
        );
        contentFetchTime = Date.now() - fetchStart;
        console.log(`📄 Content fetching completed: ${Object.keys(content).length} files with content`);
      }

      const totalTime = Date.now() - startTime;

      // Log workflow completion
      await evaluationLogger.logGeneral(
        'HYBRID_WORKFLOW_COMPLETE',
        'INFO',
        'Ultimate Hybrid workflow completed',
        {
          selectedFiles: selectionResult.selectedFiles.length,
          totalFiles: allFiles.length,
          method: selectionResult.method,
          confidence: selectionResult.confidence,
          processingTime: totalTime,
          tierUsed: selectionResult.tierUsed,
          cacheHit: selectionResult.cacheHit
        }
      );

      return {
        selectedFiles: selectionResult.selectedFiles,
        content,
        metadata: {
          method: selectionResult.method,
          confidence: selectionResult.confidence,
          processingTime: selectionResult.processingTime,
          tierUsed: selectionResult.tierUsed,
          cacheHit: selectionResult.cacheHit || false,
          validationApplied: selectionResult.validationApplied,
          totalFiles: allFiles.length,
          tokenUsage: selectionResult.tokenUsage
        },
        performance: {
          fileDiscoveryTime,
          selectionTime,
          contentFetchTime,
          totalTime
        }
      };

    } catch (error) {
      console.error('Error in Ultimate Hybrid workflow:', error);
      
      // Log workflow error
      await evaluationLogger.logGeneral(
        'HYBRID_WORKFLOW_ERROR',
        'ERROR',
        'Ultimate Hybrid workflow failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          repoUrl: request.repoInfo.url,
          courseId: request.courseId
        }
      );

      throw error;
    }
  }

  /**
   * Discover all files in the repository
   */
  private async discoverRepositoryFiles(repoInfo: GitHubRepoInfo): Promise<string[]> {
    try {
      // Use GitHub API to get repository tree
      const response = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${repoInfo.commitHash}?recursive=1`,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'ZoomJudge-Bot/1.0',
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.tree || !Array.isArray(data.tree)) {
        throw new Error('Invalid repository tree structure');
      }

      // Extract file paths (exclude directories)
      const files = data.tree
        .filter((item: any) => item.type === 'blob')
        .map((item: any) => item.path)
        .filter((path: string) => path && typeof path === 'string');

      return files;

    } catch (error) {
      console.error('Error discovering repository files:', error);
      throw new Error(`Failed to discover repository files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch content for selected files
   */
  private async fetchSelectedFilesContent(
    repoInfo: GitHubRepoInfo,
    selectedFiles: string[]
  ): Promise<Record<string, string>> {
    const content: Record<string, string> = {};
    const maxConcurrent = 5; // Limit concurrent requests
    
    // Process files in batches to avoid rate limiting
    for (let i = 0; i < selectedFiles.length; i += maxConcurrent) {
      const batch = selectedFiles.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (filePath) => {
        try {
          const fileContent = await fetchRepoFile(repoInfo, filePath);
          if (fileContent) {
            content[filePath] = fileContent;
          }
        } catch (error) {
          console.warn(`Failed to fetch content for ${filePath}:`, error);
          // Continue with other files even if one fails
        }
      });

      await Promise.all(batchPromises);
    }

    return content;
  }

  /**
   * Get evaluation criteria for a course
   */
  private async getCriteriaForCourse(courseId: string): Promise<any[]> {
    // Fetch criteria from Convex database
    if (this.convexClient) {
      try {
        // Import the API
        const { api } = await import('../../../convex/_generated/api');
        
        // Query the courses table to get the course document
        const course = await this.convexClient.query(
          api.courses.getCourse,
          { courseId }
        );
        
        if (course && course.criteria) {
          console.log(`📚 Fetched ${course.criteria.length} criteria for course ${courseId} from Convex:`);
          console.log(`   Sample criteria: ${course.criteria.slice(0, 3).map((c: any) => c.name).join(', ')}`);
          // Return the criteria from the course document
          return course.criteria;
        } else {
          console.log(`⚠️  No criteria found for course ${courseId} in Convex, using fallback`);
        }
      } catch (error) {
        console.warn(`Failed to fetch criteria for course ${courseId} from Convex:`, error);
        // Fall back to hardcoded criteria if Convex query fails
      }
    }
    
    // Fallback to hardcoded criteria if Convex client is not available or query fails
    // This would typically fetch from database or configuration
    const criteriaMap: Record<string, any[]> = {
      'mlops': [
        {
          name: 'Problem description',
          description: '0 points: The problem is not described, 1 point: The problem is described but shortly or not clearly, 2 points: The problem is well described and it\'s clear what the problem the project solves',
          maxScore: 2
        },
        {
          name: 'Cloud',
          description: '0 points: Cloud is not used things run only locally, 2 points: The project is developed on the cloud OR uses localstack (or similar tool) OR the project is deployed to Kubernetes or similar container management platforms, 4 points: The project is developed on the cloud and IaC tools are used for provisioning the infrastructure',
          maxScore: 4
        },
        {
          name: 'Experiment tracking and model registry',
          description: '0 points: No experiment tracking or model registry, 2 points: Experiments are tracked or models are registered in the registry, 4 points: Both experiment tracking and model registry are used',
          maxScore: 4
        },
        {
          name: 'Workflow orchestration',
          description: '0 points: No workflow orchestration, 2 points: Basic workflow orchestration, 4 points: Fully deployed workflow',
          maxScore: 4
        },
        {
          name: 'Model deployment',
          description: '0 points: Model is not deployed, 2 points: Model is deployed but only locally, 4 points: The model deployment code is containerized and could be deployed to cloud or special tools for model deployment are used',
          maxScore: 4
        },
        {
          name: 'Model monitoring',
          description: '0 points: No model monitoring, 2 points: Basic model monitoring that calculates and reports metrics, 4 points: Comprehensive model monitoring that sends alerts or runs a conditional workflow if the defined metrics threshold is violated',
          maxScore: 4
        },
        {
          name: 'Reproducibility',
          description: '0 points: No instructions on how to run the code at all the data is missing, 2 points: Some instructions are there but they are not complete OR instructions are clear and complete the code works but the data is missing, 4 points: Instructions are clear it\'s easy to run the code and it works. The versions for all the dependencies are specified',
          maxScore: 4
        },
        {
          name: 'Best practices',
          description: 'There are unit tests (1 point), There is an integration test (1 point), Linter and/or code formatter are used (1 point), There\'s a Makefile (1 point), There are pre-commit hooks (1 point), There\'s a CI/CD pipeline (2 points). Total 7 points possible.',
          maxScore: 7
        }
      ],
      'data-engineering': [
        {
          name: 'Problem description',
          description: '0: The problem is not described, 1: The problem is described but shortly or not clearly, 2: The problem is well described and it\'s clear what the problem the project solves',
          maxScore: 2
        },
        {
          name: 'Cloud',
          description: '0: Cloud is not used, things run only locally, 2: The project is developed in the cloud, 4: The project is developed in the cloud and IaC tools are used',
          maxScore: 4
        },
        {
          name: 'Data Ingestion: Batch / Workflow orchestration',
          description: '0: No workflow orchestration, 2: Partial workflow orchestration: some steps are orchestrated, some run manually, 4: End-to-end pipeline: multiple steps in the DAG, uploading data to data lake',
          maxScore: 4
        },
        {
          name: 'Data Ingestion: Stream',
          description: '0: No streaming system (like Kafka, Pulsar, etc), 2: A simple pipeline with one consumer and one producer, 4: Using consumer/producers and streaming technologies (like Kafka streaming, Spark streaming, Flink, etc)',
          maxScore: 4
        },
        {
          name: 'Data warehouse',
          description: '0: No DWH is used, 2: Tables are created in DWH, but not optimized, 4: Tables are partitioned and clustered in a way that makes sense for the upstream queries (with explanation)',
          maxScore: 4
        },
        {
          name: 'Transformations (dbt, spark, etc)',
          description: '0: No transformations, 2: Simple SQL transformation (no dbt or similar tools), 4: Transformations are defined with dbt, Spark or similar technologies',
          maxScore: 4
        },
        {
          name: 'Dashboard',
          description: '0: No dashboard, 2: A dashboard with 1 tile, 4: A dashboard with 2 tiles',
          maxScore: 4
        },
        {
          name: 'Reproducibility',
          description: '0: No instructions how to run the code at all, 2: Some instructions are there, but they are not complete, 4: Instructions are clear, it\'s easy to run the code, and the code works',
          maxScore: 4
        }
      ],
      'llm-zoomcamp': [
        {
          name: 'Problem description',
          description: '0 points: The problem is not described, 1 point: The problem is described but briefly or unclearly, 2 points: The problem is well-described and it\'s clear what problem the project solves',
          maxScore: 2
        },
        {
          name: 'Retrieval flow',
          description: '0 points: No knowledge base or LLM is used, 1 point: No knowledge base is used and the LLM is queried directly, 2 points: Both a knowledge base and an LLM are used in the flow',
          maxScore: 2
        },
        {
          name: 'Retrieval evaluation',
          description: '0 points: No evaluation of retrieval is provided, 1 point: Only one retrieval approach is evaluated, 2 points: Multiple retrieval approaches are evaluated and the best one is used',
          maxScore: 2
        },
        {
          name: 'LLM evaluation',
          description: '0 points: No evaluation of final LLM output is provided, 1 point: Only one approach (e.g. one prompt) is evaluated, 2 points: Multiple approaches are evaluated and the best one is used',
          maxScore: 2
        },
        {
          name: 'Interface',
          description: '0 points: No way to interact with the application at all, 1 point: Command line interface a script or a Jupyter notebook, 2 points: UI (e.g. Streamlit) web application (e.g. Django) or an API (e.g. built with FastAPI)',
          maxScore: 2
        },
        {
          name: 'Ingestion pipeline',
          description: '0 points: No ingestion, 1 point: Semi-automated ingestion of the dataset into the knowledge base e.g. with a Jupyter notebook, 2 points: Automated ingestion with a Python script or a special tool (e.g. Mage dlt Airflow Prefect)',
          maxScore: 2
        },
        {
          name: 'Monitoring',
          description: '0 points: No monitoring, 1 point: User feedback is collected OR there\'s a monitoring dashboard, 2 points: User feedback is collected and there\'s a dashboard with at least 5 charts',
          maxScore: 2
        },
        {
          name: 'Containerization',
          description: '0 points: No containerization, 1 point: Dockerfile is provided for the main application OR there\'s a docker-compose for the dependencies only, 2 points: Everything is in docker-compose',
          maxScore: 2
        },
        {
          name: 'Reproducibility',
          description: '0 points: No instructions on how to run the code the data is missing or it\'s unclear how to access it, 1 point: Some instructions are provided but are incomplete OR instructions are clear and complete the code works but the data is missing, 2 points: Instructions are clear the dataset is accessible it\'s easy to run the code and it works. The versions for all dependencies are specified',
          maxScore: 2
        },
        {
          name: 'Best practices',
          description: 'Hybrid search: combining both text and vector search (at least evaluating it) (1 point), Document re-ranking (1 point), User query rewriting (1 point). Total 3 points possible.',
          maxScore: 3
        },
        {
          name: 'Bonus points',
          description: 'Deployment to the cloud (2 points), Up to 3 extra bonus points if you want to award for something extra (write in feedback for what). Total 5 points possible.',
          maxScore: 5
        }
      ],
      'machine-learning': [
        {
          name: 'Problem description',
          description: '0 points: Problem is not described, 1 point: Problem is described in README briefly without much details, 2 points: Problem is described in README with enough context, so it\'s clear what the problem is and how the solution will be used',
          maxScore: 2
        },
        {
          name: 'EDA',
          description: '0 points: No EDA, 1 point: Basic EDA (looking at min-max values, checking for missing values), 2 points: Extensive EDA (ranges of values, missing values, analysis of target variable, feature importance analysis)',
          maxScore: 2
        },
        {
          name: 'Model training',
          description: '0 points: No model training, 1 point: Trained only one model no parameter tuning, 2 points: Trained multiple models (linear and tree-based), 3 points: Trained multiple models and tuned their parameters',
          maxScore: 3
        },
        {
          name: 'Exporting notebook to script',
          description: '0 points: No script for training a model, 1 point: The logic for training the model is exported to a separate script',
          maxScore: 1
        },
        {
          name: 'Reproducibility',
          description: '0 points: Not possible to execute the notebook and the training script. Data is missing or it\'s not easily accessible, 1 point: It\'s possible to re-execute the notebook and the training script without errors. The dataset is committed in the project repository or there are clear instructions on how to download the data',
          maxScore: 1
        },
        {
          name: 'Model deployment',
          description: '0 points: Model is not deployed, 1 point: Model is deployed (with Flask, BentoML or a similar framework)',
          maxScore: 1
        },
        {
          name: 'Dependency and environment management',
          description: '0 points: No dependency management, 1 point: Provided a file with dependencies (requirements.txt, pipfile, bentofile.yaml with dependencies, etc), 2 points: Provided a file with dependencies and used virtual environment. README says how to install the dependencies and how to activate the env',
          maxScore: 2
        },
        {
          name: 'Containerization',
          description: '0 points: No containerization, 1 point: Dockerfile is provided or a tool that creates a docker image is used, 2 points: The application is containerized and the README describes how to build a container and how to run it',
          maxScore: 2
        },
        {
          name: 'Cloud deployment',
          description: '0 points: No deployment to the cloud, 1 point: Docs describe clearly (with code) how to deploy the service to cloud or kubernetes cluster, 2 points: There\'s code for deployment to cloud or kubernetes cluster. There\'s a URL for testing - or video/screenshot of testing it',
          maxScore: 2
        }
      ],
      'stock-markets': [
        {
          name: 'Problem Description',
          description: '1 point: Problem is described in README briefly without much detail, 1 point: Problem is described in README with enough context and the end goal, 1 point: New problem definition (not just the current setup), 1 point: State-of-the-art clear description of each step and findings. Total 4 points possible.',
          maxScore: 4
        },
        {
          name: 'Data Sources',
          description: '1 point: Use the data sources and features from the lectures, 1 point: 20+ new features with description, 1 point: New data source is introduced, 1 point: Large dataset with >1 million records. Total 4 points possible.',
          maxScore: 4
        },
        {
          name: 'Data Transformations + EDA',
          description: '1 point: Data is combined into one data frame. Feature sets are defined, 1 point: New relevant features are generated from transformations (at least 5), 1 point: Exploratory Data Analysis. Total 3 points possible.',
          maxScore: 3
        },
        {
          name: 'Modeling',
          description: '1 point: One model from the lecture is used, 1 point: More than one model from the lecture is used, 1 point: Custom decision rules on target higher probability events, 1 point: Hyperparameter tuning is used, 1 point: New models are introduced. Total 5 points possible.',
          maxScore: 5
        },
        {
          name: 'Trading Simulation',
          description: '1 point: Vector simulations for at least 1 strategy, 1 point: Two or more strategies are covered, 1 point: Exact simulations with reinvestment, 1 point: Profitability discussion vs benchmark, 1 point: Best strategy has advanced features, 1 point: New strategy introduced, 1 point: Exceptional profitability, 1 point: Deep exploratory analysis. Total 8 points possible.',
          maxScore: 8
        },
        {
          name: 'Automation',
          description: '1 point: All notebooks are exported to scripts, 1 point: Dependencies are managed, 1 point: Full system can be re-run via Cron job, 1 point: Two regimes for the system, 1 point: Incremental data loading/transformations. Total 5 points possible.',
          maxScore: 5
        },
        {
          name: 'Bonus points',
          description: '1 point: Code is well designed and commented, 1 point: Additional code to place bets through Broker\'s API, 1 point: Additional code for monitoring models, 1 point: Containerization, 1 point: Cloud deployment, 1-2 points: Subjective bonus points. Total 7 points possible.',
          maxScore: 7
        }
      ]
    };

    console.log(`📚 Using fallback criteria for course ${courseId}: ${criteriaMap[courseId]?.length || 0} criteria`);
    return criteriaMap[courseId] || [];
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats() {
    return await this.hybridSelector.getPerformanceStats();
  }

  /**
   * Get cache warming statistics
   */
  getCacheWarmingStats() {
    return this.hybridSelector.getCacheWarmingStats();
  }
}
