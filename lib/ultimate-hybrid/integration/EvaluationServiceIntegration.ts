/**
 * Integration layer between Ultimate Hybrid Architecture and current evaluation service
 * Enables A/B testing and gradual rollout
 */

import { UltimateHybridSelector, HybridSelectionRequest } from '../core/UltimateHybridSelector';
import { CriterionMapper, CourseCriterion } from '../core/CriterionMapper';
import { HYBRID_CONFIG } from '../config';
import { evaluationLogger } from '../../simple-logger';
import { ConfigurationService } from '../../config/ConfigurationService';
import { APIClientOptions } from '../../config/APIClientFactory';

export interface EvaluationRequest {
  repoUrl: string;
  courseId: string;
  userId?: string;
  evaluationId?: string;
}

export interface FileSelectionComparison {
  currentSystem: {
    selectedFiles: string[];
    processingTime: number;
    method: 'current_system';
  };
  hybridSystem: {
    selectedFiles: string[];
    processingTime: number;
    method: string;
    confidence: number;
    tokenUsage?: any;
    cacheHit?: boolean;
    tierUsed: number;
  };
  comparison: {
    fileOverlap: number;
    uniqueToHybrid: string[];
    uniqueToCurrent: string[];
    hybridAdvantages: string[];
  };
}

export interface ABTestConfig {
  enabled: boolean;
  hybridPercentage: number; // 0-100, percentage of traffic to route to hybrid
  comparisonMode: boolean; // If true, run both systems and compare
  logResults: boolean;
}

export class EvaluationServiceIntegration {
  private hybridSelector: UltimateHybridSelector;
  private criterionMapper: CriterionMapper;
  private abTestConfig: ABTestConfig;
  private configService: ConfigurationService;

  constructor(options?: APIClientOptions) {
    this.configService = ConfigurationService.getInstance(options);
    this.hybridSelector = new UltimateHybridSelector({
      mockMode: options?.mockMode || this.configService.isMockMode() || !this.configService.hasAPIKey()
    });
    this.criterionMapper = new CriterionMapper();
    this.abTestConfig = {
      enabled: false,
      hybridPercentage: 0,
      comparisonMode: true,
      logResults: true
    };
  }

  /**
   * Update A/B testing configuration
   */
  updateABTestConfig(config: Partial<ABTestConfig>) {
    this.abTestConfig = { ...this.abTestConfig, ...config };
    console.log('🧪 A/B Test config updated:', this.abTestConfig);
  }

  /**
   * Main entry point for file selection with A/B testing
   */
  async selectFilesWithABTest(
    request: EvaluationRequest,
    files: string[]
  ): Promise<{
    selectedFiles: string[];
    method: string;
    metadata: any;
  }> {
    // Set evaluation ID for tracking
    if (request.evaluationId) {
      this.hybridSelector.setEvaluationId(request.evaluationId);
    }

    // Determine if user should get hybrid system
    const useHybrid = this.shouldUseHybridSystem(request);

    if (this.abTestConfig.comparisonMode) {
      // Run both systems for comparison
      return await this.runComparisonMode(request, files, useHybrid);
    } else if (useHybrid) {
      // Use hybrid system only
      return await this.runHybridSystem(request, files);
    } else {
      // Use current system only
      return await this.runCurrentSystem(request, files);
    }
  }

  /**
   * Run both systems and compare results
   */
  private async runComparisonMode(
    request: EvaluationRequest,
    files: string[],
    primaryIsHybrid: boolean
  ): Promise<{
    selectedFiles: string[];
    method: string;
    metadata: any;
  }> {
    console.log('🔬 Running A/B comparison mode...');

    try {
      // Run both systems in parallel
      const [currentResult, hybridResult] = await Promise.all([
        this.runCurrentSystemInternal(request, files),
        this.runHybridSystemInternal(request, files)
      ]);

      // Generate comparison
      const comparison = this.generateComparison(currentResult, hybridResult);

      // Log comparison results
      if (this.abTestConfig.logResults) {
        await this.logComparisonResults(request, comparison);
      }

      // Return primary system result
      const primaryResult = primaryIsHybrid ? hybridResult : currentResult;
      
      return {
        selectedFiles: primaryResult.selectedFiles,
        method: primaryResult.method,
        metadata: {
          ...primaryResult,
          comparison,
          abTest: {
            primarySystem: primaryIsHybrid ? 'hybrid' : 'current',
            comparisonMode: true
          }
        }
      };

    } catch (error) {
      console.error('Error in comparison mode:', error);
      
      // Fallback to current system
      return await this.runCurrentSystem(request, files);
    }
  }

  /**
   * Run hybrid system only
   */
  private async runHybridSystem(
    request: EvaluationRequest,
    files: string[]
  ): Promise<{
    selectedFiles: string[];
    method: string;
    metadata: any;
  }> {
    const result = await this.runHybridSystemInternal(request, files);
    
    return {
      selectedFiles: result.selectedFiles,
      method: result.method,
      metadata: {
        ...result,
        abTest: {
          primarySystem: 'hybrid',
          comparisonMode: false
        }
      }
    };
  }

  /**
   * Run current system only
   */
  private async runCurrentSystem(
    request: EvaluationRequest,
    files: string[]
  ): Promise<{
    selectedFiles: string[];
    method: string;
    metadata: any;
  }> {
    const result = await this.runCurrentSystemInternal(request, files);
    
    return {
      selectedFiles: result.selectedFiles,
      method: result.method,
      metadata: {
        ...result,
        abTest: {
          primarySystem: 'current',
          comparisonMode: false
        }
      }
    };
  }

  /**
   * Internal method to run hybrid system
   */
  private async runHybridSystemInternal(
    request: EvaluationRequest,
    files: string[]
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Get course criteria
      const criteria = await this.getCriteriaForCourse(request.courseId);

      // Create hybrid selection request
      const hybridRequest: HybridSelectionRequest = {
        repoUrl: request.repoUrl,
        courseId: request.courseId,
        courseName: this.getCourseName(request.courseId),
        criteria,
        files,
        maxFiles: HYBRID_CONFIG.MAX_FILES_PER_EVALUATION
      };

      // Run hybrid selection
      const result = await this.hybridSelector.selectFiles(hybridRequest);

      return {
        selectedFiles: result.selectedFiles,
        processingTime: Date.now() - startTime,
        method: result.method,
        confidence: result.confidence,
        tokenUsage: result.tokenUsage,
        cacheHit: result.cacheHit,
        tierUsed: result.tierUsed,
        reasoning: result.reasoning
      };

    } catch (error) {
      console.error('Error in hybrid system:', error);
      throw error;
    }
  }

  /**
   * Internal method to run current system (simulated)
   */
  private async runCurrentSystemInternal(
    request: EvaluationRequest,
    files: string[]
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Simulate current system file selection using isKeyFile logic
      const selectedFiles = this.simulateCurrentSystemSelection(files);

      return {
        selectedFiles,
        processingTime: Date.now() - startTime,
        method: 'current_system'
      };

    } catch (error) {
      console.error('Error in current system simulation:', error);
      throw error;
    }
  }

  /**
   * Simulate current system file selection (based on isKeyFile patterns)
   */
  private simulateCurrentSystemSelection(files: string[]): string[] {
    // This simulates the current hardcoded isKeyFile logic
    const selectedFiles = new Set<string>();

    // Always include README
    const readme = files.find(f => /README\.(md|txt)$/i.test(f));
    if (readme) selectedFiles.add(readme);

    // Basic patterns from current system
    const patterns = [
      /requirements\.txt$/i,
      /package\.json$/i,
      /Dockerfile$/i,
      /docker-compose\.ya?ml$/i,
      /\.py$/i,
      /\.ipynb$/i,
      /\.sql$/i,
      /\.tf$/i
    ];

    for (const pattern of patterns) {
      const matches = files.filter(f => pattern.test(f));
      matches.slice(0, 3).forEach(f => selectedFiles.add(f));
      
      if (selectedFiles.size >= 20) break;
    }

    return Array.from(selectedFiles);
  }

  /**
   * Generate comparison between current and hybrid systems
   */
  private generateComparison(currentResult: any, hybridResult: any): FileSelectionComparison {
    const currentFiles = new Set<string>(currentResult.selectedFiles);
    const hybridFiles = new Set<string>(hybridResult.selectedFiles);

    const overlap = new Set([...currentFiles].filter(f => hybridFiles.has(f)));
    const uniqueToHybrid: string[] = [...hybridFiles].filter(f => !currentFiles.has(f));
    const uniqueToCurrent: string[] = [...currentFiles].filter(f => !hybridFiles.has(f));

    const fileOverlap = overlap.size / Math.max(currentFiles.size, hybridFiles.size);

    const hybridAdvantages = [];
    if (hybridResult.processingTime < currentResult.processingTime) {
      hybridAdvantages.push('faster_processing');
    }
    if (hybridResult.confidence > 0.8) {
      hybridAdvantages.push('high_confidence');
    }
    if (hybridResult.cacheHit) {
      hybridAdvantages.push('cache_hit');
    }
    if (hybridResult.tokenUsage && hybridResult.tokenUsage.totalTokens < 2000) {
      hybridAdvantages.push('low_token_usage');
    }

    return {
      currentSystem: currentResult,
      hybridSystem: hybridResult,
      comparison: {
        fileOverlap,
        uniqueToHybrid,
        uniqueToCurrent,
        hybridAdvantages
      }
    };
  }

  /**
   * Determine if user should get hybrid system based on A/B test config
   */
  private shouldUseHybridSystem(request: EvaluationRequest): boolean {
    if (!this.abTestConfig.enabled) return false;
    
    // Simple hash-based assignment for consistent user experience
    const hash = this.hashString(request.userId || request.repoUrl);
    const percentage = hash % 100;
    
    return percentage < this.abTestConfig.hybridPercentage;
  }

  /**
   * Simple string hash function for user assignment
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get criteria for a course (placeholder)
   */
  private async getCriteriaForCourse(courseId: string): Promise<CourseCriterion[]> {
    // This would normally fetch from database
    const mockCriteria: Record<string, CourseCriterion[]> = {
      'data-engineering': [
        { name: 'Problem description', description: '0: The problem is not described, 1: The problem is described but shortly or not clearly, 2: The problem is well described and it\'s clear what the problem the project solves', maxScore: 2 },
        { name: 'Cloud', description: '0: Cloud is not used, things run only locally, 2: The project is developed in the cloud, 4: The project is developed in the cloud and IaC tools are used', maxScore: 4 },
        { name: 'Data Ingestion: Batch / Workflow orchestration', description: '0: No workflow orchestration, 2: Partial workflow orchestration: some steps are orchestrated, some run manually, 4: End-to-end pipeline: multiple steps in the DAG, uploading data to data lake', maxScore: 4 },
        { name: 'Data Ingestion: Stream', description: '0: No streaming system (like Kafka, Pulsar, etc), 2: A simple pipeline with one consumer and one producer, 4: Using consumer/producers and streaming technologies (like Kafka streaming, Spark streaming, Flink, etc)', maxScore: 4 },
        { name: 'Data warehouse', description: '0: No DWH is used, 2: Tables are created in DWH, but not optimized, 4: Tables are partitioned and clustered in a way that makes sense for the upstream queries (with explanation)', maxScore: 4 },
        { name: 'Transformations (dbt, spark, etc)', description: '0: No transformations, 2: Simple SQL transformation (no dbt or similar tools), 4: Transformations are defined with dbt, Spark or similar technologies', maxScore: 4 },
        { name: 'Dashboard', description: '0: No dashboard, 2: A dashboard with 1 tile, 4: A dashboard with 2 tiles', maxScore: 4 },
        { name: 'Reproducibility', description: '0: No instructions how to run the code at all, 2: Some instructions are there, but they are not complete, 4: Instructions are clear, it\'s easy to run the code, and the code works', maxScore: 4 }
      ],
      'machine-learning': [
        { name: 'Problem description', description: 'Clear problem description', maxScore: 2 },
        { name: 'EDA', description: 'Exploratory data analysis', maxScore: 2 },
        { name: 'Model training', description: 'Model training implementation', maxScore: 3 },
        { name: 'Exporting notebook to script', description: 'Script export', maxScore: 1 },
        { name: 'Reproducibility', description: 'Reproducible setup', maxScore: 2 },
        { name: 'Model deployment', description: 'Model deployment', maxScore: 2 },
        { name: 'Monitoring', description: 'Model monitoring', maxScore: 2 },
        { name: 'Best practices', description: 'Code quality and testing', maxScore: 2 }
      ],
      'llm-zoomcamp': [
        { name: 'Problem description', description: '0 points: The problem is not described, 1 point: The problem is described but briefly or unclearly, 2 points: The problem is well-described and it\'s clear what problem the project solves', maxScore: 2 },
        { name: 'Retrieval flow', description: '0 points: No knowledge base or LLM is used, 1 point: No knowledge base is used and the LLM is queried directly, 2 points: Both a knowledge base and an LLM are used in the flow', maxScore: 2 },
        { name: 'Retrieval evaluation', description: '0 points: No evaluation of retrieval is provided, 1 point: Only one retrieval approach is evaluated, 2 points: Multiple retrieval approaches are evaluated and the best one is used', maxScore: 2 },
        { name: 'LLM evaluation', description: '0 points: No evaluation of final LLM output is provided, 1 point: Only one approach (e.g. one prompt) is evaluated, 2 points: Multiple approaches are evaluated and the best one is used', maxScore: 2 },
        { name: 'Interface', description: '0 points: No way to interact with the application at all, 1 point: Command line interface a script or a Jupyter notebook, 2 points: UI (e.g. Streamlit) web application (e.g. Django) or an API (e.g. built with FastAPI)', maxScore: 2 },
        { name: 'Ingestion pipeline', description: '0 points: No ingestion, 1 point: Semi-automated ingestion of the dataset into the knowledge base e.g. with a Jupyter notebook, 2 points: Automated ingestion with a Python script or a special tool (e.g. Mage dlt Airflow Prefect)', maxScore: 2 },
        { name: 'Monitoring', description: '0 points: No monitoring, 1 point: User feedback is collected OR there\'s a monitoring dashboard, 2 points: User feedback is collected and there\'s a dashboard with at least 5 charts', maxScore: 2 },
        { name: 'Containerization', description: '0 points: No containerization, 1 point: Dockerfile is provided for the main application OR there\'s a docker-compose for the dependencies only, 2 points: Everything is in docker-compose', maxScore: 2 },
        { name: 'Reproducibility', description: '0 points: No instructions on how to run the code the data is missing or it\'s unclear how to access it, 1 point: Some instructions are provided but are incomplete OR instructions are clear and complete the code works but the data is missing, 2 points: Instructions are clear the dataset is accessible it\'s easy to run the code and it works. The versions for all dependencies are specified', maxScore: 2 },
        { name: 'Best practices', description: 'Hybrid search: combining both text and vector search (at least evaluating it) (1 point), Document re-ranking (1 point), User query rewriting (1 point). Total 3 points possible.', maxScore: 3 },
        { name: 'Bonus points', description: 'Deployment to the cloud (2 points), Up to 3 extra bonus points if you want to award for something extra (write in feedback for what). Total 5 points possible.', maxScore: 5 }
      ],
      'mlops': [
        { name: 'Problem description', description: 'Clear problem description', maxScore: 2 },
        { name: 'Workflow orchestration', description: 'Pipeline orchestration', maxScore: 4 },
        { name: 'Model deployment', description: 'Model deployment implementation', maxScore: 4 },
        { name: 'Model monitoring', description: 'Monitoring and alerting', maxScore: 4 },
        { name: 'Reproducibility', description: 'Reproducible setup', maxScore: 4 },
        { name: 'Best practices', description: 'Code quality and testing', maxScore: 4 }
      ],
      'stock-markets': [
        { name: 'Problem description', description: 'Clear problem description', maxScore: 4 },
        { name: 'Data ingestion', description: 'Market data ingestion', maxScore: 4 },
        { name: 'Backtesting', description: 'Strategy backtesting', maxScore: 4 },
        { name: 'Automation', description: 'Trading automation', maxScore: 5 },
        { name: 'Bonus points', description: 'Additional features', maxScore: 7 }
      ]
    };

    return mockCriteria[courseId] || [];
  }

  /**
   * Get course name from ID
   */
  private getCourseName(courseId: string): string {
    const names: Record<string, string> = {
      'data-engineering': 'Data Engineering Zoomcamp',
      'machine-learning': 'Machine Learning Zoomcamp',
      'llm-zoomcamp': 'LLM Zoomcamp',
      'mlops': 'MLOps Zoomcamp',
      'stock-markets': 'Stock Markets Analytics Zoomcamp'
    };

    return names[courseId] || courseId;
  }

  /**
   * Log comparison results for analysis
   */
  private async logComparisonResults(
    request: EvaluationRequest,
    comparison: FileSelectionComparison
  ): Promise<void> {
    await evaluationLogger.logGeneral(
      'AB_TEST_COMPARISON',
      'INFO',
      'A/B test comparison completed',
      {
        repoUrl: request.repoUrl,
        courseId: request.courseId,
        fileOverlap: comparison.comparison.fileOverlap,
        hybridAdvantages: comparison.comparison.hybridAdvantages,
        currentFiles: comparison.currentSystem.selectedFiles.length,
        hybridFiles: comparison.hybridSystem.selectedFiles.length,
        hybridMethod: comparison.hybridSystem.method,
        hybridTier: comparison.hybridSystem.tierUsed,
        processingTimeDiff: comparison.hybridSystem.processingTime - comparison.currentSystem.processingTime
      }
    );
  }

  /**
   * Get A/B test statistics
   */
  getABTestStats() {
    return {
      config: this.abTestConfig,
      cacheStats: this.hybridSelector.getCacheStats()
    };
  }
}
