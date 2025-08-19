/**
 * Repository Fingerprinting - Detects repository type and structure patterns
 */

import { REPO_TYPE_PATTERNS, RepoType, HYBRID_CONFIG } from '../config';
import { CriterionMapper, CourseCriterion } from './CriterionMapper';
import { SemanticFileAnalyzer, SemanticFileGroup } from './SemanticFileAnalyzer';

export interface RepoSignature {
  directoryStructure: string[];
  technologies: string[];
  fileTypes: Record<string, number>;
  sizeCategory: 'small' | 'medium' | 'large';
  patternHash: string;
}

export interface RepoTypeResult {
  type: RepoType | 'unknown';
  confidence: number;
  matchedPatterns: string[];
  signature: RepoSignature;
}

export interface FileSelectionStrategy {
  essential: string[];
  important: string[];
  supporting: string[];
  maxFiles: number;
  confidence: number;
}

export class RepositoryFingerprinter {
  private criterionMapper: CriterionMapper;
  private semanticAnalyzer: SemanticFileAnalyzer;

  constructor() {
    this.criterionMapper = new CriterionMapper();
    this.semanticAnalyzer = new SemanticFileAnalyzer();
  }

  async analyzeRepository(files: string[]): Promise<RepoTypeResult> {
    // Create repository signature
    const signature = this.createSignature(files);
    
    // Detect repository type
    const typeResult = this.detectRepoType(files);
    
    return {
      ...typeResult,
      signature
    };
  }
  
  detectRepoType(files: string[]): Omit<RepoTypeResult, 'signature'> {
    let bestMatch: RepoType | 'unknown' = 'unknown';
    let highestScore = 0;
    let matchedPatterns: string[] = [];
    
    // Test each repository type pattern
    for (const [repoType, config] of Object.entries(REPO_TYPE_PATTERNS)) {
      const score = this.calculateTypeScore(files, config);
      
      if (score.total > highestScore) {
        highestScore = score.total;
        bestMatch = repoType as RepoType;
        matchedPatterns = score.matches;
      }
    }
    
    // Calculate confidence based on score
    const confidence = Math.min(highestScore / 100, 1.0);
    
    return {
      type: bestMatch,
      confidence,
      matchedPatterns
    };
  }
  
  private calculateTypeScore(files: string[], config: any): { total: number; matches: string[] } {
    let score = 0;
    const matches: string[] = [];
    
    // Check required patterns (must have at least one)
    const requiredMatches = config.required.filter((pattern: any) => 
      files.some(file => this.matchesPattern(file, pattern))
    );
    
    if (requiredMatches.length === 0) {
      return { total: 0, matches: [] };
    }
    
    score += requiredMatches.length * 30; // 30 points per required match
    matches.push(...requiredMatches.map((p: any) => p.toString()));
    
    // Check indicator patterns (bonus points)
    const indicatorMatches = config.indicators.filter((pattern: any) =>
      files.some(file => this.matchesPattern(file, pattern))
    );
    
    score += indicatorMatches.length * 20; // 20 points per indicator
    matches.push(...indicatorMatches.map((p: any) => p.toString()));
    
    // Check directory patterns (bonus points)
    if (config.directories) {
      const directoryMatches = config.directories.filter((dir: string) =>
        files.some(file => file.toLowerCase().includes(dir.toLowerCase()))
      );
      
      score += directoryMatches.length * 15; // 15 points per directory match
      matches.push(...directoryMatches);
    }
    
    return { total: score, matches };
  }
  
  private matchesPattern(filePath: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return filePath.toLowerCase().includes(pattern.toLowerCase());
    } else {
      return pattern.test(filePath);
    }
  }
  
  createSignature(files: string[]): RepoSignature {
    return {
      directoryStructure: this.extractDirectoryStructure(files),
      technologies: this.detectTechnologies(files),
      fileTypes: this.analyzeFileTypes(files),
      sizeCategory: this.categorizeSize(files.length),
      patternHash: this.generatePatternHash(files)
    };
  }
  
  private extractDirectoryStructure(files: string[]): string[] {
    const directories = new Set<string>();
    
    files.forEach(file => {
      const parts = file.split('/');
      let currentPath = '';
      
      // Build directory paths
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + parts[i];
        directories.add(currentPath);
      }
    });
    
    return Array.from(directories).sort();
  }
  
  private detectTechnologies(files: string[]): string[] {
    const technologies = new Set<string>();
    
    // Technology detection patterns
    const techPatterns = {
      'python': /\.py$/,
      'javascript': /\.(js|ts)$/,
      'docker': /Dockerfile|docker-compose/i,
      'terraform': /\.tf$/,
      'sql': /\.sql$/,
      'yaml': /\.(yml|yaml)$/,
      'jupyter': /\.ipynb$/,
      'dbt': /dbt_project\.yml|dbt/i,
      'airflow': /airflow|dags/i,
      'mlflow': /mlflow/i,
      'fastapi': /fastapi|main\.py/i,
      'flask': /flask|app\.py/i,
      'react': /package\.json.*react/i,
      'nextjs': /next\.config/i
    };
    
    files.forEach(file => {
      for (const [tech, pattern] of Object.entries(techPatterns)) {
        if (pattern.test(file)) {
          technologies.add(tech);
        }
      }
    });
    
    return Array.from(technologies).sort();
  }
  
  private analyzeFileTypes(files: string[]): Record<string, number> {
    const fileTypes: Record<string, number> = {};
    
    files.forEach(file => {
      const extension = this.getFileExtension(file);
      fileTypes[extension] = (fileTypes[extension] || 0) + 1;
    });
    
    return fileTypes;
  }
  
  private getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    if (parts.length < 2) return 'no-extension';
    return '.' + parts[parts.length - 1].toLowerCase();
  }
  
  private categorizeSize(fileCount: number): 'small' | 'medium' | 'large' {
    if (fileCount < 20) return 'small';
    if (fileCount < 100) return 'medium';
    return 'large';
  }
  
  private generatePatternHash(files: string[]): string {
    // Create a hash based on key patterns
    const keyPatterns = [
      'src/',
      'pipeline/',
      'models/',
      'dbt/',
      'terraform/',
      'backend/',
      'requirements.txt',
      'Dockerfile',
      'package.json'
    ];
    
    const presentPatterns = keyPatterns.filter(pattern =>
      files.some(file => file.includes(pattern))
    );
    
    return presentPatterns.sort().join('_') || 'generic';
  }
  
  getFileSelectionStrategy(repoType: RepoType, confidence: number): FileSelectionStrategy {
    const strategies: Record<RepoType, FileSelectionStrategy> = {
      'mlops-project': {
        essential: [
          'README.md',
          'src/pipeline/data_ingestion.py',
          'src/pipeline/model_training.py',
          'src/pipeline/orchestrate.py',
          'model.py',
          'lambda_function.py'
        ],
        important: [
          'src/pipeline/*.py',
          'pipeline/*.py',
          'train.py',
          'predict.py',
          'deploy*.py',
          'requirements.txt',
          'Dockerfile',
          'scripts/deploy*.sh',
          '.github/workflows/*.yml'
        ],
        supporting: [
          'docker-compose.yml',
          'config.yaml',
          'setup.py',
          'pyproject.toml',
          '*.ipynb',
          'tests/*.py',
          'infrastructure/*.tf'
        ],
        maxFiles: 50,
        confidence
      },
      'data-engineering': {
        essential: [
          'README.md',
          'dbt/dbt_project.yml',
          'terraform/main.tf'
        ],
        important: [
          'dbt/models/staging/*.sql',
          'dbt/models/marts/*.sql',
          'dbt/**/*.sql',
          'terraform/*.tf',
          'infrastructure/*.tf',
          'orchestration/**/*.py',
          'dags/**/*.py',
          'processing/*.py',
          'etl.py',
          'dashboard/*.py'
        ],
        supporting: [
          'docker-compose.yml',
          'requirements.txt',
          'scripts/*.sh',
          'config/*.yaml',
          '.env.example',
          'Dockerfile'
        ],
        maxFiles: 50,
        confidence
      },
      'llm-project': {
        essential: [
          'README.md',
          'rag/ingest.py',
          'rag/prep.py'
        ],
        important: [
          'backend/**/*.py',
          'rag/**/*.py',
          'ingest.py',
          'prep.py',
          'api/**/*.py',
          'main.py',
          'app.py',
          'search.py'
        ],
        supporting: [
          'requirements.txt',
          'Dockerfile',
          '.env.example',
          '*.ipynb',
          'config/*.py',
          'data/*.json'
        ],
        maxFiles: 30,
        confidence
      },
      'machine-learning': {
        essential: [
          'README.md',
          'train.py',
          'predict.py'
        ],
        important: [
          'model.py',
          'data_preprocessing.py',
          'notebooks/eda.ipynb',
          'notebooks/model_training.ipynb',
          '*.ipynb',
          'src/**/*.py'
        ],
        supporting: [
          'requirements.txt',
          'setup.py',
          'config.yaml',
          'tests/*.py',
          'scripts/*.py'
        ],
        maxFiles: 30,
        confidence
      },
      'stock-markets': {
        essential: [
          'README.md'
        ],
        important: [
          'src/data/*.py',
          'src/strategies/*.py',
          'src/backtesting/*.py',
          'src/portfolio/*.py',
          'notebooks/*.ipynb',
          '*.py'
        ],
        supporting: [
          'requirements.txt',
          'config/*.yaml',
          'Dockerfile',
          'tests/*.py',
          'data/*.csv'
        ],
        maxFiles: 30,
        confidence
      }
    };
    
    return strategies[repoType] || {
      essential: ['README.md'],
      important: ['*.py', '*.js', '*.ts'],
      supporting: ['requirements.txt', 'package.json', 'Dockerfile'],
      maxFiles: 15,
      confidence: 0.5
    };
  }
  
  async selectFiles(files: string[], repoType: RepoType, confidence: number): Promise<string[]> {
    // Use semantic analysis as primary method
    try {
      return await this.selectFilesSemanticAnalysis(files, repoType, confidence);
    } catch (error) {
      console.warn('Semantic analysis failed, falling back to pattern-based selection:', error);
      return await this.selectFilesPatternBased(files, repoType, confidence);
    }
  }

  /**
   * NEW: Semantic file selection without hardcoded patterns
   */
  async selectFilesSemanticAnalysis(files: string[], repoType: RepoType, confidence: number): Promise<string[]> {
    console.log(`🧠 Semantic file selection for ${repoType}:`);
    console.log(`   Available files: ${files.length}`);
    console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);

    // Filter out large dependency files that aren't useful for evaluation
    const filteredFiles = files.filter(file => !this.isLargeDependencyFile(file));

    // Group files by semantic purpose
    const semanticGroups = this.semanticAnalyzer.groupFilesBySemantic(filteredFiles, repoType);

    console.log(`📊 Semantic groups found: ${semanticGroups.length}`);
    semanticGroups.forEach(group => {
      console.log(`   ${group.purpose}: ${group.files.length} files (${group.importance})`);
    });

    const selectedFiles = new Set<string>();
    const maxFiles = HYBRID_CONFIG.MAX_FILES_PER_EVALUATION;

    // Phase 1: Essential files (highest semantic importance)
    console.log(`📋 Phase 1: Essential files`);
    const essentialGroups = semanticGroups.filter(g => g.importance === 'essential');
    for (const group of essentialGroups) {
      const filesToAdd = this.selectBestFilesFromGroup(group.files, repoType, maxFiles - selectedFiles.size);
      filesToAdd.forEach(file => {
        selectedFiles.add(file);
        console.log(`     ✅ ${file} (${group.purpose})`);
      });

      if (selectedFiles.size >= maxFiles) break;
    }

    // Phase 2: Important files
    console.log(`📋 Phase 2: Important files`);
    const importantGroups = semanticGroups.filter(g => g.importance === 'important');
    for (const group of importantGroups) {
      if (selectedFiles.size >= maxFiles) break;

      const filesToAdd = this.selectBestFilesFromGroup(group.files, repoType, maxFiles - selectedFiles.size);
      filesToAdd.forEach(file => {
        selectedFiles.add(file);
        console.log(`     ✅ ${file} (${group.purpose})`);
      });
    }

    // Phase 3: Supporting files (if space available)
    if (selectedFiles.size < maxFiles) {
      console.log(`📋 Phase 3: Supporting files`);
      const supportingGroups = semanticGroups.filter(g => g.importance === 'supporting');
      for (const group of supportingGroups) {
        if (selectedFiles.size >= maxFiles) break;

        const filesToAdd = this.selectBestFilesFromGroup(group.files, repoType, maxFiles - selectedFiles.size);
        filesToAdd.forEach(file => {
          selectedFiles.add(file);
          console.log(`     ✅ ${file} (${group.purpose})`);
        });
      }
    }

    const result = Array.from(selectedFiles);
    console.log(`🎯 Final semantic selection: ${result.length} files`);

    return result;
  }

  /**
   * Check if a file is a large dependency file that should be excluded from selection
   */
  private isLargeDependencyFile(filePath: string): boolean {
    const baseName = filePath.split('/').pop()?.toLowerCase() || '';
    
    // Explicitly allow important files that should be included in evaluation
    const allowedFiles = [
      'dockerfile',
      '.pre-commit-config.yaml'
    ];
    
    // Allow all GitHub workflow files
    if (filePath.includes('.github/workflows/')) {
      return false;
    }
    
    // Allow all notebook files
    if (baseName.endsWith('.ipynb')) {
      return false;
    }
    
    // Check if this is an explicitly allowed file
    if (allowedFiles.includes(baseName)) {
      return false; // Don't exclude these files
    }
    
    // Filter out empty __init__.py files which don't contain useful code for evaluation
    if (baseName === '__init__.py') {
      return true;
    }
    
    const fileExtension = '.' + baseName.split('.').pop();
    
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
        return true;
      }
    }
    
    return false;
  }



  /**
   * FALLBACK: Pattern-based file selection (legacy method)
   */
  async selectFilesPatternBased(files: string[], repoType: RepoType, confidence: number): Promise<string[]> {
    // Filter out large dependency files that aren't useful for evaluation
    const filteredFiles = files.filter(file => !this.isLargeDependencyFile(file));
    
    const strategy = this.getFileSelectionStrategy(repoType, confidence);
    const selectedFiles = new Set<string>();

    console.log(`🔍 Pattern-based selection for ${repoType} (fallback):`);

    // Add essential files
    for (const pattern of strategy.essential) {
      const matches = this.findMatchingFiles(filteredFiles, pattern);
      matches.forEach(file => selectedFiles.add(file));
    }

    // Add important files up to limit
    for (const pattern of strategy.important) {
      if (selectedFiles.size >= strategy.maxFiles) break;
      const matches = this.findMatchingFiles(filteredFiles, pattern);
      for (const file of matches) {
        if (selectedFiles.size >= strategy.maxFiles) break;
        selectedFiles.add(file);
      }
    }

    return Array.from(selectedFiles);
  }

  /**
   * Select the best files from a semantic group
   */
  private selectBestFilesFromGroup(groupFiles: string[], repoType: string, maxFiles: number): string[] {
    if (maxFiles <= 0) return [];

    // Filter out large dependency files that aren't useful for evaluation
    const filteredFiles = groupFiles.filter(file => !this.isLargeDependencyFile(file));

    // Score and sort files within the group
    const scoredFiles = filteredFiles.map(file => ({
      file,
      analysis: this.semanticAnalyzer.analyzeFile(file, repoType)
    })).sort((a, b) => b.analysis.importanceScore - a.analysis.importanceScore);

    // Take the top files up to the limit
    return scoredFiles.slice(0, maxFiles).map(item => item.file);
  }

  async selectFilesByCriteria(
    files: string[],
    courseId: string,
    criteria: CourseCriterion[]
  ): Promise<string[]> {
    console.log(`🔍 selectFilesByCriteria called:`);
    console.log(`   Files available: ${files.length}`);
    console.log(`   Course ID: ${courseId}`);
    console.log(`   Criteria count: ${criteria.length}`);
    console.log(`   Sample criteria: ${criteria.slice(0, 2).map(c => c.name).join(', ')}`);

    // Use criterion-driven selection for better accuracy
    const result = await this.criterionMapper.selectOptimalFiles(files, courseId, criteria);
    
    // Additional filtering to ensure no large dependency files are included
    const filteredResult = result.filter(file => !this.isLargeDependencyFile(file));
    
    console.log(`✅ selectFilesByCriteria returning ${filteredResult.length} files:`);
    console.log(`   Files: ${filteredResult.slice(0, 10).join(', ')}${filteredResult.length > 10 ? '...' : ''}`);
    
    return filteredResult;
  }
  
  private findMatchingFiles(files: string[], pattern: string): string[] {
    // Handle exact matches and subdirectory matches
    if (!pattern.includes('*')) {
      return files.filter(file =>
        file === pattern ||
        file.toLowerCase() === pattern.toLowerCase() ||
        file.endsWith('/' + pattern) ||
        file.endsWith('\\' + pattern) ||
        // Also match files in subdirectories
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
        console.log(`🔍 RepositoryFingerprinter pattern matching debug for '${pattern}':`);
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
}
