/**
 * Criterion-Driven File Selection
 * Maps files to specific course evaluation criteria
 */

import { HYBRID_CONFIG } from '../config';

export interface CourseCriterion {
  name: string;
  description: string;
  maxScore: number;
}

export interface CriterionFileMapping {
  criterionName: string;
  filePatterns: string[];
  contentKeywords: string[];
  priority: number;
  maxFiles: number;
  weight: number; // Importance weight for this criterion
}

export interface CriterionCoverage {
  criterionName: string;
  relevantFiles: string[];
  coverage: number; // 0-1 score
  confidence: number;
  missingElements: string[];
}

export class CriterionMapper {
  private criterionMappings: Record<string, CriterionFileMapping[]> = {};
  
  constructor() {
    this.initializeCriterionMappings();
  }
  
  private initializeCriterionMappings() {
    // MLOps Course Criteria Mappings
    this.criterionMappings['mlops'] = [
      {
        criterionName: 'Problem description',
        filePatterns: ['README.md', 'README.rst', 'docs/**/*.md', '*.ipynb'],
        contentKeywords: ['problem', 'objective', 'goal', 'purpose', 'description', 'overview'],
        priority: 100,
        maxFiles: 5,
        weight: 2 // 2 points max
      },
      {
        criterionName: 'Workflow orchestration',
        filePatterns: [
          'modeling/flows/*.py', 'modeling/flows/**/*.py', 'flows/*.py', 'flows/**/*.py',
          'src/pipeline/*.py', 'src/pipeline/**/*.py', 'pipeline/*.py', 'pipeline/**/*.py',
          'dags/**/*.py', 'orchestration/**/*.py', 'workflows/**/*.py',
          'airflow/**/*.py', 'prefect/**/*.py', 'dagster/**/*.py',
          'ml_pipeline/**/*.py', 'orchestrate.py', 'src/pipeline/orchestrate.py',
          'modeling/flows/collection_pipeline.py', 'modeling/flows/training_pipeline.py', 'modeling/flows/register_flows.py'
        ],
        contentKeywords: ['dag', 'workflow', 'orchestration', 'pipeline', 'airflow', 'prefect', 'schedule', 'flow'],
        priority: 95,
        maxFiles: 8,
        weight: 4 // 4 points max
      },
      {
        criterionName: 'Model deployment',
        filePatterns: [
          'modeling/app.py', 'modeling/service/*.py', 'service/*.py',
          'lambda_function.py', 'model.py', 'src/models/*.py',
          'deploy/**/*.py', 'deployment/**/*.py', 'serve/**/*.py',
          'api/**/*.py', 'app.py', 'main.py', 'Dockerfile',
          'docker-compose.yml', 'kubernetes/**/*.yaml',
          'scripts/deploy*.py', 'scripts/deploy*.sh',
          'modeling/service/model_creation.py', 'modeling/service/model_optimization.py'
        ],
        contentKeywords: ['deploy', 'serve', 'api', 'endpoint', 'docker', 'container', 'kubernetes', 'lambda', 'model'],
        priority: 90,
        maxFiles: 8,
        weight: 4
      },
      {
        criterionName: 'Model monitoring',
        filePatterns: [
          'modeling/service/metric_monitoring.py', 'modeling/service/monitoring.py',
          'monitoring/**/*.py', 'metrics/**/*.py', 'alerts/**/*.py',
          'dashboard/**/*.py', 'grafana/**/*', 'prometheus/**/*',
          'service/metric_monitoring.py', 'service/monitoring.py'
        ],
        contentKeywords: ['monitor', 'metrics', 'alert', 'dashboard', 'grafana', 'prometheus', 'logging'],
        priority: 85,
        maxFiles: 6,
        weight: 4
      },
      {
        criterionName: 'Reproducibility',
        filePatterns: [
          'requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile',
          'Dockerfile', 'docker-compose.yml', 'Makefile',
          'scripts/**/*.sh', '.github/**/*.yml', '.github/workflows/*.yml',
          'integration_test/model/requirements.txt'
        ],
        contentKeywords: ['install', 'setup', 'requirements', 'dependencies', 'environment'],
        priority: 80,
        maxFiles: 6,
        weight: 4
      },
      {
        criterionName: 'Best practices',
        filePatterns: [
          'tests/**/*.py', 'test_*.py', '*_test.py',
          'modeling/tests/*.py', 'tests/model_test.py', 'tests/train_test.py',
          'integration_test/**/*.py',
          '.github/**/*.yml', '.pre-commit-config.yaml',
          'pyproject.toml', 'setup.cfg', 'tox.ini',
          'client/scripts/*.sh', 'scripts/*.sh'
        ],
        contentKeywords: ['test', 'lint', 'format', 'ci', 'cd', 'quality', 'coverage'],
        priority: 75,
        maxFiles: 15,
        weight: 4
      },
      {
        criterionName: 'MLOps Services',
        filePatterns: [
          'modeling/service/*.py', 'service/*.py', 'services/*.py',
          'modeling/service/training_configuration.py',
          'modeling/service/image_augmentations.py',
          'modeling/service/image_transformations.py',
          'modeling/service/cloud_storage.py'
        ],
        contentKeywords: ['service', 'configuration', 'augmentation', 'transformation', 'storage', 'training'],
        priority: 88,
        maxFiles: 6,
        weight: 4
      }
    ];
    
    // Data Engineering Course Criteria Mappings
    this.criterionMappings['data-engineering'] = [
      {
        criterionName: 'Problem description',
        filePatterns: ['README.md', 'README.rst', 'docs/**/*.md'],
        contentKeywords: ['problem', 'objective', 'data', 'pipeline', 'analytics'],
        priority: 100,
        maxFiles: 2,
        weight: 2
      },
      {
        criterionName: 'Cloud',
        filePatterns: [
          'terraform/**/*.tf', 'infrastructure/**/*.tf',
          'cloudformation/**/*.yaml', 'pulumi/**/*.py',
          'gcp/**/*', 'aws/**/*', 'azure/**/*'
        ],
        contentKeywords: ['cloud', 'terraform', 'aws', 'gcp', 'azure', 'infrastructure'],
        priority: 95,
        maxFiles: 5,
        weight: 4
      },
      {
        criterionName: 'Data Ingestion: Batch / Workflow orchestration',
        filePatterns: [
          'ingestion/**/*.py', 'etl/**/*.py', 'pipeline/**/*.py',
          'airflow/**/*.py', 'orchestration/**/*.py', 'workflows/**/*.py',
          'dags/**/*.py', 'prefect/**/*.py', 'dagster/**/*.py'
        ],
        contentKeywords: ['ingest', 'extract', 'etl', 'pipeline', 'airflow', 'orchestration', 'workflow', 'batch'],
        priority: 90,
        maxFiles: 6,
        weight: 4
      },
      {
        criterionName: 'Data Ingestion: Stream',
        filePatterns: [
          'streaming/**/*.py', 'kafka/**/*.py', 'pulsar/**/*.py',
          'stream/**/*.py', 'realtime/**/*.py'
        ],
        contentKeywords: ['stream', 'kafka', 'pulsar', 'realtime', 'consumer', 'producer'],
        priority: 88,
        maxFiles: 5,
        weight: 4
      },
      {
        criterionName: 'Data warehouse',
        filePatterns: [
          'warehouse/**/*.sql', 'dwh/**/*.sql', 'models/**/*.sql',
          'bigquery/**/*.sql', 'snowflake/**/*.sql',
          // Include Python files that likely contain SQL for data warehouse operations
          '**/*snowflake*.py', '**/*warehouse*.py', '**/*dwh*.py',
          '**/*refresh*.py', '**/*materialize*.py', '**/*transform*.py'
        ],
        contentKeywords: ['warehouse', 'dwh', 'partition', 'cluster', 'optimize', 'snowflake', 'sql', 'query'],
        priority: 85,
        maxFiles: 6, // Increased from 4 to 6 to allow more data warehouse files
        weight: 4
      },
      {
        criterionName: 'Transformations (dbt, spark, etc)',
        filePatterns: [
          'dbt/**/*.sql', 'dbt/**/*.yml', 'transformations/**/*.py',
          'spark/**/*.py', 'sql/**/*.sql',
          // Include Python files that likely contain SQL transformations
          '**/*transform*.py', '**/*etl*.py', '**/*extract*.py', '**/*load*.py',
          '**/*process*.py', '**/*clean*.py', '**/*prep*.py'
        ],
        contentKeywords: ['transform', 'dbt', 'spark', 'sql', 'model', 'etl', 'extract', 'load', 'process'],
        priority: 80,
        maxFiles: 8, // Increased from 6 to 8 to allow more transformation files
        weight: 4
      },
      {
        criterionName: 'Dashboard',
        filePatterns: [
          'dashboard/**/*', 'viz/**/*', 'looker/**/*',
          'tableau/**/*', 'streamlit/**/*.py', 'dash/**/*.py',
          // Include utility files that might contain dashboard-related data preparation
          '**/*dashboard*.py', '**/*viz*.py', '**/*report*.py',
          '**/*utils*dashboard*.py', '**/*utils*viz*.py',
          // Include files in utils directory that might contain dashboard logic
          'utils/**/*dashboard*.py', 'utils/**/*viz*.py', 'utils/**/*report*.py',
          // Include dashboard configuration and documentation files only
          // Note: Large image files are excluded to avoid excessive token usage
          'dashboard/**/*', 'metabase/**/*', 'grafana/**/*', 'tableau/**/*'
        ],
        contentKeywords: ['dashboard', 'visualization', 'chart', 'plot', 'looker', 'tableau', 'report', 'visualize'],
        priority: 75,
        maxFiles: 8, // Increased to allow dashboard code + evidence images
        weight: 4
      },
      {
        criterionName: 'Reproducibility',
        filePatterns: [
          'requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile',
          'Dockerfile', 'docker-compose.yml', 'Makefile',
          'scripts/**/*.sh', '.github/**/*.yml', '.github/workflows/*.yml'
        ],
        contentKeywords: ['install', 'setup', 'requirements', 'dependencies', 'environment', 'reproduce'],
        priority: 70,
        maxFiles: 6,
        weight: 4
      }
    ];
    
    // LLM Zoomcamp Course Criteria Mappings
    this.criterionMappings['llm-zoomcamp'] = [
      {
        criterionName: 'Problem description',
        filePatterns: ['README.md', 'docs/**/*.md'],
        contentKeywords: ['problem', 'llm', 'rag', 'chatbot', 'assistant'],
        priority: 100,
        maxFiles: 2,
        weight: 2
      },
      {
        criterionName: 'Retrieval flow',
        filePatterns: [
          'rag/**/*.py', 'retrieval/**/*.py', 'search/**/*.py',
          'embedding/**/*.py', 'vector/**/*.py'
        ],
        contentKeywords: ['rag', 'retrieval', 'embedding', 'vector', 'search', 'knowledge'],
        priority: 95,
        maxFiles: 4,
        weight: 2
      },
      {
        criterionName: 'Retrieval evaluation',
        filePatterns: [
          'evaluation/**/*.py', 'evaluation/**/*.ipynb', 'eval/**/*.py', 'eval/**/*.ipynb',
          'experiments/**/*.ipynb', 'notebooks/**/*.ipynb', 'analysis/**/*.py'
        ],
        contentKeywords: ['evaluation', 'eval', 'experiment', 'retrieval', 'baseline', 'metrics', 'comparison'],
        priority: 90,
        maxFiles: 4,
        weight: 2
      },
      {
        criterionName: 'LLM evaluation',
        filePatterns: [
          'evaluation/**/*.py', 'evaluation/**/*.ipynb', 'eval/**/*.py', 'eval/**/*.ipynb',
          'experiments/**/*.ipynb', 'notebooks/**/*.ipynb'
        ],
        contentKeywords: ['evaluation', 'eval', 'experiment', 'llm', 'prompt', 'response', 'quality'],
        priority: 90,
        maxFiles: 4,
        weight: 2
      },
      {
        criterionName: 'Interface',
        filePatterns: [
          'app/**/*.py', 'frontend/**/*.py', 'backend/**/*.py', 'api/**/*.py',
          'streamlit/**/*.py', 'gradio/**/*.py', 'flask/**/*.py', 'fastapi/**/*.py'
        ],
        contentKeywords: ['streamlit', 'gradio', 'flask', 'fastapi', 'interface', 'ui', 'app'],
        priority: 85,
        maxFiles: 3,
        weight: 2
      },
      {
        criterionName: 'Ingestion pipeline',
        filePatterns: [
          'ingest/**/*.py', 'prep/**/*.py', 'processing/**/*.py',
          'etl/**/*.py', 'pipeline/**/*.py'
        ],
        contentKeywords: ['ingest', 'process', 'pipeline', 'etl', 'prepare'],
        priority: 90,
        maxFiles: 3,
        weight: 2
      },
      {
        criterionName: 'Monitoring',
        filePatterns: [
          'monitoring/**/*.py', 'dashboard/**/*.py', 'metrics/**/*.py',
          'feedback/**/*.py', 'analytics/**/*.py'
        ],
        contentKeywords: ['monitor', 'dashboard', 'feedback', 'metrics', 'analytics'],
        priority: 85,
        maxFiles: 3,
        weight: 2
      },
      {
        criterionName: 'Best practices',
        filePatterns: [
          '*.ipynb', 'notebooks/**/*.ipynb', 'experiments/**/*.ipynb',
          'evaluation/**/*.py', 'evaluation/**/*.ipynb', 'eval/**/*.py', 'eval/**/*.ipynb',
          'analysis/**/*.py', 'analysis/**/*.ipynb', 'results/**/*.json',
          'docs/**/*.md', 'README.md', 'experiments/**/*.md'
        ],
        contentKeywords: [
          'hybrid', 'search', 'vector', 'text', 'rerank', 'reranking', 're-rank', 're-ranking',
          'query', 'rewrite', 'rewriting', 'evaluation', 'experiment', 'comparison', 'baseline'
        ],
        priority: 80,
        maxFiles: 6,
        weight: 3
      }
    ];
    
    // Machine Learning Course Criteria Mappings
    this.criterionMappings['machine-learning'] = [
      {
        criterionName: 'Problem description',
        filePatterns: ['README.md', '*.ipynb'],
        contentKeywords: ['problem', 'dataset', 'prediction', 'classification', 'regression'],
        priority: 100,
        maxFiles: 2,
        weight: 2
      },
      {
        criterionName: 'EDA',
        filePatterns: ['*.ipynb', 'eda/**/*.py', 'analysis/**/*.py'],
        contentKeywords: ['eda', 'exploratory', 'analysis', 'visualization', 'correlation'],
        priority: 95,
        maxFiles: 3,
        weight: 2
      },
      {
        criterionName: 'Model training',
        filePatterns: [
          'train/**/*.py', 'training/**/*.py', 'models/**/*.py',
          '*.ipynb', 'ml/**/*.py'
        ],
        contentKeywords: ['train', 'model', 'fit', 'sklearn', 'xgboost', 'lightgbm'],
        priority: 90,
        maxFiles: 4,
        weight: 3
      },
      {
        criterionName: 'Exporting notebook to script',
        filePatterns: ['train.py', 'training.py', 'model.py', 'src/**/*.py'],
        contentKeywords: ['train', 'model', 'script', 'export'],
        priority: 85,
        maxFiles: 2,
        weight: 1
      }
    ];
  }
  
  async mapFilesToCriteria(
    files: string[], 
    courseId: string, 
    criteria: CourseCriterion[]
  ): Promise<CriterionCoverage[]> {
    const mappings = this.criterionMappings[courseId] || [];
    const coverage: CriterionCoverage[] = [];
    
    for (const criterion of criteria) {
      const mapping = mappings.find(m => m.criterionName === criterion.name);
      
      if (!mapping) {
        // No mapping defined for this criterion
        coverage.push({
          criterionName: criterion.name,
          relevantFiles: [],
          coverage: 0,
          confidence: 0,
          missingElements: ['No file mapping defined for this criterion']
        });
        continue;
      }
      
      // Find files matching patterns
      const relevantFiles = this.findRelevantFiles(files, mapping);
      
      // Calculate coverage score
      const coverageScore = this.calculateCoveragScore(relevantFiles, mapping);
      
      coverage.push({
        criterionName: criterion.name,
        relevantFiles: relevantFiles.slice(0, mapping.maxFiles),
        coverage: coverageScore,
        confidence: relevantFiles.length > 0 ? 0.8 : 0.2,
        missingElements: this.identifyMissingElements(relevantFiles, mapping)
      });
    }
    
    return coverage;
  }
  
  private findRelevantFiles(files: string[], mapping: CriterionFileMapping): string[] {
    const relevantFiles = new Set<string>();
    
    // Match file patterns
    for (const pattern of mapping.filePatterns) {
      const matches = this.findMatchingFiles(files, pattern);
      matches.forEach(file => relevantFiles.add(file));
    }
    
    return Array.from(relevantFiles);
  }
  
  private findMatchingFiles(files: string[], pattern: string): string[] {
    // Handle exact matches and subdirectory matches
    if (!pattern.includes('*')) {
      return files.filter(file =>
        file === pattern ||
        file.toLowerCase() === pattern.toLowerCase() ||
        file.endsWith('/' + pattern) ||
        file.endsWith('\\' + pattern) ||
        file.endsWith('/' + pattern.toLowerCase()) ||
        file.endsWith('\\' + pattern.toLowerCase()) ||
        // Also match files in subdirectories (e.g., .github/.pre-commit-config.yaml)
        file.includes('/' + pattern) ||
        file.includes('\\' + pattern) ||
        file.includes('/' + pattern.toLowerCase()) ||
        file.includes('\\' + pattern.toLowerCase())
      );
    }

    // Convert glob-like patterns to regex correctly
    // Handle ** patterns (match any directory depth)
    if (pattern.includes('**')) {
      // First escape literal dots (but not the ones we'll create with .*)
      let regexPattern = pattern.replace(/\./g, '\\.');
      // Replace ** with a placeholder to avoid conflicts
      regexPattern = regexPattern.replace(/\*\*/g, '__DOUBLE_STAR__');
      // Replace single * with [^/]* to match any characters except slashes
      regexPattern = regexPattern.replace(/\*/g, '[^/]*');
      // Replace placeholder back with .* to match any characters including slashes
      regexPattern = regexPattern.replace(/__DOUBLE_STAR__/g, '.*');
      // Ensure the pattern matches the entire string
      regexPattern = '^' + regexPattern + '$';
      const regex = new RegExp(regexPattern, 'i');
      const matches = files.filter(file => regex.test(file));
      // Debug logging
      if (pattern.includes('snowflake')) {
        console.log(`🔍 Pattern matching debug for '${pattern}':`);
        console.log(`   Regex pattern: ${regexPattern}`);
        console.log(`   Files checked: ${files.filter(f => f.includes('snowflake')).join(', ')}`);
        console.log(`   Matches found: ${matches.join(', ')}`);
      }
      return matches;
    }
    
    // Handle simple patterns with single *
    // First escape literal dots
    let regexPattern = pattern.replace(/\./g, '\\.');
    // Replace single * with [^/]* to match any characters except slashes
    regexPattern = regexPattern.replace(/\*/g, '[^/]*');
    // Ensure the pattern matches the entire string
    regexPattern = '^' + regexPattern + '$';
    const regex = new RegExp(regexPattern, 'i');
    return files.filter(file => regex.test(file));
  }
  
  private calculateCoveragScore(relevantFiles: string[], mapping: CriterionFileMapping): number {
    if (relevantFiles.length === 0) return 0;
    
    // Base score from having relevant files
    let score = Math.min(relevantFiles.length / mapping.maxFiles, 1.0) * 0.7;
    
    // Bonus for having essential files
    const hasEssentialFiles = mapping.filePatterns.some(pattern => 
      relevantFiles.some(file => file.toLowerCase().includes(pattern.toLowerCase()))
    );
    
    if (hasEssentialFiles) {
      score += 0.3;
    }
    
    return Math.min(score, 1.0);
  }
  
  private identifyMissingElements(relevantFiles: string[], mapping: CriterionFileMapping): string[] {
    const missing: string[] = [];
    
    if (relevantFiles.length === 0) {
      missing.push(`No files found matching patterns: ${mapping.filePatterns.join(', ')}`);
    }
    
    if (relevantFiles.length < mapping.maxFiles / 2) {
      missing.push(`Insufficient files for criterion (found ${relevantFiles.length}, expected ~${mapping.maxFiles})`);
    }
    
    return missing;
  }
  
  async selectOptimalFiles(
    files: string[], 
    courseId: string, 
    criteria: CourseCriterion[]
  ): Promise<string[]> {
    console.log(`🔍 selectOptimalFiles called:`);
    console.log(`   Files available: ${files.length}`);
    console.log(`   Course ID: ${courseId}`);
    console.log(`   Criteria count: ${criteria.length}`);
    console.log(`   Sample criteria: ${criteria.slice(0, 2).map(c => c.name).join(', ')}`);

    const coverage = await this.mapFilesToCriteria(files, courseId, criteria);
    const selectedFiles = new Set<string>();
    
    // Always include README
    const readme = files.find(f => f.toLowerCase().includes('readme'));
    if (readme) selectedFiles.add(readme);
    
    // Add files for each criterion based on priority
    const sortedCoverage = coverage.sort((a, b) => {
      const mappingA = this.criterionMappings[courseId]?.find(m => m.criterionName === a.criterionName);
      const mappingB = this.criterionMappings[courseId]?.find(m => m.criterionName === b.criterionName);
      return (mappingB?.priority || 0) - (mappingA?.priority || 0);
    });
    
    console.log(`📊 Coverage results: ${coverage.length} criteria covered`);
    for (const cov of sortedCoverage) {
      console.log(`   ${cov.criterionName}: ${cov.relevantFiles.length} relevant files, coverage: ${(cov.coverage * 100).toFixed(1)}%`);
      // Debug logging for Data warehouse criterion
      if (cov.criterionName === 'Data warehouse' && courseId === 'data-engineering') {
        console.log(`   Data warehouse relevant files: ${cov.relevantFiles.join(', ')}`);
      }
    }
    
    for (const cov of sortedCoverage) {
      const mapping = this.criterionMappings[courseId]?.find(m => m.criterionName === cov.criterionName);
      if (!mapping) continue;
      
      // Add top files for this criterion (use the full maxFiles from mapping)
      // Filter out large dependency files that aren't useful for evaluation
      const filteredFiles = cov.relevantFiles.filter(file => !this.isLargeDependencyFile(file));
      const filesToAdd = filteredFiles.slice(0, mapping.maxFiles);
      filesToAdd.forEach(file => selectedFiles.add(file));
      console.log(`   Added ${filesToAdd.length} files for criterion: ${cov.criterionName}`);
      // Debug logging for Data warehouse criterion
      if (cov.criterionName === 'Data warehouse' && courseId === 'data-engineering') {
        console.log(`   Data warehouse files added: ${filesToAdd.join(', ')}`);
      }

      // Stop if we have enough files
      if (selectedFiles.size >= HYBRID_CONFIG.MAX_FILES_PER_EVALUATION) break;
    }
    
    // Ensure we include test files for better unit test detection
    const testFiles = files.filter(file => 
      (file.includes('/tests/') || file.includes('/test_') || file.includes('_test.')) && 
      file.endsWith('.py') && 
      !this.isLargeDependencyFile(file)
    ).slice(0, 10); // Include up to 10 test files
    
    testFiles.forEach(file => selectedFiles.add(file));
    
    const result = Array.from(selectedFiles);
    console.log(`✅ selectOptimalFiles returning ${result.length} files:`);
    console.log(`   Files: ${result.slice(0, 10).join(', ')}${result.length > 10 ? '...' : ''}`);
    
    // Debug logging for snowflake_refresh.py specifically
    if (files.some(f => f.includes('snowflake_refresh.py'))) {
      console.log(`🔍 snowflake_refresh.py is available: ${files.some(f => f.includes('snowflake_refresh.py'))}`);
      console.log(`🔍 snowflake_refresh.py is selected: ${result.some(f => f.includes('snowflake_refresh.py'))}`);
    }
    
    return result;
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
      return true;
    }
    
    // Check for lock files pattern (files ending with .lock)
    if (baseName.endsWith('.lock')) {
      return true;
    }
    
    // Large binary files that aren't useful for code evaluation
    const largeBinaryExtensions = [
      '.zip', '.tar', '.gz', '.7z', '.rar', '.iso',
      '.exe', '.msi', '.dmg', '.deb', '.rpm',
      '.jar', '.war', '.ear',
      '.so', '.dll', '.dylib'
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
        return true;
      }
    }
    
    return false;
  }


}
