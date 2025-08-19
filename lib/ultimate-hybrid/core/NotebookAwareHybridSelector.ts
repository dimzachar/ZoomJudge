/**
 * Notebook Aware Hybrid Selector - Extends the hybrid selector to optimize notebook files
 * Integrates notebook optimization into the file selection workflow
 */

import { UltimateHybridSelector } from './UltimateHybridSelector';
import { NotebookOptimizer, CourseData, OptimizedNotebook } from './NotebookOptimizer';
import { GitHubRepoInfo } from '../../github-validator';

export interface OptimizedFile {
  path: string;
  originalContent: string;
  optimizedContent: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  type: 'regular' | 'optimized-notebook';
}

export interface NotebookAwareFileSelection {
  selectedFiles: string[];
  optimizedFiles: OptimizedFile[];
  totalTokenSavings: number;
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
    optimizationTime: number;
    totalTime: number;
  };
}

export class NotebookAwareHybridSelector extends UltimateHybridSelector {
  private notebookOptimizer: NotebookOptimizer;

  constructor(options?: { mockMode?: boolean; convexClient?: any }) {
    super(options);
    this.notebookOptimizer = new NotebookOptimizer();
  }

  /**
   * Select files with notebook optimization
   */
  async selectFilesWithNotebookOptimization(
    request: any, // Using 'any' to match parent signature
    courseData: CourseData
  ): Promise<NotebookAwareFileSelection> {
    const startTime = Date.now();
    
    try {
      // Get initial file selection from parent class
      const selectionResult = await super.selectFiles(request);
      
      // Extract content for selected files
      const fetchStart = Date.now();
      // We need to import and use the fetchRepoFile function directly
      const { fetchRepoFile } = await import('../../github-validator');
      const content: Record<string, string> = {};
      
      // Make sure we have repoInfo
      const repoInfo = request.repoInfo;
      if (!repoInfo) {
        throw new Error('Repository info is required for notebook optimization');
      }
      
      // Fetch content for each selected file
      for (const filePath of selectionResult.selectedFiles) {
        try {
          const fileContent = await fetchRepoFile(repoInfo, filePath);
          if (fileContent) {
            content[filePath] = fileContent;
          }
        } catch (error) {
          console.warn(`Failed to fetch content for ${filePath}:`, error);
        }
      }
      
      const contentFetchTime = Date.now() - fetchStart;
      
      // Optimize notebook files
      const optimizationStart = Date.now();
      const optimizedFiles = await this.optimizeNotebookFiles(
        selectionResult.selectedFiles,
        content,
        courseData
      );
      const optimizationTime = Date.now() - optimizationStart;
      
      const totalTime = Date.now() - startTime;
      
      return {
        selectedFiles: selectionResult.selectedFiles,
        optimizedFiles,
        totalTokenSavings: this.calculateTokenSavings(optimizedFiles),
        metadata: {
          method: selectionResult.method,
          confidence: selectionResult.confidence,
          processingTime: selectionResult.processingTime,
          tierUsed: selectionResult.tierUsed,
          cacheHit: selectionResult.cacheHit || false,
          validationApplied: selectionResult.validationApplied,
          totalFiles: selectionResult.performance.tier1Time ? selectionResult.performance.tier1Time : 0,
          tokenUsage: selectionResult.tokenUsage
        },
        performance: {
          fileDiscoveryTime: selectionResult.performance.tier1Time || 0,
          selectionTime: selectionResult.performance.tier2Time || 0,
          contentFetchTime,
          optimizationTime,
          totalTime
        }
      };
    } catch (error) {
      console.error('Error in notebook-aware file selection:', error);
      throw error;
    }
  }

  /**
   * Optimize notebook files in the selection
   */
  private async optimizeNotebookFiles(
    selectedFiles: string[],
    content: Record<string, string>,
    courseData: CourseData
  ): Promise<OptimizedFile[]> {
    const optimizedFiles: OptimizedFile[] = [];
    
    for (const filePath of selectedFiles) {
      const fileContent = content[filePath];
      if (!fileContent) {
        optimizedFiles.push({
          path: filePath,
          originalContent: '',
          optimizedContent: '',
          originalSize: 0,
          optimizedSize: 0,
          compressionRatio: 0,
          type: 'regular'
        });
        continue;
      }
      
      // Check if this is a notebook file
      if (filePath.endsWith('.ipynb')) {
        try {
          const optimized = await this.notebookOptimizer.optimizeNotebook(
            filePath,
            fileContent,
            courseData
          );
          
          if (optimized) {
            optimizedFiles.push({
              path: filePath,
              originalContent: fileContent,
              optimizedContent: optimized.content,
              originalSize: optimized.originalSize,
              optimizedSize: optimized.optimizedSize,
              compressionRatio: optimized.compressionRatio,
              type: 'optimized-notebook'
            });
          } else {
            // If optimization failed, use original content
            optimizedFiles.push({
              path: filePath,
              originalContent: fileContent,
              optimizedContent: fileContent,
              originalSize: this.estimateTokens(fileContent),
              optimizedSize: this.estimateTokens(fileContent),
              compressionRatio: 0,
              type: 'regular'
            });
          }
        } catch (error) {
          console.warn(`Failed to optimize notebook ${filePath}:`, error);
          // Use original content if optimization fails
          optimizedFiles.push({
            path: filePath,
            originalContent: fileContent,
            optimizedContent: fileContent,
            originalSize: this.estimateTokens(fileContent),
            optimizedSize: this.estimateTokens(fileContent),
            compressionRatio: 0,
            type: 'regular'
          });
        }
      } else {
        // Regular file, no optimization needed
        optimizedFiles.push({
          path: filePath,
          originalContent: fileContent,
          optimizedContent: fileContent,
          originalSize: this.estimateTokens(fileContent),
          optimizedSize: this.estimateTokens(fileContent),
          compressionRatio: 0,
          type: 'regular'
        });
      }
    }
    
    return optimizedFiles;
  }

  /**
   * Calculate total token savings from optimization
   */
  private calculateTokenSavings(optimizedFiles: OptimizedFile[]): number {
    return optimizedFiles.reduce((total, file) => {
      if (file.type === 'optimized-notebook') {
        return total + (file.originalSize - file.optimizedSize);
      }
      return total;
    }, 0);
  }

  /**
   * Token estimation helper
   */
  private estimateTokens(content: string): number {
    return Math.ceil(content.length / 4); // Rough approximation
  }

  /**
   * Get content map from optimized files
   */
  getContentMap(optimizedFiles: OptimizedFile[]): Record<string, string> {
    const contentMap: Record<string, string> = {};
    optimizedFiles.forEach(file => {
      contentMap[file.path] = file.optimizedContent;
    });
    return contentMap;
  }
}
