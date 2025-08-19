/**
 * Cache Warming System - Proactively populates cache with common patterns
 */

import { IntelligentCache } from '../core/IntelligentCache';
import { RepositoryFingerprinter, RepoSignature } from '../core/RepositoryFingerprinter';
import { evaluationLogger } from '../../simple-logger';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
// Setup console override to disable logging in production
import '../../console-override';

export interface WarmingPattern {
  courseId: string;
  repoType: string;
  commonFiles: string[];
  frequency: number;
  lastWarmed: number;
}

export interface WarmingStats {
  totalWarmed: number;
  successfulWarming: number;
  failedWarming: number;
  averageWarmingTime: number;
  lastWarmingRun: number;
}

export class CacheWarmingSystem {
  private cache: IntelligentCache;
  private fingerprinter: RepositoryFingerprinter;
  private convexClient: ConvexHttpClient | null;
  private warmingPatterns: Map<string, WarmingPattern> = new Map();
  private stats: WarmingStats;

  constructor(
    cache: IntelligentCache,
    fingerprinter: RepositoryFingerprinter,
    convexClient?: ConvexHttpClient
  ) {
    this.cache = cache;
    this.fingerprinter = fingerprinter;
    this.convexClient = convexClient || null;
    this.stats = {
      totalWarmed: 0,
      successfulWarming: 0,
      failedWarming: 0,
      averageWarmingTime: 0,
      lastWarmingRun: 0
    };
    
    this.initializeCommonPatterns();
  }

  /**
   * Initialize common repository patterns for warming
   */
  private initializeCommonPatterns(): void {
    // MLOps project patterns
    this.warmingPatterns.set('mlops-standard', {
      courseId: 'mlops',
      repoType: 'mlops-project',
      commonFiles: [
        'README.md',
        'src/pipeline/data_ingestion.py',
        'src/pipeline/model_training.py',
        'src/pipeline/orchestrate.py',
        'model.py',
        'lambda_function.py',
        'requirements.txt',
        'Dockerfile'
      ],
      frequency: 10, // High frequency
      lastWarmed: 0
    });

    // Data Engineering patterns
    this.warmingPatterns.set('data-eng-dbt', {
      courseId: 'data-engineering',
      repoType: 'data-engineering',
      commonFiles: [
        'README.md',
        'dbt/models/staging/users.sql',
        'dbt/models/core/fact_trips.sql',
        'terraform/main.tf',
        'orchestration/dags/etl_dag.py',
        'requirements.txt'
      ],
      frequency: 8,
      lastWarmed: 0
    });

    // LLM project patterns
    this.warmingPatterns.set('llm-rag', {
      courseId: 'llm',
      repoType: 'llm-project',
      commonFiles: [
        'README.md',
        'backend/rag/ingest.py',
        'backend/api/search.py',
        'prep.py',
        'requirements.txt',
        'docker-compose.yml'
      ],
      frequency: 6,
      lastWarmed: 0
    });

    console.log(`🔥 Initialized ${this.warmingPatterns.size} warming patterns`);
  }

  /**
   * Run cache warming for all patterns
   */
  async warmCache(): Promise<WarmingStats> {
    const startTime = Date.now();
    console.log('🔥 Starting cache warming process...');

    await evaluationLogger.logGeneral(
      'CACHE_WARMING_START',
      'INFO',
      'Cache warming process started',
      {
        patterns: this.warmingPatterns.size,
        timestamp: startTime
      }
    );

    let warmedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const [patternId, pattern] of this.warmingPatterns.entries()) {
      try {
        const shouldWarm = this.shouldWarmPattern(pattern);
        
        if (shouldWarm) {
          console.log(`🔥 Warming pattern: ${patternId} (${pattern.courseId})`);
          
          const success = await this.warmPattern(pattern);
          
          if (success) {
            successCount++;
            pattern.lastWarmed = Date.now();
            console.log(`✅ Successfully warmed pattern: ${patternId}`);
          } else {
            failedCount++;
            console.log(`❌ Failed to warm pattern: ${patternId}`);
          }
          
          warmedCount++;
        }
      } catch (error) {
        console.error(`Error warming pattern ${patternId}:`, error);
        failedCount++;
      }
    }

    const totalTime = Date.now() - startTime;
    const averageTime = warmedCount > 0 ? totalTime / warmedCount : 0;

    // Update stats
    this.stats = {
      totalWarmed: this.stats.totalWarmed + warmedCount,
      successfulWarming: this.stats.successfulWarming + successCount,
      failedWarming: this.stats.failedWarming + failedCount,
      averageWarmingTime: averageTime,
      lastWarmingRun: Date.now()
    };

    console.log(`🔥 Cache warming completed: ${successCount}/${warmedCount} patterns warmed successfully`);

    await evaluationLogger.logGeneral(
      'CACHE_WARMING_COMPLETE',
      'INFO',
      'Cache warming process completed',
      {
        warmedCount,
        successCount,
        failedCount,
        totalTime,
        averageTime
      }
    );

    return this.stats;
  }

  /**
   * Determine if a pattern should be warmed
   */
  private shouldWarmPattern(pattern: WarmingPattern): boolean {
    const now = Date.now();
    const timeSinceLastWarm = now - pattern.lastWarmed;
    const warmingInterval = (24 / pattern.frequency) * 60 * 60 * 1000; // Convert frequency to milliseconds

    return timeSinceLastWarm > warmingInterval;
  }

  /**
   * Warm a specific pattern
   */
  private async warmPattern(pattern: WarmingPattern): Promise<boolean> {
    try {
      // Create a synthetic repository signature for this pattern
      const signature = this.createSyntheticSignature(pattern);
      
      // Create mock performance data
      const performance = {
        accuracy: 0.9,
        processingTime: 1500,
        evaluationQuality: 0.85
      };

      // Cache the strategy
      await this.cache.cacheStrategy(
        signature,
        pattern.courseId,
        pattern.commonFiles,
        performance,
        `synthetic://${pattern.repoType}`
      );

      return true;
    } catch (error) {
      console.error(`Error warming pattern ${pattern.repoType}:`, error);
      return false;
    }
  }

  /**
   * Create a synthetic repository signature for warming
   */
  private createSyntheticSignature(pattern: WarmingPattern): RepoSignature {
    // Extract directory structure from common files
    const directories = new Set<string>();
    pattern.commonFiles.forEach(file => {
      const parts = file.split('/');
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + parts[i];
        directories.add(currentPath);
      }
    });

    // Detect technologies from file extensions
    const technologies = new Set<string>();
    pattern.commonFiles.forEach(file => {
      const ext = file.split('.').pop()?.toLowerCase();
      if (ext === 'py') technologies.add('python');
      if (ext === 'sql') technologies.add('sql');
      if (ext === 'tf') technologies.add('terraform');
      if (ext === 'yml' || ext === 'yaml') technologies.add('yaml');
      if (file.includes('docker')) technologies.add('docker');
      if (file.includes('dbt')) technologies.add('dbt');
    });

    // Analyze file types
    const fileTypes: Record<string, number> = {};
    pattern.commonFiles.forEach(file => {
      const ext = file.split('.').pop()?.toLowerCase() || 'unknown';
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });

    return {
      directoryStructure: Array.from(directories).sort(),
      technologies: Array.from(technologies),
      fileTypes,
      sizeCategory: pattern.commonFiles.length < 10 ? 'small' : 
                   pattern.commonFiles.length < 25 ? 'medium' : 'large',
      patternHash: this.generatePatternHash(pattern)
    };
  }

  /**
   * Generate a pattern hash for synthetic signatures
   */
  private generatePatternHash(pattern: WarmingPattern): string {
    const content = `${pattern.repoType}_${pattern.courseId}_${pattern.commonFiles.join('|')}`;

    // Use browser-compatible base64 encoding
    if (typeof btoa !== 'undefined') {
      // Browser environment
      return btoa(content).substring(0, 16);
    } else if (typeof Buffer !== 'undefined') {
      // Node.js environment
      return Buffer.from(content).toString('base64').substring(0, 16);
    } else {
      // Fallback: simple hash
      return this.simpleHash(content).substring(0, 16);
    }
  }

  /**
   * Simple hash function that works in all environments
   */
  private simpleHash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString(16);

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to positive hex string
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Get warming statistics
   */
  getWarmingStats(): WarmingStats {
    return { ...this.stats };
  }

  /**
   * Add a new warming pattern
   */
  addWarmingPattern(id: string, pattern: WarmingPattern): void {
    this.warmingPatterns.set(id, pattern);
    console.log(`🔥 Added new warming pattern: ${id}`);
  }

  /**
   * Remove a warming pattern
   */
  removeWarmingPattern(id: string): boolean {
    const removed = this.warmingPatterns.delete(id);
    if (removed) {
      console.log(`🗑️ Removed warming pattern: ${id}`);
    }
    return removed;
  }

  /**
   * Schedule automatic cache warming
   */
  scheduleAutoWarming(intervalHours: number = 6): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    setInterval(async () => {
      try {
        console.log('🔥 Running scheduled cache warming...');
        await this.warmCache();
      } catch (error) {
        console.error('Error in scheduled cache warming:', error);
      }
    }, intervalMs);

    console.log(`🔥 Scheduled automatic cache warming every ${intervalHours} hours`);
  }
}
