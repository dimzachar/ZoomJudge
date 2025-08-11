/**
 * Integration layer between Ultimate Hybrid Architecture and current evaluation service
 * Enables A/B testing and gradual rollout
 */

import { UltimateHybridSelector, HybridSelectionRequest } from '../core/UltimateHybridSelector';
import { CriterionMapper, CourseCriterion } from '../core/CriterionMapper';
import { HYBRID_CONFIG } from '../config';
import { evaluationLogger } from '../../simple-logger';

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

  constructor(options?: { mockMode?: boolean }) {
    this.hybridSelector = new UltimateHybridSelector({ mockMode: options?.mockMode });
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
      const selectedFiles = this.simulateCurrentSystemSelection(files, request.courseId);

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
  private simulateCurrentSystemSelection(files: string[], courseId: string): string[] {
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
    const currentFiles = new Set(currentResult.selectedFiles);
    const hybridFiles = new Set(hybridResult.selectedFiles);

    const overlap = new Set([...currentFiles].filter(f => hybridFiles.has(f)));
    const uniqueToHybrid = [...hybridFiles].filter(f => !currentFiles.has(f));
    const uniqueToCurrent = [...currentFiles].filter(f => !hybridFiles.has(f));

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
      'mlops': [
        { name: 'Problem description', description: 'Clear problem description', maxScore: 2 },
        { name: 'Workflow orchestration', description: 'Pipeline orchestration', maxScore: 4 },
        { name: 'Model deployment', description: 'Model deployment implementation', maxScore: 4 },
        { name: 'Model monitoring', description: 'Monitoring and alerting', maxScore: 4 },
        { name: 'Reproducibility', description: 'Reproducible setup', maxScore: 4 },
        { name: 'Best practices', description: 'Code quality and testing', maxScore: 4 }
      ],
      'data-engineering': [
        { name: 'Problem description', description: 'Clear problem description', maxScore: 4 },
        { name: 'Cloud', description: 'Cloud infrastructure', maxScore: 4 },
        { name: 'Data ingestion', description: 'Data ingestion pipeline', maxScore: 4 },
        { name: 'Data warehouse', description: 'Data warehouse implementation', maxScore: 4 },
        { name: 'Transformations', description: 'Data transformations', maxScore: 4 },
        { name: 'Dashboard', description: 'Data visualization', maxScore: 4 }
      ],
      'llm-zoomcamp': [
        { name: 'Problem description', description: 'Clear problem description', maxScore: 2 },
        { name: 'Retrieval flow', description: 'RAG implementation', maxScore: 2 },
        { name: 'Ingestion pipeline', description: 'Data ingestion', maxScore: 2 },
        { name: 'Monitoring', description: 'System monitoring', maxScore: 2 }
      ]
    };

    return mockCriteria[courseId] || [];
  }

  /**
   * Get course name from ID
   */
  private getCourseName(courseId: string): string {
    const names: Record<string, string> = {
      'mlops': 'MLOps Zoomcamp',
      'data-engineering': 'Data Engineering Zoomcamp',
      'llm-zoomcamp': 'LLM Zoomcamp',
      'machine-learning': 'Machine Learning Zoomcamp'
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
