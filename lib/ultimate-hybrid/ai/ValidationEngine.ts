/**
 * AI Validation Engine - Cost-efficient validation of file selection results
 * Analyzes file names only (not content) to validate and improve selections
 */

import { evaluationLogger } from '../../simple-logger';
import { getOpenRouterClient } from '../../openrouter';
import { HYBRID_CONFIG } from '../config';

export interface ValidationRequest {
  allFiles: string[];
  selectedFiles: string[];
  courseId: string;
  courseName: string;
  repoUrl: string;
  selectionMethod: string;
  confidence: number;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  suggestions: {
    missingCritical: string[];
    redundantFiles: string[];
    additionalRecommended: string[];
  };
  reasoning: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  processingTime: number;
}

export interface ValidationSuggestion {
  action: 'add' | 'remove' | 'replace';
  file: string;
  reason: string;
  importance: 'critical' | 'important' | 'optional';
}

export class ValidationEngine {
  private currentEvaluationId: string | null = null;

  /**
   * Set the current evaluation ID for logging
   */
  setEvaluationId(evaluationId: string) {
    this.currentEvaluationId = evaluationId;
  }

  /**
   * Validate a file selection using AI analysis of file names only
   */
  async validateSelection(request: ValidationRequest): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      console.log('🤖 AI Validation - Analyzing file selection...');
      console.log(`   Selected: ${request.selectedFiles.length}/${request.allFiles.length} files`);
      console.log(`   Course: ${request.courseName} (${request.courseId})`);
      console.log(`   Method: ${request.selectionMethod} (confidence: ${(request.confidence * 100).toFixed(1)}%)`);

      // Log validation start
      await evaluationLogger.logGeneral(
        'AI_VALIDATION_START',
        'INFO',
        'Starting AI validation of file selection',
        {
          repoUrl: request.repoUrl,
          courseId: request.courseId,
          selectedFiles: request.selectedFiles.length,
          totalFiles: request.allFiles.length,
          selectionMethod: request.selectionMethod,
          evaluationId: this.currentEvaluationId
        }
      );

      // Create validation prompt
      const prompt = this.createValidationPrompt(request);
      
      // For now, simulate AI validation since we need to add a validation method to OpenRouter client
      // TODO: Add a dedicated validation method to OpenRouterClient
      const validationResult = this.simulateValidationResponse(request);

      const processingTime = Date.now() - startTime;

      // Simulate token usage
      const tokenUsage = {
        promptTokens: prompt.length / 4, // Rough estimate: 4 chars per token
        completionTokens: 200, // Estimated response tokens
        totalTokens: prompt.length / 4 + 200
      };

      console.log(`✅ AI Validation completed in ${processingTime}ms`);
      console.log(`   Tokens used: ${tokenUsage.totalTokens} (${tokenUsage.promptTokens} + ${tokenUsage.completionTokens})`);
      console.log(`   Validation confidence: ${(validationResult.confidence * 100).toFixed(1)}%`);

      if (validationResult.suggestions.missingCritical.length > 0) {
        console.log(`   Missing critical files: ${validationResult.suggestions.missingCritical.join(', ')}`);
      }

      if (validationResult.suggestions.redundantFiles.length > 0) {
        console.log(`   Redundant files: ${validationResult.suggestions.redundantFiles.join(', ')}`);
      }

      // Log validation completion
      await evaluationLogger.logGeneral(
        'AI_VALIDATION_COMPLETE',
        'INFO',
        'AI validation completed',
        {
          isValid: validationResult.isValid,
          confidence: validationResult.confidence,
          missingCritical: validationResult.suggestions.missingCritical.length,
          redundantFiles: validationResult.suggestions.redundantFiles.length,
          tokenUsage: tokenUsage.totalTokens,
          processingTime
        }
      );

      return {
        ...validationResult,
        tokenUsage,
        processingTime
      };

    } catch (error) {
      console.error('Error in AI validation:', error);
      
      // Log validation error
      await evaluationLogger.logGeneral(
        'AI_VALIDATION_ERROR',
        'ERROR',
        'AI validation failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          repoUrl: request.repoUrl,
          courseId: request.courseId
        }
      );

      // Return fallback result
      return {
        isValid: true, // Assume valid if validation fails
        confidence: request.confidence,
        suggestions: {
          missingCritical: [],
          redundantFiles: [],
          additionalRecommended: []
        },
        reasoning: 'Validation failed, assuming selection is valid',
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Create validation prompt for AI analysis
   */
  private createValidationPrompt(request: ValidationRequest): string {
    const courseContext = this.getCourseContext(request.courseId);
    
    return `You are an expert code reviewer analyzing a repository file selection for ${request.courseName} evaluation.

TASK: Validate if the selected files are sufficient for evaluating this ${request.courseId} project.

REPOSITORY CONTEXT:
- Repository: ${request.repoUrl}
- Total files: ${request.allFiles.length}
- Selected files: ${request.selectedFiles.length}
- Selection method: ${request.selectionMethod}
- Selection confidence: ${(request.confidence * 100).toFixed(1)}%

COURSE REQUIREMENTS (${request.courseId}):
${courseContext}

ALL REPOSITORY FILES (names only):
${request.allFiles.slice(0, 100).join('\n')}${request.allFiles.length > 100 ? '\n... and ' + (request.allFiles.length - 100) + ' more files' : ''}

CURRENTLY SELECTED FILES:
${request.selectedFiles.join('\n')}

ANALYSIS INSTRUCTIONS:
1. Based on FILE NAMES AND PATHS ONLY (no content analysis)
2. Evaluate if selected files cover the key evaluation criteria for ${request.courseId}
3. Identify any critical files that are missing
4. Identify any redundant or irrelevant files in the selection
5. Consider the course-specific requirements and best practices

Respond in JSON format:
{
  "isValid": boolean,
  "confidence": number (0.0-1.0),
  "suggestions": {
    "missingCritical": ["file1.py", "file2.sql"],
    "redundantFiles": ["file3.txt"],
    "additionalRecommended": ["file4.yml"]
  },
  "reasoning": "Brief explanation of the validation decision"
}

Focus on files that are ESSENTIAL for ${request.courseId} evaluation. Be conservative - only flag truly critical missing files.`;
  }

  /**
   * Get course-specific context for validation
   */
  private getCourseContext(courseId: string): string {
    const contexts = {
      'mlops': `
MLOps projects should demonstrate:
- Data pipeline implementation (ingestion, processing, training)
- Model training and deployment automation
- Infrastructure as code (Terraform, Docker)
- CI/CD workflows for ML models
- Monitoring and logging setup
- Configuration management

Key file patterns to look for:
- Pipeline files: *pipeline*, *train*, *deploy*, *ingest*
- Infrastructure: *.tf, Dockerfile, docker-compose.yml
- Configuration: requirements.txt, config.*, setup.py
- Workflows: .github/workflows/*, scripts/*
- Models: model.*, *model*, lambda_function.py`,

      'data-engineering': `
Data Engineering projects should demonstrate:
- Data modeling with dbt (staging, marts, core models)
- Infrastructure provisioning (Terraform)
- Data orchestration (Airflow, Prefect)
- Data processing pipelines
- Data quality and testing

Key file patterns to look for:
- DBT: dbt_project.yml, models/**/*.sql, dbt/profiles.yml
- Infrastructure: *.tf, terraform/*, infrastructure/*
- Orchestration: dags/*, orchestration/*, airflow/*
- Processing: processing/*, etl.*, dataflow/*
- Configuration: requirements.txt, docker-compose.yml`,

      'llm': `
LLM/RAG projects should demonstrate:
- RAG system implementation (retrieval, generation)
- Data ingestion and preprocessing
- Vector database integration
- API implementation for search/query
- Backend services architecture

Key file patterns to look for:
- RAG: *rag*, *retrieval*, *ingest*, *prep*
- API: backend/api/*, *api*, app.py, main.py
- Processing: *prep*, *ingest*, *embedding*
- Configuration: requirements.txt, docker-compose.yml
- Database: *db*, *database*, *vector*`,

      'machine-learning': `
Machine Learning projects should demonstrate:
- Model training and evaluation
- Data preprocessing and feature engineering
- Model deployment and serving
- Experiment tracking and reproducibility
- Testing and validation

Key file patterns to look for:
- Training: *train*, *model*, *ml*, *.ipynb
- Data: *data*, *preprocess*, *feature*
- Deployment: *deploy*, *serve*, *api*
- Configuration: requirements.txt, config.*
- Experiments: *experiment*, *track*`
    };

    return contexts[courseId as keyof typeof contexts] || 'General software project evaluation focusing on code quality, documentation, and best practices.';
  }

  /**
   * Simulate AI validation response (temporary until OpenRouter integration is complete)
   */
  private simulateValidationResponse(request: ValidationRequest): Omit<ValidationResult, 'tokenUsage' | 'processingTime'> {
    // Simple heuristic-based validation
    const missingCritical: string[] = [];
    const redundantFiles: string[] = [];
    const additionalRecommended: string[] = [];

    // Check for essential files based on course type
    const essentialFiles = this.getEssentialFiles(request.courseId);
    for (const essential of essentialFiles) {
      if (!request.selectedFiles.some(file => file.includes(essential))) {
        const found = request.allFiles.find(file => file.includes(essential));
        if (found) {
          missingCritical.push(found);
        }
      }
    }

    // Check for redundant files (logs, temp files, etc.)
    const redundantPatterns = ['.log', '.tmp', '.cache', 'node_modules', '__pycache__'];
    for (const file of request.selectedFiles) {
      if (redundantPatterns.some(pattern => file.includes(pattern))) {
        redundantFiles.push(file);
      }
    }

    // Check for large dependency files that should be excluded
    for (const file of request.selectedFiles) {
      if (this.isLargeDependencyFile(file)) {
        redundantFiles.push(file);
      }
    }

    // Log what files are being identified as redundant for debugging
    if (redundantFiles.length > 0) {
      console.log(`🔍 Validation engine identifying redundant files: ${redundantFiles.join(', ')}`);
    }

    // Calculate confidence based on selection quality
    const confidence = Math.max(0.5, Math.min(0.95,
      (request.selectedFiles.length / Math.max(1, missingCritical.length + redundantFiles.length)) * 0.8
    ));

    return {
      isValid: missingCritical.length === 0 && redundantFiles.length === 0,
      confidence,
      suggestions: {
        missingCritical,
        redundantFiles,
        additionalRecommended
      },
      reasoning: `Heuristic validation: ${missingCritical.length} missing critical files, ${redundantFiles.length} redundant files identified.`
    };
  }

  /**
   * Get essential files for a course type
   */
  private getEssentialFiles(courseId: string): string[] {
    const essentialMap: Record<string, string[]> = {
      'mlops': ['README', 'requirements', 'pipeline', 'model', 'train'],
      'data-engineering': ['README', 'dbt_project', 'main.tf', 'dag'],
      'llm': ['README', 'ingest', 'search', 'app', 'requirements']
    };
    return essentialMap[courseId] || ['README', 'requirements'];
  }

  /**
   * Check if a file is a large dependency file that should be excluded from selection
   */
  private isLargeDependencyFile(filePath: string): boolean {
    const baseName = filePath.split('/').pop()?.toLowerCase() || '';
    
    // Explicitly allow important configuration files that should be included in evaluation
    const allowedFiles = [
      'dockerfile',
      '.pre-commit-config.yaml'
    ];
    
    // Check if this is an explicitly allowed file
    if (allowedFiles.includes(baseName)) {
      return false; // Don't exclude these files
    }
    
    // Filter out empty __init__.py files which don't contain useful code for evaluation
    if (baseName === '__init__.py') {
      console.log(`🔍 Empty __init__.py file identified: ${filePath}`);
      return true;
    }
    
    // Common large dependency/lock files that aren't useful for evaluation
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
    
    // Check exact file name matches
    if (largeDependencyFiles.includes(baseName)) {
      console.log(`🔍 Large dependency file identified (exact match): ${filePath}`);
      return true;
    }
    
    // Check for lock files pattern (files ending with .lock)
    if (baseName.endsWith('.lock')) {
      console.log(`🔍 Large dependency file identified (lock pattern): ${filePath}`);
      return true;
    }
    
    // Large binary files that aren't useful for code evaluation
    const largeBinaryExtensions = [
      '.zip', '.tar', '.gz', '.7z', '.rar', '.iso',
      '.exe', '.msi', '.dmg', '.deb', '.rpm',
      '.jar', '.war', '.ear',
      '.so', '.dll', '.dylib',
      '.xgb' // XGBoost model files
    ];
    
    // Image files that aren't useful for code evaluation
    const imageExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
      '.bmp', '.tiff', '.ico', '.psd', '.ai'
    ];

    // Note: Dashboard evidence should come from text documentation, not large image files
    // Large images consume excessive tokens and are not cost-effective for evaluation

    const allBinaryExtensions = [...largeBinaryExtensions, ...imageExtensions];

    for (const ext of allBinaryExtensions) {
      if (baseName.endsWith(ext)) {
        console.log(`🔍 Large dependency file identified (binary extension): ${filePath}`);
        return true;
      }
    }
    
    return false;
  }



  /**
   * Parse AI validation response
   */
  private parseValidationResponse(response: string): Omit<ValidationResult, 'tokenUsage' | 'processingTime'> {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        isValid: parsed.isValid || false,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        suggestions: {
          missingCritical: Array.isArray(parsed.suggestions?.missingCritical) 
            ? parsed.suggestions.missingCritical 
            : [],
          redundantFiles: Array.isArray(parsed.suggestions?.redundantFiles) 
            ? parsed.suggestions.redundantFiles 
            : [],
          additionalRecommended: Array.isArray(parsed.suggestions?.additionalRecommended) 
            ? parsed.suggestions.additionalRecommended 
            : []
        },
        reasoning: parsed.reasoning || 'No reasoning provided'
      };

    } catch (error) {
      console.error('Error parsing validation response:', error);
      console.log('Raw response:', response);

      // Return fallback validation
      return {
        isValid: true,
        confidence: 0.5,
        suggestions: {
          missingCritical: [],
          redundantFiles: [],
          additionalRecommended: []
        },
        reasoning: 'Failed to parse AI validation response'
      };
    }
  }

  /**
   * Apply validation suggestions to improve file selection
   */
  async applyValidationSuggestions(
    originalSelection: string[],
    allFiles: string[],
    validation: ValidationResult
  ): Promise<{
    improvedSelection: string[];
    changes: ValidationSuggestion[];
  }> {
    const improvedSelection = new Set(originalSelection);
    const changes: ValidationSuggestion[] = [];

    // Add missing critical files
    for (const file of validation.suggestions.missingCritical) {
      if (allFiles.includes(file) && !improvedSelection.has(file)) {
        improvedSelection.add(file);
        changes.push({
          action: 'add',
          file,
          reason: 'Critical file identified by AI validation',
          importance: 'critical'
        });
      }
    }

    // Remove redundant files
    for (const file of validation.suggestions.redundantFiles) {
      if (improvedSelection.has(file)) {
        improvedSelection.delete(file);
        changes.push({
          action: 'remove',
          file,
          reason: 'Redundant file identified by AI validation',
          importance: 'optional'
        });
      }
    }

    // Add recommended files (if space allows)
      const maxFiles = HYBRID_CONFIG.MAX_FILES_PER_EVALUATION;
    for (const file of validation.suggestions.additionalRecommended) {
      if (improvedSelection.size >= maxFiles) break;
      
      if (allFiles.includes(file) && !improvedSelection.has(file)) {
        improvedSelection.add(file);
        changes.push({
          action: 'add',
          file,
          reason: 'Recommended file identified by AI validation',
          importance: 'important'
        });
      }
    }

    return {
      improvedSelection: Array.from(improvedSelection),
      changes
    };
  }
}
