/**
 * Ultimate Hybrid Selector - Three-Tier File Selection System
 * Tier 1: Intelligent Caching (similarity-based)
 * Tier 2: Repository Fingerprinting (pattern-based)
 * Tier 3: AI-Guided Selection (LLM-powered)
 */

import { RepositoryFingerprinter, RepoTypeResult } from './RepositoryFingerprinter';
import { AIGuidedSelector, AIFileSelectionResult } from './AIGuidedSelector';
import { CriterionMapper, CourseCriterion } from './CriterionMapper';
import { HYBRID_CONFIG, AI_MODEL_CONFIGS } from '../config';
import { evaluationLogger } from '../../simple-logger';

export interface HybridSelectionRequest {
  repoUrl: string;
  courseId: string;
  courseName: string;
  criteria: CourseCriterion[];
  files: string[];
  maxFiles?: number;
}

export interface HybridSelectionResult {
  selectedFiles: string[];
  method: 'cache' | 'fingerprint' | 'ai_guided';
  confidence: number;
  reasoning: string;
  processingTime: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cacheHit?: boolean;
  fallbackUsed?: boolean;
  tierUsed: 1 | 2 | 3;
  performance: {
    tier1Time?: number;
    tier2Time?: number;
    tier3Time?: number;
  };
}

export class UltimateHybridSelector {
  private fingerprinter: RepositoryFingerprinter;
  private aiSelector: AIGuidedSelector;
  private criterionMapper: CriterionMapper;
  private currentEvaluationId: string | null = null;

  constructor(options?: { mockMode?: boolean }) {
    this.fingerprinter = new RepositoryFingerprinter();
    this.aiSelector = new AIGuidedSelector({
      model: AI_MODEL_CONFIGS.FILE_SELECTION.model,
      maxTokens: AI_MODEL_CONFIGS.FILE_SELECTION.maxTokens,
      temperature: AI_MODEL_CONFIGS.FILE_SELECTION.temperature,
      maxFiles: HYBRID_CONFIG.MAX_FILES_PER_EVALUATION,
      mockMode: options?.mockMode || false
    });
    this.criterionMapper = new CriterionMapper();
  }

  /**
   * Set the current evaluation ID for logging purposes
   */
  setEvaluationId(evaluationId: string) {
    this.currentEvaluationId = evaluationId;
    this.aiSelector.setEvaluationId(evaluationId);
  }

  /**
   * Update AI model configuration for file selection
   */
  updateFileSelectionModel(modelConfig: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }) {
    this.aiSelector.updateConfig(modelConfig);
  }

  /**
   * Get current AI model configuration
   */
  getFileSelectionModelConfig() {
    return this.aiSelector.getConfig();
  }

  /**
   * Main entry point for hybrid file selection
   * Implements three-tier decision logic
   */
  async selectFiles(request: HybridSelectionRequest): Promise<HybridSelectionResult> {
    const startTime = Date.now();
    const performance: HybridSelectionResult['performance'] = {};

    try {
      console.log('=== ULTIMATE HYBRID SELECTOR START ===');
      console.log(`Repository: ${request.repoUrl}`);
      console.log(`Course: ${request.courseName} (${request.courseId})`);
      console.log(`Available files: ${request.files.length}`);
      console.log(`Criteria: ${request.criteria.length}`);

      // Log the start of hybrid selection
      await evaluationLogger.logGeneral(
        'HYBRID_SELECTION_START',
        'INFO',
        'Starting Ultimate Hybrid file selection',
        {
          repoUrl: request.repoUrl,
          courseId: request.courseId,
          availableFiles: request.files.length,
          criteria: request.criteria.length,
          evaluationId: this.currentEvaluationId
        }
      );

      // TIER 1: Intelligent Caching (TODO: Implement in future)
      if (HYBRID_CONFIG.ENABLE_INTELLIGENT_CACHING) {
        const tier1Start = Date.now();
        const cacheResult = await this.tryIntelligentCache(request);
        performance.tier1Time = Date.now() - tier1Start;

        if (cacheResult) {
          console.log('✅ Tier 1 (Cache) - Cache hit found');
          return {
            ...cacheResult,
            processingTime: Date.now() - startTime,
            tierUsed: 1,
            performance
          };
        }
        console.log('❌ Tier 1 (Cache) - No cache hit, proceeding to Tier 2');
      }

      // TIER 2: Repository Fingerprinting
      const tier2Start = Date.now();
      const fingerprintResult = await this.tryRepositoryFingerprinting(request);
      performance.tier2Time = Date.now() - tier2Start;

      if (fingerprintResult && fingerprintResult.confidence >= HYBRID_CONFIG.FINGERPRINT_CONFIDENCE_THRESHOLD) {
        console.log(`✅ Tier 2 (Fingerprinting) - Success with confidence ${fingerprintResult.confidence}`);
        return {
          selectedFiles: fingerprintResult.selectedFiles,
          method: 'fingerprint',
          confidence: fingerprintResult.confidence,
          reasoning: fingerprintResult.reasoning,
          processingTime: Date.now() - startTime,
          cacheHit: false,
          tierUsed: 2,
          performance
        };
      }
      console.log(`❌ Tier 2 (Fingerprinting) - Low confidence (${fingerprintResult?.confidence || 0}), proceeding to Tier 3`);

      // TIER 3: AI-Guided Selection
      if (HYBRID_CONFIG.ENABLE_AI_GUIDED_SELECTION) {
        const tier3Start = Date.now();
        const aiResult = await this.tryAIGuidedSelection(request);
        performance.tier3Time = Date.now() - tier3Start;

        if (aiResult) {
          console.log(`✅ Tier 3 (AI-Guided) - Success with confidence ${aiResult.confidence}`);
          return {
            selectedFiles: aiResult.selectedFiles,
            method: 'ai_guided',
            confidence: aiResult.confidence,
            reasoning: aiResult.reasoning,
            processingTime: Date.now() - startTime,
            tokenUsage: aiResult.tokenUsage,
            cacheHit: false,
            tierUsed: 3,
            performance
          };
        }
      }

      // FALLBACK: Use fingerprinting result even with low confidence
      console.log('⚠️ All tiers failed, using fallback fingerprinting result');
      const fallbackFiles = fingerprintResult?.selectedFiles || this.getFallbackSelection(request.files);
      
      return {
        selectedFiles: fallbackFiles,
        method: 'fingerprint',
        confidence: fingerprintResult?.confidence || 0.3,
        reasoning: 'All hybrid tiers failed, used fallback fingerprinting',
        processingTime: Date.now() - startTime,
        cacheHit: false,
        fallbackUsed: true,
        tierUsed: 2,
        performance
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('=== ULTIMATE HYBRID SELECTOR ERROR ===');
      console.error('Error in hybrid selection:', error);
      console.error('=== ULTIMATE HYBRID SELECTOR ERROR END ===');

      // Log the error
      await evaluationLogger.logGeneral(
        'HYBRID_SELECTION_ERROR',
        'ERROR',
        'Ultimate Hybrid selection failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          repoUrl: request.repoUrl,
          courseId: request.courseId,
          processingTime
        }
      );

      // Return basic fallback selection
      return {
        selectedFiles: this.getFallbackSelection(request.files),
        method: 'fingerprint',
        confidence: 0.1,
        reasoning: `Hybrid selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        processingTime,
        cacheHit: false,
        fallbackUsed: true,
        tierUsed: 2,
        performance
      };
    }
  }

  /**
   * TIER 1: Intelligent Caching (TODO: Implement)
   */
  private async tryIntelligentCache(request: HybridSelectionRequest): Promise<HybridSelectionResult | null> {
    // TODO: Implement intelligent caching with similarity detection
    // For now, return null to proceed to next tier
    console.log('🔄 Tier 1 (Intelligent Caching) - Not yet implemented');
    return null;
  }

  /**
   * TIER 2: Repository Fingerprinting
   */
  private async tryRepositoryFingerprinting(request: HybridSelectionRequest): Promise<{
    selectedFiles: string[];
    confidence: number;
    reasoning: string;
  } | null> {
    try {
      console.log('🔍 Tier 2 (Repository Fingerprinting) - Analyzing repository...');

      // Analyze repository type and structure
      const analysis = await this.fingerprinter.analyzeRepository(request.files);
      
      console.log(`Repository type detected: ${analysis.type} (confidence: ${analysis.confidence})`);

      // Use criterion-driven selection if we have course criteria
      let selectedFiles: string[];
      if (request.criteria.length > 0) {
        selectedFiles = await this.fingerprinter.selectFilesByCriteria(
          request.files,
          request.courseId,
          request.criteria
        );
      } else {
        // Fallback to pattern-based selection
        selectedFiles = await this.fingerprinter.selectFiles(
          request.files,
          analysis.type === 'unknown' ? 'mlops-project' : analysis.type,
          analysis.confidence
        );
      }

      // Limit to max files
      const maxFiles = request.maxFiles || HYBRID_CONFIG.MAX_FILES_PER_EVALUATION;
      const finalFiles = selectedFiles.slice(0, maxFiles);

      const reasoning = `Repository fingerprinting detected ${analysis.type} project with ${analysis.confidence.toFixed(2)} confidence. Selected ${finalFiles.length} files based on ${request.criteria.length > 0 ? 'course criteria' : 'pattern matching'}.`;

      return {
        selectedFiles: finalFiles,
        confidence: analysis.confidence,
        reasoning
      };

    } catch (error) {
      console.error('Error in repository fingerprinting:', error);
      return null;
    }
  }

  /**
   * TIER 3: AI-Guided Selection
   */
  private async tryAIGuidedSelection(request: HybridSelectionRequest): Promise<AIFileSelectionResult | null> {
    try {
      console.log('🤖 Tier 3 (AI-Guided Selection) - Using AI model for file selection...');

      const aiResult = await this.aiSelector.selectFiles({
        repoUrl: request.repoUrl,
        courseId: request.courseId,
        courseName: request.courseName,
        criteria: request.criteria,
        files: request.files,
        maxFiles: request.maxFiles || HYBRID_CONFIG.MAX_FILES_PER_EVALUATION
      });

      return aiResult;

    } catch (error) {
      console.error('Error in AI-guided selection:', error);
      return null;
    }
  }

  /**
   * Basic fallback file selection
   */
  private getFallbackSelection(files: string[]): string[] {
    const essentialPatterns = [
      /README\.(md|txt)$/i,
      /requirements\.txt$/i,
      /package\.json$/i,
      /Dockerfile$/i,
      /\.py$/i,
      /\.ipynb$/i
    ];

    const selectedFiles = new Set<string>();

    // Add files matching essential patterns
    for (const pattern of essentialPatterns) {
      const matches = files.filter(file => pattern.test(file));
      matches.slice(0, 3).forEach(file => selectedFiles.add(file));
      
      if (selectedFiles.size >= HYBRID_CONFIG.MAX_FILES_PER_EVALUATION) break;
    }

    return Array.from(selectedFiles).slice(0, HYBRID_CONFIG.MAX_FILES_PER_EVALUATION);
  }

  /**
   * Get performance statistics for the hybrid system
   */
  async getPerformanceStats(): Promise<{
    tier1Usage: number;
    tier2Usage: number;
    tier3Usage: number;
    averageProcessingTime: number;
    averageTokenUsage: number;
    cacheHitRate: number;
  }> {
    // TODO: Implement performance tracking
    return {
      tier1Usage: 0,
      tier2Usage: 0.7,
      tier3Usage: 0.3,
      averageProcessingTime: 1500,
      averageTokenUsage: 800,
      cacheHitRate: 0
    };
  }
}
