/**
 * Intelligent Caching System - Tier 1 of Ultimate Hybrid Architecture
 * Implements similarity-based strategy caching for repository file selection
 */

import { RepoSignature } from './RepositoryFingerprinter';
import { CourseCriterion } from './CriterionMapper';
import { HYBRID_CONFIG } from '../config';
import { evaluationLogger } from '../../simple-logger';

export interface CachedStrategy {
  id: string;
  repoSignature: RepoSignature;
  courseId: string;
  selectedFiles: string[];
  performance: {
    accuracy: number;
    processingTime: number;
    evaluationQuality: number;
    usageCount: number;
    successRate: number;
  };
  metadata: {
    createdAt: number;
    lastUsed: number;
    lastUpdated: number;
    version: string;
  };
}

export interface SimilarityMatch {
  strategy: CachedStrategy;
  similarity: number;
  confidence: number;
  matchedFeatures: string[];
}

export interface CacheResult {
  selectedFiles: string[];
  method: 'cache';
  confidence: number;
  reasoning: string;
  cacheHit: true;
  strategyId: string;
  similarity: number;
  processingTime: number;
}

export class IntelligentCache {
  private cache: Map<string, CachedStrategy> = new Map();
  private similarityThreshold: number;
  private maxCacheSize: number;
  private currentEvaluationId: string | null = null;

  constructor() {
    this.similarityThreshold = HYBRID_CONFIG.CACHE_SIMILARITY_THRESHOLD;
    this.maxCacheSize = HYBRID_CONFIG.MAX_CACHE_ENTRIES;
    this.loadCacheFromStorage();
  }

  /**
   * Set the current evaluation ID for logging purposes
   */
  setEvaluationId(evaluationId: string) {
    this.currentEvaluationId = evaluationId;
  }

  /**
   * Try to find a cached strategy for the given repository signature
   */
  async findSimilarStrategy(
    repoSignature: RepoSignature,
    courseId: string,
    criteria: CourseCriterion[]
  ): Promise<CacheResult | null> {
    const startTime = Date.now();

    try {
      console.log('🔍 Tier 1 (Intelligent Cache) - Searching for similar strategies...');
      
      // Log cache search start
      await evaluationLogger.logGeneral(
        'CACHE_SEARCH_START',
        'DEBUG',
        'Starting intelligent cache search',
        {
          courseId,
          signatureHash: repoSignature.patternHash,
          cacheSize: this.cache.size,
          evaluationId: this.currentEvaluationId
        }
      );

      // Find similar strategies in cache
      const similarStrategies = this.findSimilarStrategies(repoSignature, courseId);
      
      if (similarStrategies.length === 0) {
        console.log('❌ No similar strategies found in cache');
        return null;
      }

      // Select best matching strategy
      const bestMatch = this.selectBestMatch(similarStrategies, criteria);
      
      if (!bestMatch || bestMatch.similarity < this.similarityThreshold) {
        console.log(`❌ Best match similarity ${bestMatch?.similarity || 0} below threshold ${this.similarityThreshold}`);
        return null;
      }

      // Update strategy usage
      await this.updateStrategyUsage(bestMatch.strategy.id);

      const processingTime = Date.now() - startTime;

      console.log(`✅ Cache hit! Found strategy with ${(bestMatch.similarity * 100).toFixed(1)}% similarity`);
      console.log(`Selected files: ${bestMatch.strategy.selectedFiles.length}`);

      // Log successful cache hit
      await evaluationLogger.logGeneral(
        'CACHE_HIT_SUCCESS',
        'INFO',
        'Intelligent cache hit found',
        {
          strategyId: bestMatch.strategy.id,
          similarity: bestMatch.similarity,
          confidence: bestMatch.confidence,
          selectedFiles: bestMatch.strategy.selectedFiles.length,
          processingTime,
          usageCount: bestMatch.strategy.performance.usageCount + 1
        }
      );

      return {
        selectedFiles: bestMatch.strategy.selectedFiles,
        method: 'cache',
        confidence: bestMatch.confidence,
        reasoning: `Found cached strategy with ${(bestMatch.similarity * 100).toFixed(1)}% similarity. Matched features: ${bestMatch.matchedFeatures.join(', ')}.`,
        cacheHit: true,
        strategyId: bestMatch.strategy.id,
        similarity: bestMatch.similarity,
        processingTime
      };

    } catch (error) {
      console.error('Error in intelligent cache search:', error);
      
      // Log cache error
      await evaluationLogger.logGeneral(
        'CACHE_SEARCH_ERROR',
        'ERROR',
        'Intelligent cache search failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          courseId,
          signatureHash: repoSignature.patternHash
        }
      );

      return null;
    }
  }

  /**
   * Cache a successful file selection strategy
   */
  async cacheStrategy(
    repoSignature: RepoSignature,
    courseId: string,
    selectedFiles: string[],
    performance: {
      accuracy: number;
      processingTime: number;
      evaluationQuality: number;
    }
  ): Promise<void> {
    try {
      const strategyId = this.generateStrategyId(repoSignature, courseId);
      
      const strategy: CachedStrategy = {
        id: strategyId,
        repoSignature,
        courseId,
        selectedFiles,
        performance: {
          ...performance,
          usageCount: 1,
          successRate: 1.0
        },
        metadata: {
          createdAt: Date.now(),
          lastUsed: Date.now(),
          lastUpdated: Date.now(),
          version: '1.0'
        }
      };

      // Check cache size and evict if necessary
      if (this.cache.size >= this.maxCacheSize) {
        await this.evictLeastUsedStrategy();
      }

      this.cache.set(strategyId, strategy);
      await this.saveCacheToStorage();

      console.log(`💾 Cached new strategy: ${strategyId} (${selectedFiles.length} files)`);

      // Log cache storage
      await evaluationLogger.logGeneral(
        'CACHE_STRATEGY_STORED',
        'INFO',
        'New strategy cached',
        {
          strategyId,
          courseId,
          selectedFiles: selectedFiles.length,
          cacheSize: this.cache.size,
          signatureHash: repoSignature.patternHash
        }
      );

    } catch (error) {
      console.error('Error caching strategy:', error);
      
      // Log cache error
      await evaluationLogger.logGeneral(
        'CACHE_STORAGE_ERROR',
        'ERROR',
        'Failed to cache strategy',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          courseId,
          selectedFiles: selectedFiles.length
        }
      );
    }
  }

  /**
   * Find strategies with similar repository signatures
   */
  private findSimilarStrategies(
    targetSignature: RepoSignature,
    courseId: string
  ): SimilarityMatch[] {
    const matches: SimilarityMatch[] = [];

    for (const strategy of this.cache.values()) {
      // Only consider strategies for the same course
      if (strategy.courseId !== courseId) continue;

      const similarity = this.calculateSimilarity(targetSignature, strategy.repoSignature);
      
      if (similarity > 0.5) { // Minimum similarity threshold
        const matchedFeatures = this.identifyMatchedFeatures(targetSignature, strategy.repoSignature);
        
        matches.push({
          strategy,
          similarity,
          confidence: this.calculateConfidence(similarity, strategy.performance),
          matchedFeatures
        });
      }
    }

    // Sort by similarity descending
    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate similarity between two repository signatures
   */
  private calculateSimilarity(sig1: RepoSignature, sig2: RepoSignature): number {
    let totalScore = 0;
    let maxScore = 0;

    // Pattern hash similarity (40% weight)
    const patternSimilarity = sig1.patternHash === sig2.patternHash ? 1 : 0;
    totalScore += patternSimilarity * 0.4;
    maxScore += 0.4;

    // Technology overlap (30% weight)
    const techOverlap = this.calculateArrayOverlap(sig1.technologies, sig2.technologies);
    totalScore += techOverlap * 0.3;
    maxScore += 0.3;

    // Directory structure similarity (20% weight)
    const dirSimilarity = this.calculateArrayOverlap(sig1.directoryStructure, sig2.directoryStructure);
    totalScore += dirSimilarity * 0.2;
    maxScore += 0.2;

    // Size category match (10% weight)
    const sizeSimilarity = sig1.sizeCategory === sig2.sizeCategory ? 1 : 0;
    totalScore += sizeSimilarity * 0.1;
    maxScore += 0.1;

    return maxScore > 0 ? totalScore / maxScore : 0;
  }

  /**
   * Calculate overlap between two arrays
   */
  private calculateArrayOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1;
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Identify which features matched between signatures
   */
  private identifyMatchedFeatures(sig1: RepoSignature, sig2: RepoSignature): string[] {
    const features: string[] = [];

    if (sig1.patternHash === sig2.patternHash) {
      features.push('pattern_hash');
    }

    if (sig1.sizeCategory === sig2.sizeCategory) {
      features.push('size_category');
    }

    const techOverlap = this.calculateArrayOverlap(sig1.technologies, sig2.technologies);
    if (techOverlap > 0.5) {
      features.push('technologies');
    }

    const dirOverlap = this.calculateArrayOverlap(sig1.directoryStructure, sig2.directoryStructure);
    if (dirOverlap > 0.5) {
      features.push('directory_structure');
    }

    return features;
  }

  /**
   * Select the best matching strategy considering similarity and performance
   */
  private selectBestMatch(
    matches: SimilarityMatch[],
    criteria: CourseCriterion[]
  ): SimilarityMatch | null {
    if (matches.length === 0) return null;

    // For now, return the most similar strategy
    // Future enhancement: consider performance metrics and criteria coverage
    return matches[0];
  }

  /**
   * Calculate confidence based on similarity and historical performance
   */
  private calculateConfidence(similarity: number, performance: CachedStrategy['performance']): number {
    // Base confidence from similarity
    let confidence = similarity;

    // Boost confidence based on historical success
    const successBoost = performance.successRate * 0.1;
    confidence += successBoost;

    // Boost confidence based on usage count (more usage = more reliable)
    const usageBoost = Math.min(performance.usageCount / 10, 0.1);
    confidence += usageBoost;

    return Math.min(confidence, 1.0);
  }

  /**
   * Update strategy usage statistics
   */
  private async updateStrategyUsage(strategyId: string): Promise<void> {
    const strategy = this.cache.get(strategyId);
    if (!strategy) return;

    strategy.performance.usageCount++;
    strategy.metadata.lastUsed = Date.now();

    this.cache.set(strategyId, strategy);
    await this.saveCacheToStorage();
  }

  /**
   * Evict least recently used strategy when cache is full
   */
  private async evictLeastUsedStrategy(): Promise<void> {
    let oldestStrategy: CachedStrategy | null = null;
    let oldestId: string | null = null;

    for (const [id, strategy] of this.cache.entries()) {
      if (!oldestStrategy || strategy.metadata.lastUsed < oldestStrategy.metadata.lastUsed) {
        oldestStrategy = strategy;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.cache.delete(oldestId);
      console.log(`🗑️ Evicted strategy: ${oldestId} (last used: ${new Date(oldestStrategy!.metadata.lastUsed).toISOString()})`);
    }
  }

  /**
   * Generate unique strategy ID
   */
  private generateStrategyId(signature: RepoSignature, courseId: string): string {
    const hash = `${courseId}_${signature.patternHash}_${signature.sizeCategory}_${Date.now()}`;
    return hash.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Load cache from persistent storage (placeholder)
   */
  private async loadCacheFromStorage(): Promise<void> {
    // TODO: Implement persistent storage (database, file system, etc.)
    console.log('📂 Cache loaded from storage (placeholder)');
  }

  /**
   * Save cache to persistent storage (placeholder)
   */
  private async saveCacheToStorage(): Promise<void> {
    // TODO: Implement persistent storage (database, file system, etc.)
    console.log('💾 Cache saved to storage (placeholder)');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    averageSimilarity: number;
    totalUsage: number;
  } {
    const strategies = Array.from(this.cache.values());
    
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Track hit rate over time
      averageSimilarity: 0, // TODO: Track average similarity of hits
      totalUsage: strategies.reduce((sum, s) => sum + s.performance.usageCount, 0)
    };
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }
}
