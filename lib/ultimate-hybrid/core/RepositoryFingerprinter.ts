/**
 * Repository Fingerprinting - Detects repository type and structure patterns
 */

import { REPO_TYPE_PATTERNS, RepoType, HYBRID_CONFIG } from '../config';
import { CriterionMapper, CourseCriterion } from './CriterionMapper';

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

  constructor() {
    this.criterionMapper = new CriterionMapper();
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
        essential: ['README.md', 'requirements.txt'],
        important: [
          'src/pipeline/*.py',
          'pipeline/*.py',
          'ml_pipeline/*.py',
          'workflows/*.py',
          'models/*.py',
          'train*.py',
          'deploy*.py'
        ],
        supporting: [
          'Dockerfile',
          'docker-compose.yml',
          'config.yaml',
          'setup.py',
          '*.ipynb'
        ],
        maxFiles: 20,
        confidence
      },
      'data-engineering': {
        essential: ['README.md'],
        important: [
          'dbt/**/*.sql',
          'dbt/**/*.yml',
          'terraform/**/*.tf',
          'orchestration/**/*.py',
          'dags/**/*.py',
          'processing/**/*.py'
        ],
        supporting: [
          'docker-compose.yml',
          'requirements.txt',
          'scripts/**/*.sh',
          'config/**/*.yaml'
        ],
        maxFiles: 18,
        confidence
      },
      'llm-project': {
        essential: ['README.md'],
        important: [
          'backend/**/*.py',
          'rag/**/*.py',
          'ingest/**/*.py',
          'prep/**/*.py',
          'api/**/*.py',
          'main.py',
          'app.py'
        ],
        supporting: [
          'requirements.txt',
          'Dockerfile',
          '.env.example',
          '*.ipynb',
          'config/**/*.yaml'
        ],
        maxFiles: 16,
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
    const strategy = this.getFileSelectionStrategy(repoType, confidence);
    const selectedFiles = new Set<string>();

    // Add essential files
    for (const pattern of strategy.essential) {
      const matches = this.findMatchingFiles(files, pattern);
      matches.forEach(file => selectedFiles.add(file));
    }

    // Add important files (up to limit)
    for (const pattern of strategy.important) {
      if (selectedFiles.size >= strategy.maxFiles) break;

      const matches = this.findMatchingFiles(files, pattern);
      for (const file of matches) {
        if (selectedFiles.size >= strategy.maxFiles) break;
        selectedFiles.add(file);
      }
    }

    // Add supporting files if we have room
    for (const pattern of strategy.supporting) {
      if (selectedFiles.size >= strategy.maxFiles) break;

      const matches = this.findMatchingFiles(files, pattern);
      for (const file of matches) {
        if (selectedFiles.size >= strategy.maxFiles) break;
        selectedFiles.add(file);
      }
    }

    return Array.from(selectedFiles);
  }

  async selectFilesByCriteria(
    files: string[],
    courseId: string,
    criteria: CourseCriterion[]
  ): Promise<string[]> {
    // Use criterion-driven selection for better accuracy
    return await this.criterionMapper.selectOptimalFiles(files, courseId, criteria);
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
      if (pattern.includes('*')) {
        return regex.test(file);
      } else {
        return file.toLowerCase().includes(pattern.toLowerCase());
      }
    });
  }
}
