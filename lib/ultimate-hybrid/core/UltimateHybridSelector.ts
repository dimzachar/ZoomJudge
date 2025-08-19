/**
 * Ultimate Hybrid Selector - Three-Tier File Selection System
 * Tier 1: Intelligent Caching (similarity-based)
 * Tier 2: Repository Fingerprinting (pattern-based)
 * Tier 3: AI-Guided Selection (LLM-powered)
 */

import { RepositoryFingerprinter, RepoTypeResult } from './RepositoryFingerprinter';
import { AIGuidedSelector, AIFileSelectionResult } from './AIGuidedSelector';
import { CriterionMapper, CourseCriterion } from './CriterionMapper';
import { IntelligentCache, CacheResult } from './IntelligentCache';
import { CacheWarmingSystem } from '../cache/CacheWarmingSystem';
import { RepositorySignatureGenerator } from '../cache/RepositorySignatureGenerator';
import { ValidationEngine, ValidationResult } from '../ai/ValidationEngine';
import { HYBRID_CONFIG, AI_MODEL_CONFIGS } from '../config';
import { evaluationLogger } from '../../simple-logger';
import { ConvexHttpClient } from 'convex/browser';
// Setup console override to disable logging in production
import '../../console-override';

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
  validationApplied?: boolean;
  validationChanges?: number;
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
  private intelligentCache: IntelligentCache;
  private cacheWarming: CacheWarmingSystem;
  private signatureGenerator: RepositorySignatureGenerator;
  private validationEngine: ValidationEngine;
  private currentEvaluationId: string | null = null;

  constructor(options?: { mockMode?: boolean; convexClient?: ConvexHttpClient }) {
    this.fingerprinter = new RepositoryFingerprinter();
    this.aiSelector = new AIGuidedSelector({
      model: AI_MODEL_CONFIGS.FILE_SELECTION.model,
      maxTokens: AI_MODEL_CONFIGS.FILE_SELECTION.maxTokens,
      temperature: AI_MODEL_CONFIGS.FILE_SELECTION.temperature,
      maxFiles: HYBRID_CONFIG.MAX_FILES_PER_EVALUATION,
      mockMode: options?.mockMode || false
    });
    this.criterionMapper = new CriterionMapper();
    this.intelligentCache = new IntelligentCache(options?.convexClient);
    this.signatureGenerator = new RepositorySignatureGenerator();
    this.validationEngine = new ValidationEngine();
    this.cacheWarming = new CacheWarmingSystem(
      this.intelligentCache,
      this.fingerprinter,
      options?.convexClient
    );

    // Start cache warming if not in mock mode
    if (!options?.mockMode) {
      this.initializeCacheWarming();
    }
  }

  /**
   * Initialize cache warming system
   */
  private async initializeCacheWarming(): Promise<void> {
    try {
      console.log('🔥 Initializing cache warming system...');

      // Run initial cache warming
      await this.cacheWarming.warmCache();

      // Schedule automatic warming every 6 hours
      this.cacheWarming.scheduleAutoWarming(6);

      console.log('✅ Cache warming system initialized');
    } catch (error) {
      console.error('Error initializing cache warming:', error);
    }
  }

  /**
   * Set the current evaluation ID for logging purposes
   */
  setEvaluationId(evaluationId: string) {
    this.currentEvaluationId = evaluationId;
    this.aiSelector.setEvaluationId(evaluationId);
    this.intelligentCache.setEvaluationId(evaluationId);
    this.validationEngine.setEvaluationId(evaluationId);
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

      // TIER 1: Intelligent Caching
      if (HYBRID_CONFIG.ENABLE_INTELLIGENT_CACHING) {
        const tier1Start = Date.now();
        const cacheResult = await this.tryIntelligentCache(request);
        performance.tier1Time = Date.now() - tier1Start;

        if (cacheResult) {
          console.log('✅ Tier 1 (Cache) - Cache hit found');

          // Apply AI validation to cached result
          const cachedResult: HybridSelectionResult = {
            selectedFiles: cacheResult.selectedFiles,
            method: cacheResult.method,
            confidence: cacheResult.confidence,
            reasoning: cacheResult.reasoning,
            processingTime: Date.now() - startTime,
            tokenUsage: cacheResult.tokenUsage,
            cacheHit: cacheResult.cacheHit,
            fallbackUsed: cacheResult.fallbackUsed,
            tierUsed: 1,
            performance
          };

          const validatedCachedResult = await this.applyAIValidation(request, cachedResult);

          // Cache the successful result for future use
          await this.cacheSuccessfulResult(request, validatedCachedResult);

          return validatedCachedResult;
        }
        console.log('❌ Tier 1 (Cache) - No cache hit, proceeding to Tier 2');
      }

      // TIER 2: Repository Fingerprinting
      const tier2Start = Date.now();
      const fingerprintResult = await this.tryRepositoryFingerprinting(request);
      performance.tier2Time = Date.now() - tier2Start;

      // According to Ultimate Hybrid strategy, always proceed to Tier 3 when criteria are available
      // This ensures criterion-driven selection for better accuracy
      if (request.criteria.length > 0) {
        console.log(`📋 Criteria available (${request.criteria.length}), proceeding to Tier 3 for criterion-driven selection`);
      } else if (fingerprintResult && fingerprintResult.confidence >= HYBRID_CONFIG.FINGERPRINT_CONFIDENCE_THRESHOLD) {
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
      } else {
        console.log(`❌ Tier 2 (Fingerprinting) - ${fingerprintResult?.confidence ? `Low confidence (${fingerprintResult.confidence})` : 'No result'}, proceeding to Tier 3`);
      }

      // TIER 3: AI-Guided Selection
      if (HYBRID_CONFIG.ENABLE_AI_GUIDED_SELECTION) {
        const tier3Start = Date.now();
        const aiResult = await this.tryAIGuidedSelection(request);
        performance.tier3Time = Date.now() - tier3Start;

        if (aiResult) {
          console.log(`✅ Tier 3 (AI-Guided) - Success with confidence ${aiResult.confidence}`);

          // When criteria are available, merge AI selection with criterion-based selection
          // to ensure important criterion-matching files are not missed
          let finalSelectedFiles = aiResult.selectedFiles;
          if (request.criteria.length > 0) {
            // Get criterion-based selection
            const criterionBasedSelection = await this.fingerprinter.selectFilesByCriteria(
              request.files,
              request.courseId,
              request.criteria
            );
            
            console.log(`🔍 Criterion-based selection returned ${criterionBasedSelection.length} files:`);
            console.log(`   Files: ${criterionBasedSelection.slice(0, 10).join(', ')}${criterionBasedSelection.length > 10 ? '...' : ''}`);
            
            // Check if snowflake_refresh.py is in criterion-based selection
            if (criterionBasedSelection.some(f => f.includes('snowflake_refresh.py'))) {
              console.log(`✅ snowflake_refresh.py found in criterion-based selection`);
            } else {
              console.log(`❌ snowflake_refresh.py NOT found in criterion-based selection`);
            }
            
            // Merge the selections, prioritizing criterion-matching files
            const mergedSelection = new Set<string>(finalSelectedFiles);
            
            // Add criterion-matching files that might have been missed by AI
            let addedFiles = 0;
            for (const file of criterionBasedSelection) {
              if (!mergedSelection.has(file)) {
                mergedSelection.add(file);
                console.log(`🔧 Adding criterion-matching file missed by AI: ${file}`);
                addedFiles++;
              }
            }
            
            // Limit to max files
            const maxFiles = request.maxFiles || HYBRID_CONFIG.MAX_FILES_PER_EVALUATION;
            finalSelectedFiles = Array.from(mergedSelection).slice(0, maxFiles);
            console.log(`🔧 Merged AI selection with criterion-based selection: ${finalSelectedFiles.length} files (${addedFiles} files added)`);
            
            // Check if snowflake_refresh.py is in final selection
            if (finalSelectedFiles.some(f => f.includes('snowflake_refresh.py'))) {
              console.log(`✅ snowflake_refresh.py found in final merged selection`);
            } else {
              console.log(`❌ snowflake_refresh.py NOT found in final merged selection`);
            }
          }

          const result: HybridSelectionResult = {
            selectedFiles: finalSelectedFiles,
            method: 'ai_guided',
            confidence: aiResult.confidence,
            reasoning: aiResult.reasoning,
            processingTime: Date.now() - startTime,
            tokenUsage: aiResult.tokenUsage,
            cacheHit: false,
            fallbackUsed: false,
            tierUsed: 3,
            performance
          };

          // Apply AI validation to improve the result
          const validatedResult = await this.applyAIValidation(request, result);

          // Cache the successful AI strategy for future use
          await this.cacheSuccessfulStrategy(request, validatedResult.selectedFiles, {
            accuracy: validatedResult.confidence,
            processingTime: performance.tier3Time || 0,
            evaluationQuality: validatedResult.confidence
          });

          return validatedResult;
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
   * TIER 1: Intelligent Caching
   */
  private async tryIntelligentCache(request: HybridSelectionRequest): Promise<HybridSelectionResult | null> {
    try {
      // Create enhanced repository signature using the new generator
      const signature = this.signatureGenerator.generateSignature(request.files, {
        maxDepth: 3,
        excludePatterns: ['node_modules', '.git', '__pycache__', 'venv']
      });

      console.log(`🔍 Generated signature: ${signature.technologies.join(', ')} (${signature.sizeCategory})`);

      // Search for similar cached strategies
      const cacheResult = await this.intelligentCache.findSimilarStrategy(
        signature,
        request.courseId,
        request.criteria,
        request.repoUrl
      );

      if (cacheResult) {
        console.log(`✅ Cache hit with ${(cacheResult.similarity * 100).toFixed(1)}% similarity`);

        return {
          selectedFiles: cacheResult.selectedFiles,
          method: 'cache',
          confidence: cacheResult.confidence,
          reasoning: cacheResult.reasoning,
          processingTime: cacheResult.processingTime,
          cacheHit: true,
          tierUsed: 1,
          performance: { tier1Time: cacheResult.processingTime }
        };
      }

      console.log('❌ No suitable cache entry found');
      return null;
    } catch (error) {
      console.error('Error in intelligent cache:', error);
      return null;
    }
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

      // Calculate appropriate confidence based on selection method and quality
      let confidence: number;
      let reasoning: string;
      
      if (request.criteria.length > 0) {
        // When using criteria, confidence should be based on file selection quality
        // Use a high confidence since we're using criterion-driven selection
        confidence = 0.95; // High confidence for criterion-driven selection
        reasoning = `Repository fingerprinting detected ${analysis.type} project. Selected ${finalFiles.length} files based on course criteria with high confidence.`;
      } else {
        // When using pattern-based selection, use repository type detection confidence
        confidence = analysis.confidence;
        reasoning = `Repository fingerprinting detected ${analysis.type} project with ${analysis.confidence.toFixed(2)} confidence. Selected ${finalFiles.length} files based on pattern matching.`;
      }

      return {
        selectedFiles: finalFiles,
        confidence: confidence,
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
   * Cache a successful file selection strategy
   */
  private async cacheSuccessfulStrategy(
    request: HybridSelectionRequest,
    selectedFiles: string[],
    performance: {
      accuracy: number;
      processingTime: number;
      evaluationQuality: number;
    }
  ): Promise<void> {
    try {
      // Create repository signature for caching
      const analysis = await this.fingerprinter.analyzeRepository(request.files);

      await this.intelligentCache.cacheStrategy(
        analysis.signature,
        request.courseId,
        selectedFiles,
        performance
      );
    } catch (error) {
      console.error('Error caching strategy:', error);
      // Don't throw - caching failure shouldn't break the main flow
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.intelligentCache.getCacheStats();
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.intelligentCache.clearCache();
  }

  /**
   * Apply AI validation to improve file selection
   */
  private async applyAIValidation(
    request: HybridSelectionRequest,
    result: HybridSelectionResult
  ): Promise<HybridSelectionResult> {
    // Skip validation if disabled
    if (!HYBRID_CONFIG.ENABLE_AI_VALIDATION) {
      // Still apply final filtering for large dependency files
      const filteredFiles = this.filterLargeDependencyFiles(result.selectedFiles);
      if (filteredFiles.length !== result.selectedFiles.length) {
        console.log(`🔧 Final filtering removed ${result.selectedFiles.length - filteredFiles.length} large dependency files`);
        return {
          ...result,
          selectedFiles: filteredFiles
        };
      }
      return result;
    }

    try {
      console.log('🤖 Applying AI validation to file selection...');

      // Prepare validation request
      const validationRequest = {
        allFiles: request.files,
        selectedFiles: result.selectedFiles,
        courseId: request.courseId,
        courseName: request.courseName,
        repoUrl: request.repoUrl,
        selectionMethod: result.method,
        confidence: result.confidence
      };

      // Run AI validation
      const validation = await this.validationEngine.validateSelection(validationRequest);

      // Apply suggestions if validation indicates improvements
      if (!validation.isValid || validation.suggestions.missingCritical.length > 0) {
        console.log('🔧 Applying AI validation suggestions...');

        const improvement = await this.validationEngine.applyValidationSuggestions(
          result.selectedFiles,
          request.files,
          validation
        );

        if (improvement.changes.length > 0) {
          console.log(`✅ Applied ${improvement.changes.length} validation changes`);
          improvement.changes.forEach(change => {
            console.log(`   ${change.action}: ${change.file} (${change.reason})`);
          });

          // Apply final filtering for large dependency files
          const filteredFiles = this.filterLargeDependencyFiles(improvement.improvedSelection);
          if (filteredFiles.length !== improvement.improvedSelection.length) {
            console.log(`🔧 Final filtering removed ${improvement.improvedSelection.length - filteredFiles.length} large dependency files`);
            improvement.improvedSelection = filteredFiles;
          }

          return {
            ...result,
            selectedFiles: improvement.improvedSelection,
            confidence: Math.min(result.confidence + 0.1, 1.0), // Boost confidence slightly
            reasoning: `${result.reasoning} + AI validation improvements: ${improvement.changes.length} changes applied.`,
            validationApplied: true,
            validationChanges: improvement.changes.length
          };
        }
      }

      console.log('✅ AI validation passed - no changes needed');
      
      // Apply final filtering for large dependency files even when no changes are made
      const filteredFiles = this.filterLargeDependencyFiles(result.selectedFiles);
      if (filteredFiles.length !== result.selectedFiles.length) {
        console.log(`🔧 Final filtering removed ${result.selectedFiles.length - filteredFiles.length} large dependency files`);
        return {
          ...result,
          selectedFiles: filteredFiles,
          validationApplied: true,
          validationChanges: result.selectedFiles.length - filteredFiles.length
        };
      }

      return {
        ...result,
        validationApplied: true,
        validationChanges: 0
      };

    } catch (error) {
      console.error('Error in AI validation:', error);
      // Return original result if validation fails, but still apply final filtering
      const filteredFiles = this.filterLargeDependencyFiles(result.selectedFiles);
      if (filteredFiles.length !== result.selectedFiles.length) {
        console.log(`🔧 Final filtering removed ${result.selectedFiles.length - filteredFiles.length} large dependency files`);
        return {
          ...result,
          selectedFiles: filteredFiles
        };
      }
      return result;
    }
  }

  /**
   * Cache a successful file selection result
   */
  private async cacheSuccessfulResult(
    request: HybridSelectionRequest,
    result: HybridSelectionResult
  ): Promise<void> {
    try {
      // Only cache high-quality results
      if (result.confidence < 0.75) {
        console.log(`⚠️ Skipping cache - confidence ${result.confidence} below threshold`);
        return;
      }

      // Generate signature for caching
      const signature = this.signatureGenerator.generateSignature(request.files);

      // Create performance metrics
      const performance = {
        accuracy: result.confidence,
        processingTime: result.processingTime,
        evaluationQuality: result.confidence // Will be updated with actual evaluation results
      };

      // Cache the strategy
      await this.intelligentCache.cacheStrategy(
        signature,
        request.courseId,
        result.selectedFiles,
        performance,
        request.repoUrl
      );

      console.log(`💾 Cached successful result for ${request.repoUrl}`);

    } catch (error) {
      console.error('Error caching successful result:', error);
    }
  }

  /**
   * Get cache warming statistics
   */
  getCacheWarmingStats() {
    return this.cacheWarming.getWarmingStats();
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
    const cacheStats = this.getCacheStats();

    return {
      tier1Usage: cacheStats.hitRate,
      tier2Usage: 0.7 * (1 - cacheStats.hitRate),
      tier3Usage: 0.3 * (1 - cacheStats.hitRate),
      averageProcessingTime: 1500,
      averageTokenUsage: 800,
      cacheHitRate: cacheStats.hitRate
    };
  }

  /**
   * Filter out large dependency files that should not be included in file selection
   */
  private filterLargeDependencyFiles(files: string[]): string[] {
    const largeDependencyFiles = [
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'pipfile.lock',
      'gemfile.lock',
      'composer.lock',
      'cargo.lock',
      'go.sum',
      'poetry.lock',
      'mix.lock',
      'pubspec.lock'
    ];

    return files.filter(file => !largeDependencyFiles.includes(file.toLowerCase()));
  }
}
