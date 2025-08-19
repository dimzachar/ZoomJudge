/**
 * Semantic File Analyzer - Content-independent file analysis
 * Removes hardcoded patterns and uses semantic understanding
 */

export interface FileAnalysis {
  semanticPurpose: string;
  technicalContext: string;
  importanceScore: number;
  criterionRelevance: string[];
  confidence: number;
}

export interface SemanticFileGroup {
  purpose: string;
  files: string[];
  importance: 'essential' | 'important' | 'supporting';
  confidence: number;
}

export class SemanticFileAnalyzer {
  
  /**
   * Analyze a file's semantic purpose and importance
   */
  analyzeFile(fileName: string, courseType: string): FileAnalysis {
    const pathSegments = fileName.split('/');
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const baseName = fileName.split('/').pop()?.toLowerCase() || '';
    const directory = pathSegments.length > 1 ? pathSegments[pathSegments.length - 2] : '';

    return {
      semanticPurpose: this.extractSemanticPurpose(pathSegments, baseName, extension),
      technicalContext: this.extractTechnicalContext(extension, pathSegments, baseName),
      importanceScore: this.calculateImportanceScore(fileName, courseType, baseName, extension, directory),
      criterionRelevance: this.mapToCriteria(fileName, courseType, baseName, extension),
      confidence: this.calculateConfidence(fileName, baseName, extension)
    };
  }

  /**
   * Group files by semantic purpose
   */
  groupFilesBySemantic(files: string[], courseType: string): SemanticFileGroup[] {
    const groups = new Map<string, string[]>();
    const analyses = files.map(file => ({
      file,
      analysis: this.analyzeFile(file, courseType)
    }));

    // Group by semantic purpose
    analyses.forEach(({ file, analysis }) => {
      const purpose = analysis.semanticPurpose;
      if (!groups.has(purpose)) {
        groups.set(purpose, []);
      }
      groups.get(purpose)!.push(file);
    });

    // Convert to semantic groups with importance classification
    return Array.from(groups.entries()).map(([purpose, groupFiles]) => {
      const avgImportance = groupFiles.reduce((sum, file) => {
        const analysis = this.analyzeFile(file, courseType);
        return sum + analysis.importanceScore;
      }, 0) / groupFiles.length;

      const importance = this.classifyImportance(avgImportance);
      const confidence = this.calculateGroupConfidence(groupFiles, courseType);

      return {
        purpose,
        files: groupFiles,
        importance,
        confidence
      };
    }).sort((a, b) => {
      // Sort by importance: essential > important > supporting
      const importanceOrder = { essential: 3, important: 2, supporting: 1 };
      return importanceOrder[b.importance] - importanceOrder[a.importance];
    });
  }

  /**
   * Extract semantic purpose from file path and name
   */
  private extractSemanticPurpose(pathSegments: string[], baseName: string, extension: string): string {
    // Configuration and setup files
    if (this.isConfigurationFile(baseName, extension, pathSegments)) {
      return 'configuration';
    }

    // Documentation
    if (this.isDocumentationFile(baseName, extension)) {
      return 'documentation';
    }

    // Testing
    if (this.isTestFile(pathSegments, baseName)) {
      return 'testing';
    }

    // Deployment and infrastructure
    if (this.isDeploymentFile(pathSegments, baseName, extension)) {
      return 'deployment';
    }

    // Data processing and pipelines
    if (this.isDataProcessingFile(pathSegments, baseName)) {
      return 'data_processing';
    }

    // Machine learning and models
    if (this.isMLFile(pathSegments, baseName)) {
      return 'machine_learning';
    }

    // API and backend services
    if (this.isAPIFile(pathSegments, baseName)) {
      return 'api_backend';
    }

    // Database and storage
    if (this.isDatabaseFile(pathSegments, baseName, extension)) {
      return 'database';
    }

    // Orchestration and workflows
    if (this.isOrchestrationFile(pathSegments, baseName)) {
      return 'orchestration';
    }

    // Frontend and UI
    if (this.isFrontendFile(pathSegments, baseName, extension)) {
      return 'frontend';
    }

    // Scripts and utilities
    if (this.isScriptFile(pathSegments, baseName, extension)) {
      return 'scripts';
    }

    return 'general';
  }

  /**
   * Extract technical context from file characteristics
   */
  private extractTechnicalContext(extension: string, pathSegments: string[], baseName: string): string {
    const contexts: string[] = [];

    // Language context
    const languageMap: Record<string, string> = {
      'py': 'python',
      'js': 'javascript',
      'ts': 'typescript',
      'sql': 'sql',
      'tf': 'terraform',
      'yml': 'yaml',
      'yaml': 'yaml',
      'json': 'json',
      'sh': 'shell',
      'dockerfile': 'docker'
    };

    if (languageMap[extension]) {
      contexts.push(languageMap[extension]);
    }

    // Framework context
    if (pathSegments.some(seg => /dbt/i.test(seg))) contexts.push('dbt');
    if (pathSegments.some(seg => /airflow|dags/i.test(seg))) contexts.push('airflow');
    if (pathSegments.some(seg => /terraform|infrastructure/i.test(seg))) contexts.push('terraform');
    if (pathSegments.some(seg => /docker/i.test(seg)) || baseName.includes('docker')) contexts.push('docker');
    if (pathSegments.some(seg => /kubernetes|k8s/i.test(seg))) contexts.push('kubernetes');
    if (pathSegments.some(seg => /github|workflows/i.test(seg))) contexts.push('ci_cd');

    return contexts.join('_') || 'general';
  }

  /**
   * Calculate importance score based on semantic analysis
   */
  private calculateImportanceScore(
    fileName: string,
    courseType: string,
    baseName: string,
    extension: string,
    directory: string
  ): number {
    let score = 0;

    // High importance for notebook files
    if (baseName.endsWith('.ipynb')) {
      score += 80;
    }
    
    // Base score for essential files
    if (baseName === 'readme.md') score += 90;
    if (baseName === 'requirements.txt') score += 85;
    if (baseName === 'Dockerfile' || baseName === 'dockerfile') score += 80;
    if (baseName === '.pre-commit-config.yaml') score += 75;
    
    // GitHub workflow files
    if (fileName.includes('.github/workflows/')) score += 70;

    // Course-specific scoring
    switch (courseType) {
      case 'mlops':
        score += this.scoreMLOpsFile(fileName, baseName, extension, directory);
        break;
      case 'data-engineering':
        score += this.scoreDataEngineeringFile(fileName, baseName, extension, directory);
        break;
      case 'llm':
        score += this.scoreLLMFile(fileName, baseName, extension, directory);
        break;
      default:
        score += this.scoreGeneralFile(fileName, baseName, extension, directory);
    }

    // Depth penalty (prefer files closer to root)
    const depth = fileName.split('/').length - 1;
    score -= depth * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score MLOps-specific files
   */
  private scoreMLOpsFile(fileName: string, baseName: string, extension: string, directory: string): number {
    let score = 0;

    // Pipeline files
    if (/pipeline|workflow|orchestrat/i.test(fileName)) score += 80;
    if (/train|model|predict/i.test(baseName)) score += 75;
    if (/deploy|lambda|function/i.test(baseName)) score += 70;
    if (/ingest|data/i.test(baseName) && extension === 'py') score += 65;

    // MLOps tools
    if (/mlflow|wandb|kubeflow/i.test(fileName)) score += 60;
    if (/monitoring|logging/i.test(fileName)) score += 55;

    // Infrastructure
    if (extension === 'tf' || /terraform/i.test(directory)) score += 50;
    if (/github.*workflow/i.test(fileName)) score += 45;

    return score;
  }

  /**
   * Score Data Engineering files
   */
  private scoreDataEngineeringFile(fileName: string, baseName: string, extension: string, directory: string): number {
    let score = 0;

    // DBT files
    if (/dbt/i.test(fileName)) {
      if (baseName === 'dbt_project.yml') score += 90;
      if (extension === 'sql') score += 75;
      if (/staging|marts|core/i.test(fileName)) score += 70;
    }

    // Terraform
    if (extension === 'tf') {
      if (baseName === 'main.tf') score += 85;
      score += 60;
    }

    // Orchestration
    if (/airflow|dags|orchestration/i.test(fileName)) score += 70;
    if (/etl|pipeline/i.test(baseName)) score += 65;

    // Processing
    if (/processing|dataflow/i.test(directory)) score += 60;

    return score;
  }

  /**
   * Score LLM project files
   */
  private scoreLLMFile(fileName: string, baseName: string, extension: string, directory: string): number {
    let score = 0;

    // Core LLM functionality
    if (/rag|retrieval/i.test(fileName)) score += 80;
    if (/ingest|prep|embedding/i.test(baseName)) score += 75;
    if (/backend.*api/i.test(fileName)) score += 70;
    if (/search|query/i.test(baseName)) score += 65;

    // Vector databases and storage
    if (/vector|chroma|pinecone|weaviate/i.test(fileName)) score += 60;
    if (/database|db/i.test(baseName)) score += 55;

    return score;
  }

  /**
   * Score general files
   */
  private scoreGeneralFile(fileName: string, baseName: string, extension: string, directory: string): number {
    let score = 0;

    // Main application files
    if (/main|app|index/i.test(baseName)) score += 60;
    if (/config|settings/i.test(baseName)) score += 50;
    if (/utils|helpers/i.test(baseName)) score += 30;

    // Tests
    if (/test|spec/i.test(fileName)) score += 40;

    return score;
  }

  // Helper methods for file type detection
  private isConfigurationFile(baseName: string, extension: string, pathSegments: string[]): boolean {
    const configFiles = ['requirements.txt', 'package.json', 'dockerfile', 'Dockerfile', 'docker-compose.yml', 'config.yaml', 'config.yml', 'setup.py', 'pyproject.toml', '.pre-commit-config.yaml'];
    const configExtensions = ['toml', 'ini', 'conf', 'cfg', 'yaml', 'yml'];
    
    // Check if it's a known config file by name (case-insensitive)
    if (configFiles.some(file => file.toLowerCase() === baseName.toLowerCase())) {
      return true;
    }
    
    // Check if it's a config file by extension
    if (configExtensions.includes(extension)) {
      return true;
    }
    
    // Check if file is in a config directory
    if (pathSegments.some(segment => /config|conf|settings/i.test(segment))) {
      return true;
    }
    
    // Check if filename suggests it's a config file
    if (/config|settings/i.test(baseName)) {
      return true;
    }
    
    return false;
  }

  private isDocumentationFile(baseName: string, extension: string): boolean {
    return extension === 'md' || extension === 'txt' || /readme|doc|guide/i.test(baseName);
  }

  private isTestFile(pathSegments: string[], baseName: string): boolean {
    return pathSegments.some(seg => /test|spec/i.test(seg)) || /test|spec/i.test(baseName);
  }

  private isDeploymentFile(pathSegments: string[], baseName: string, extension: string): boolean {
    return /deploy|infrastructure|terraform|k8s|kubernetes/i.test(pathSegments.join('/')) ||
           /deploy|lambda|function/i.test(baseName) ||
           extension === 'tf' ||
           /github.*workflow/i.test(pathSegments.join('/')) ||
           (pathSegments.includes('.github') && pathSegments.includes('workflows'));
  }

  private isDataProcessingFile(pathSegments: string[], baseName: string): boolean {
    return /pipeline|processing|etl|data/i.test(pathSegments.join('/')) ||
           /ingest|extract|transform|load|pipeline/i.test(baseName);
  }

  private isMLFile(pathSegments: string[], baseName: string): boolean {
    return /model|ml|train|predict|machine.learning/i.test(pathSegments.join('/')) ||
           /train|model|predict|ml/i.test(baseName);
  }

  private isAPIFile(pathSegments: string[], baseName: string): boolean {
    return /api|backend|server|service/i.test(pathSegments.join('/')) ||
           /api|app|server|service/i.test(baseName);
  }

  private isDatabaseFile(pathSegments: string[], baseName: string, extension: string): boolean {
    return extension === 'sql' ||
           /database|db|migration|schema/i.test(pathSegments.join('/')) ||
           /db|database|migration/i.test(baseName);
  }

  private isOrchestrationFile(pathSegments: string[], baseName: string): boolean {
    return /orchestration|workflow|dags|airflow|prefect|dagster/i.test(pathSegments.join('/')) ||
           /orchestrat|workflow|dag/i.test(baseName);
  }

  private isFrontendFile(pathSegments: string[], baseName: string, extension: string): boolean {
    const frontendExtensions = ['html', 'css', 'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte'];
    return frontendExtensions.includes(extension) ||
           /frontend|ui|components|pages/i.test(pathSegments.join('/'));
  }

  private isScriptFile(pathSegments: string[], baseName: string, extension: string): boolean {
    return extension === 'sh' ||
           /scripts|bin|tools/i.test(pathSegments.join('/')) ||
           /script|run|build|deploy/i.test(baseName);
  }

  /**
   * Map file to evaluation criteria
   */
  private mapToCriteria(fileName: string, courseType: string, baseName: string, extension: string): string[] {
    const criteria: string[] = [];

    switch (courseType) {
      case 'mlops':
        if (/pipeline|ingest|data/i.test(fileName)) criteria.push('data_pipeline');
        if (/train|model/i.test(fileName)) criteria.push('model_training');
        if (/deploy|lambda|function/i.test(fileName)) criteria.push('deployment');
        if (/monitor|logging/i.test(fileName)) criteria.push('monitoring');
        if (/test/i.test(fileName)) criteria.push('testing');
        break;

      case 'data-engineering':
        if (/dbt/i.test(fileName)) criteria.push('data_modeling');
        if (/terraform|infrastructure/i.test(fileName)) criteria.push('infrastructure');
        if (/orchestration|airflow|dags/i.test(fileName)) criteria.push('orchestration');
        if (/processing|etl/i.test(fileName)) criteria.push('data_processing');
        break;

      case 'llm':
        if (/rag|retrieval/i.test(fileName)) criteria.push('retrieval_system');
        if (/ingest|prep/i.test(fileName)) criteria.push('data_preparation');
        if (/api|backend/i.test(fileName)) criteria.push('api_implementation');
        if (/search|query/i.test(fileName)) criteria.push('search_functionality');
        break;
    }

    // General criteria
    // Compute path segments for configuration file check
    const pathSegments = fileName.split('/');
    
    if (this.isDocumentationFile(baseName, extension)) criteria.push('documentation');
    if (this.isTestFile([fileName], baseName)) criteria.push('testing');
    if (this.isConfigurationFile(baseName, extension, pathSegments)) criteria.push('configuration');

    return criteria;
  }

  /**
   * Calculate confidence in the analysis
   */
  private calculateConfidence(fileName: string, baseName: string, extension: string): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for well-known file types
    if (['py', 'sql', 'tf', 'yml', 'yaml', 'json', 'md'].includes(extension)) {
      confidence += 0.2;
    }

    // Higher confidence for descriptive file names
    if (baseName.length > 5 && /[_-]/.test(baseName)) {
      confidence += 0.1;
    }

    // Higher confidence for files in well-structured directories
    const pathDepth = fileName.split('/').length - 1;
    if (pathDepth > 0 && pathDepth < 4) {
      confidence += 0.1;
    }

    return Math.min(0.95, confidence);
  }

  /**
   * Classify importance level
   */
  private classifyImportance(score: number): 'essential' | 'important' | 'supporting' {
    if (score >= 85) return 'essential';
    if (score >= 60) return 'important';
    return 'supporting';
  }

  /**
   * Calculate group confidence
   */
  private calculateGroupConfidence(files: string[], courseType: string): number {
    const analyses = files.map(file => this.analyzeFile(file, courseType));
    const avgConfidence = analyses.reduce((sum, analysis) => sum + analysis.confidence, 0) / analyses.length;
    
    // Boost confidence for larger groups (more evidence)
    const sizeBoost = Math.min(0.1, files.length * 0.02);
    
    return Math.min(0.95, avgConfidence + sizeBoost);
  }
}
