/**
 * Benchmarking framework for comparing current system vs Ultimate Hybrid
 */

import { HYBRID_CONFIG } from '../config';

export interface TestRepository {
  url: string;
  courseId: string;
  repoType: string;
  structure: string;
  expectedFiles: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
}

export interface BenchmarkMetrics {
  fileSelectionAccuracy: number;      // % of relevant files captured
  processingSpeed: number;            // milliseconds
  tokenEfficiency: number;            // % reduction in tokens
  cacheHitRate?: number;              // % of cache hits (hybrid only)
  evaluationQuality: number;         // overall evaluation score
  memoryUsage: number;               // MB
  errorRate: number;                 // % of failed selections
  method?: string;                   // which method was used (hybrid only)
}

export interface SystemBenchmark {
  systemType: 'current' | 'hybrid';
  totalTests: number;
  successfulTests: number;
  averageMetrics: BenchmarkMetrics;
  detailedResults: BenchmarkMetrics[];
  timestamp: number;
}

export interface BenchmarkComparison {
  current: SystemBenchmark;
  hybrid: SystemBenchmark;
  improvements: {
    accuracyImprovement: number;
    speedImprovement: number;
    tokenReduction: number;
    qualityImprovement: number;
  };
  recommendation: 'proceed' | 'needs_improvement' | 'abort';
}

export class BenchmarkRunner {
  private testRepositories: TestRepository[] = [];
  
  constructor() {
    this.initializeTestData();
  }
  
  private initializeTestData() {
    // Default test repositories - will be expanded with real data
    this.testRepositories = [
      {
        url: 'test-mlops-standard',
        courseId: 'mlops',
        repoType: 'mlops-project',
        structure: 'standard',
        expectedFiles: ['README.md', 'src/pipeline/train.py', 'requirements.txt', 'Dockerfile'],
        difficulty: 'easy',
        description: 'Standard MLOps project with src/pipeline structure'
      },
      {
        url: 'test-mlops-nonstandard',
        courseId: 'mlops',
        repoType: 'mlops-project',
        structure: 'custom',
        expectedFiles: ['README.md', 'ml_workflows/training.py', 'setup.py'],
        difficulty: 'medium',
        description: 'Non-standard MLOps project with custom directory structure'
      },
      {
        url: 'test-data-engineering-dbt',
        courseId: 'data-engineering',
        repoType: 'data-engineering',
        structure: 'dbt-focused',
        expectedFiles: ['README.md', 'dbt/models/staging.sql', 'dbt/dbt_project.yml'],
        difficulty: 'easy',
        description: 'Data engineering project focused on dbt transformations'
      },
      {
        url: 'test-llm-rag',
        courseId: 'llm-zoomcamp',
        repoType: 'llm-project',
        structure: 'rag-implementation',
        expectedFiles: ['README.md', 'backend/app/main.py', 'rag/ingest.py'],
        difficulty: 'medium',
        description: 'LLM project with RAG implementation'
      }
    ];
  }
  
  async runComprehensiveBenchmark(): Promise<BenchmarkComparison> {
    console.log('🚀 Starting comprehensive benchmark...');
    
    // Run current system benchmarks
    console.log('📊 Benchmarking current system...');
    const currentResults = await this.benchmarkCurrentSystem();
    
    // Run hybrid system benchmarks (when implemented)
    console.log('🧠 Benchmarking hybrid system...');
    const hybridResults = await this.benchmarkHybridSystem();
    
    // Generate comparison
    const comparison = this.generateComparison(currentResults, hybridResults);
    
    console.log('✅ Benchmark complete!');
    return comparison;
  }
  
  private async benchmarkCurrentSystem(): Promise<SystemBenchmark> {
    const results: BenchmarkMetrics[] = [];
    let successfulTests = 0;
    
    for (const repo of this.testRepositories) {
      try {
        console.log(`Testing current system with ${repo.description}...`);
        
        const startTime = Date.now();
        
        // Simulate current system file selection
        // TODO: Replace with actual current system call
        const selectedFiles = await this.simulateCurrentSystemSelection(repo);
        
        const processingTime = Date.now() - startTime;
        
        // Calculate metrics
        const metrics = await this.calculateMetrics(repo, selectedFiles, processingTime);
        results.push(metrics);
        successfulTests++;
        
      } catch (error) {
        console.error(`Error testing ${repo.url}:`, error);
        results.push(this.createErrorMetrics());
      }
    }
    
    return {
      systemType: 'current',
      totalTests: this.testRepositories.length,
      successfulTests,
      averageMetrics: this.calculateAverageMetrics(results),
      detailedResults: results,
      timestamp: Date.now()
    };
  }
  
  private async benchmarkHybridSystem(): Promise<SystemBenchmark> {
    // For now, return simulated results
    // TODO: Implement actual hybrid system benchmarking
    console.log('⚠️ Hybrid system not yet implemented, using simulated results');
    
    return {
      systemType: 'hybrid',
      totalTests: this.testRepositories.length,
      successfulTests: this.testRepositories.length,
      averageMetrics: {
        fileSelectionAccuracy: 0.92, // Simulated improvement
        processingSpeed: 1500,        // Simulated faster speed
        tokenEfficiency: 0.65,        // Simulated token reduction
        cacheHitRate: 0.0,           // No cache yet
        evaluationQuality: 0.88,     // Simulated quality
        memoryUsage: 150,            // Simulated memory usage
        errorRate: 0.01              // Simulated low error rate
      },
      detailedResults: [],
      timestamp: Date.now()
    };
  }
  
  private async simulateCurrentSystemSelection(repo: TestRepository): Promise<string[]> {
    // Simulate current system behavior based on hardcoded patterns
    // TODO: Replace with actual call to current evaluation-service.ts
    
    const allFiles = [
      'README.md',
      'src/pipeline/train.py',
      'src/pipeline/deploy.py',
      'src/models/model.py',
      'requirements.txt',
      'Dockerfile',
      'config.yaml',
      'tests/test_pipeline.py',
      '.gitignore',
      'setup.py'
    ];
    
    // Simulate current hardcoded pattern matching
    const selectedFiles = allFiles.filter(file => {
      if (file === 'README.md') return true;
      if (file.endsWith('.py') && file.includes('pipeline')) return true;
      if (file === 'requirements.txt') return true;
      if (file === 'Dockerfile') return true;
      return false;
    });
    
    return selectedFiles;
  }
  
  private async calculateMetrics(
    repo: TestRepository, 
    selectedFiles: string[], 
    processingTime: number
  ): Promise<BenchmarkMetrics> {
    // Calculate file selection accuracy
    const relevantSelected = selectedFiles.filter(file => 
      repo.expectedFiles.includes(file)
    );
    
    const precision = relevantSelected.length / selectedFiles.length;
    const recall = relevantSelected.length / repo.expectedFiles.length;
    const accuracy = precision > 0 && recall > 0 ? 
      2 * (precision * recall) / (precision + recall) : 0;
    
    return {
      fileSelectionAccuracy: accuracy,
      processingSpeed: processingTime,
      tokenEfficiency: 0, // Current system baseline
      evaluationQuality: 0.75, // Simulated current quality
      memoryUsage: 200, // Simulated memory usage
      errorRate: 0.02 // Simulated error rate
    };
  }
  
  private createErrorMetrics(): BenchmarkMetrics {
    return {
      fileSelectionAccuracy: 0,
      processingSpeed: 0,
      tokenEfficiency: 0,
      evaluationQuality: 0,
      memoryUsage: 0,
      errorRate: 1.0
    };
  }
  
  private calculateAverageMetrics(results: BenchmarkMetrics[]): BenchmarkMetrics {
    const validResults = results.filter(r => r.errorRate < 1.0);
    
    if (validResults.length === 0) {
      return this.createErrorMetrics();
    }
    
    return {
      fileSelectionAccuracy: this.average(validResults.map(r => r.fileSelectionAccuracy)),
      processingSpeed: this.average(validResults.map(r => r.processingSpeed)),
      tokenEfficiency: this.average(validResults.map(r => r.tokenEfficiency)),
      cacheHitRate: this.average(validResults.map(r => r.cacheHitRate || 0)),
      evaluationQuality: this.average(validResults.map(r => r.evaluationQuality)),
      memoryUsage: this.average(validResults.map(r => r.memoryUsage)),
      errorRate: results.filter(r => r.errorRate > 0).length / results.length
    };
  }
  
  private average(numbers: number[]): number {
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
  
  private generateComparison(current: SystemBenchmark, hybrid: SystemBenchmark): BenchmarkComparison {
    const improvements = {
      accuracyImprovement: hybrid.averageMetrics.fileSelectionAccuracy - current.averageMetrics.fileSelectionAccuracy,
      speedImprovement: (current.averageMetrics.processingSpeed - hybrid.averageMetrics.processingSpeed) / current.averageMetrics.processingSpeed,
      tokenReduction: hybrid.averageMetrics.tokenEfficiency,
      qualityImprovement: hybrid.averageMetrics.evaluationQuality - current.averageMetrics.evaluationQuality
    };
    
    // Determine recommendation based on targets
    let recommendation: 'proceed' | 'needs_improvement' | 'abort' = 'proceed';
    
    if (improvements.accuracyImprovement < HYBRID_CONFIG.ACCURACY_IMPROVEMENT_TARGET) {
      recommendation = 'needs_improvement';
    }
    if (improvements.speedImprovement < HYBRID_CONFIG.SPEED_IMPROVEMENT_TARGET) {
      recommendation = 'needs_improvement';
    }
    if (improvements.tokenReduction < HYBRID_CONFIG.TOKEN_REDUCTION_TARGET) {
      recommendation = 'needs_improvement';
    }
    
    return {
      current,
      hybrid,
      improvements,
      recommendation
    };
  }
  
  addTestRepository(repo: TestRepository): void {
    this.testRepositories.push(repo);
  }
  
  getTestRepositories(): TestRepository[] {
    return [...this.testRepositories];
  }
}
