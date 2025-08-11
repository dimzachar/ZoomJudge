/**
 * Criterion-Driven File Selection
 * Maps files to specific course evaluation criteria
 */

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
        maxFiles: 3,
        weight: 2 // 2 points max
      },
      {
        criterionName: 'Workflow orchestration',
        filePatterns: [
          'dags/**/*.py', 'orchestration/**/*.py', 'workflows/**/*.py',
          'airflow/**/*.py', 'prefect/**/*.py', 'dagster/**/*.py',
          'pipeline/**/*.py', 'ml_pipeline/**/*.py'
        ],
        contentKeywords: ['dag', 'workflow', 'orchestration', 'pipeline', 'airflow', 'prefect', 'schedule'],
        priority: 95,
        maxFiles: 5,
        weight: 4 // 4 points max
      },
      {
        criterionName: 'Model deployment',
        filePatterns: [
          'deploy/**/*.py', 'deployment/**/*.py', 'serve/**/*.py',
          'api/**/*.py', 'app.py', 'main.py', 'Dockerfile',
          'docker-compose.yml', 'kubernetes/**/*.yaml'
        ],
        contentKeywords: ['deploy', 'serve', 'api', 'endpoint', 'docker', 'container', 'kubernetes'],
        priority: 90,
        maxFiles: 5,
        weight: 4
      },
      {
        criterionName: 'Model monitoring',
        filePatterns: [
          'monitoring/**/*.py', 'metrics/**/*.py', 'alerts/**/*.py',
          'dashboard/**/*.py', 'grafana/**/*', 'prometheus/**/*'
        ],
        contentKeywords: ['monitor', 'metrics', 'alert', 'dashboard', 'grafana', 'prometheus', 'logging'],
        priority: 85,
        maxFiles: 4,
        weight: 4
      },
      {
        criterionName: 'Reproducibility',
        filePatterns: [
          'requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile',
          'Dockerfile', 'docker-compose.yml', 'Makefile',
          'scripts/**/*.sh', '.github/**/*.yml'
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
          '.github/**/*.yml', '.pre-commit-config.yaml',
          'pyproject.toml', 'setup.cfg', 'tox.ini'
        ],
        contentKeywords: ['test', 'lint', 'format', 'ci', 'cd', 'quality', 'coverage'],
        priority: 75,
        maxFiles: 5,
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
        weight: 4
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
        criterionName: 'Data ingestion',
        filePatterns: [
          'ingestion/**/*.py', 'etl/**/*.py', 'pipeline/**/*.py',
          'streaming/**/*.py', 'kafka/**/*.py', 'airflow/**/*.py'
        ],
        contentKeywords: ['ingest', 'extract', 'etl', 'stream', 'kafka', 'pipeline'],
        priority: 90,
        maxFiles: 5,
        weight: 4
      },
      {
        criterionName: 'Data warehouse',
        filePatterns: [
          'warehouse/**/*.sql', 'dwh/**/*.sql', 'models/**/*.sql',
          'bigquery/**/*.sql', 'snowflake/**/*.sql'
        ],
        contentKeywords: ['warehouse', 'dwh', 'partition', 'cluster', 'optimize'],
        priority: 85,
        maxFiles: 4,
        weight: 4
      },
      {
        criterionName: 'Transformations',
        filePatterns: [
          'dbt/**/*.sql', 'dbt/**/*.yml', 'transformations/**/*.py',
          'spark/**/*.py', 'sql/**/*.sql'
        ],
        contentKeywords: ['transform', 'dbt', 'spark', 'sql', 'model'],
        priority: 80,
        maxFiles: 6,
        weight: 4
      },
      {
        criterionName: 'Dashboard',
        filePatterns: [
          'dashboard/**/*', 'viz/**/*', 'looker/**/*',
          'tableau/**/*', 'streamlit/**/*.py', 'dash/**/*.py'
        ],
        contentKeywords: ['dashboard', 'visualization', 'chart', 'plot', 'looker', 'tableau'],
        priority: 75,
        maxFiles: 3,
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
    // Convert glob-like patterns to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')  // ** matches any directory depth
      .replace(/\*/g, '[^/]*') // * matches any characters except /
      .replace(/\./g, '\\.');   // Escape dots
    
    const regex = new RegExp(regexPattern, 'i');
    
    return files.filter(file => {
      // Direct match
      if (file === pattern) return true;
      
      // Regex match
      if (regex.test(file)) return true;
      
      // Partial match for simple patterns
      return file.toLowerCase().includes(pattern.toLowerCase());
    });
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
    
    for (const cov of sortedCoverage) {
      const mapping = this.criterionMappings[courseId]?.find(m => m.criterionName === cov.criterionName);
      if (!mapping) continue;
      
      // Add top files for this criterion
      const filesToAdd = cov.relevantFiles.slice(0, Math.min(mapping.maxFiles, 3));
      filesToAdd.forEach(file => selectedFiles.add(file));
      
      // Stop if we have enough files
      if (selectedFiles.size >= 25) break;
    }
    
    return Array.from(selectedFiles);
  }
}
