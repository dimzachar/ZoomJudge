/**
 * Repository Signature Generator - Creates unique fingerprints for repositories
 */

import { RepoSignature } from '../core/RepositoryFingerprinter';

export interface SignatureOptions {
  includeFileContent?: boolean;
  maxDepth?: number;
  excludePatterns?: string[];
}

export class RepositorySignatureGenerator {
  private defaultExcludePatterns = [
    'node_modules',
    '.git',
    '__pycache__',
    '.pytest_cache',
    'venv',
    'env',
    '.env',
    'dist',
    'build',
    '.DS_Store',
    'Thumbs.db',
    '*.log',
    '*.tmp'
  ];

  /**
   * Generate a comprehensive repository signature
   */
  generateSignature(files: string[], options: SignatureOptions = {}): RepoSignature {
    const filteredFiles = this.filterFiles(files, options.excludePatterns);
    
    return {
      directoryStructure: this.extractDirectoryStructure(filteredFiles, options.maxDepth),
      technologies: this.detectTechnologies(filteredFiles),
      fileTypes: this.analyzeFileTypes(filteredFiles),
      sizeCategory: this.categorizeSize(filteredFiles.length),
      patternHash: this.generatePatternHash(filteredFiles)
    };
  }

  /**
   * Filter files based on exclude patterns
   */
  private filterFiles(files: string[], customExcludePatterns?: string[]): string[] {
    const excludePatterns = [
      ...this.defaultExcludePatterns,
      ...(customExcludePatterns || [])
    ];

    return files.filter(file => {
      return !excludePatterns.some(pattern => {
        if (pattern.includes('*')) {
          // Convert glob pattern to regex
          const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*/g, '.*');
          return new RegExp(regexPattern).test(file);
        }
        return file.includes(pattern);
      });
    });
  }

  /**
   * Extract directory structure with optional depth limit
   */
  private extractDirectoryStructure(files: string[], maxDepth?: number): string[] {
    const directories = new Set<string>();
    
    files.forEach(file => {
      const parts = file.split('/');
      let currentPath = '';
      
      const depth = maxDepth || parts.length - 1;
      const limitedParts = parts.slice(0, Math.min(depth + 1, parts.length - 1));
      
      for (let i = 0; i < limitedParts.length; i++) {
        currentPath += (currentPath ? '/' : '') + parts[i];
        directories.add(currentPath);
      }
    });
    
    return Array.from(directories).sort();
  }

  /**
   * Detect technologies and frameworks from file patterns
   */
  private detectTechnologies(files: string[]): string[] {
    const technologies = new Set<string>();
    
    // Technology detection patterns
    const techPatterns = {
      'python': ['.py', 'requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'],
      'javascript': ['.js', '.jsx', 'package.json', 'yarn.lock', 'npm-shrinkwrap.json'],
      'typescript': ['.ts', '.tsx', 'tsconfig.json'],
      'react': ['package.json'], // Will be refined by content analysis
      'node': ['package.json', 'node_modules'],
      'docker': ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'],
      'kubernetes': ['.yaml', '.yml'], // Will be refined by content analysis
      'terraform': ['.tf', '.tfvars', 'terraform.tfstate'],
      'sql': ['.sql'],
      'dbt': ['dbt_project.yml', 'profiles.yml'],
      'airflow': ['dags/', 'airflow.cfg'],
      'jupyter': ['.ipynb'],
      'git': ['.gitignore', '.gitattributes'],
      'yaml': ['.yml', '.yaml'],
      'json': ['.json'],
      'markdown': ['.md', '.markdown'],
      'shell': ['.sh', '.bash', '.zsh'],
      'makefile': ['Makefile', 'makefile'],
      'go': ['.go', 'go.mod', 'go.sum'],
      'rust': ['.rs', 'Cargo.toml', 'Cargo.lock'],
      'java': ['.java', 'pom.xml', 'build.gradle'],
      'c': ['.c', '.h'],
      'cpp': ['.cpp', '.hpp', '.cc', '.cxx'],
      'csharp': ['.cs', '.csproj', '.sln'],
      'php': ['.php', 'composer.json'],
      'ruby': ['.rb', 'Gemfile', 'Rakefile'],
      'scala': ['.scala', 'build.sbt'],
      'kotlin': ['.kt', '.kts'],
      'swift': ['.swift', 'Package.swift'],
      'r': ['.r', '.R', 'DESCRIPTION'],
      'matlab': ['.m', '.mat'],
      'html': ['.html', '.htm'],
      'css': ['.css', '.scss', '.sass', '.less'],
      'xml': ['.xml', '.xsd', '.xsl']
    };

    // Check each technology pattern
    for (const [tech, patterns] of Object.entries(techPatterns)) {
      const hasPattern = patterns.some(pattern => {
        if (pattern.endsWith('/')) {
          // Directory pattern
          return files.some(file => file.includes(pattern));
        } else if (pattern.startsWith('.')) {
          // Extension pattern
          return files.some(file => file.endsWith(pattern));
        } else {
          // Exact filename pattern
          return files.some(file => 
            file === pattern || 
            file.endsWith('/' + pattern) ||
            file.includes(pattern)
          );
        }
      });

      if (hasPattern) {
        technologies.add(tech);
      }
    }

    // Special framework detection
    this.detectFrameworks(files, technologies);

    return Array.from(technologies).sort();
  }

  /**
   * Detect specific frameworks based on file patterns
   */
  private detectFrameworks(files: string[], technologies: Set<string>): void {
    // React detection
    if (technologies.has('javascript') || technologies.has('typescript')) {
      const hasReactFiles = files.some(file => 
        file.includes('react') || 
        file.includes('jsx') || 
        file.includes('tsx') ||
        file.includes('components/')
      );
      if (hasReactFiles) {
        technologies.add('react');
      }
    }

    // Vue detection
    if (files.some(file => file.endsWith('.vue') || file.includes('vue'))) {
      technologies.add('vue');
    }

    // Angular detection
    if (files.some(file => file.includes('angular') || file.includes('@angular'))) {
      technologies.add('angular');
    }

    // Django detection
    if (technologies.has('python')) {
      const hasDjangoFiles = files.some(file => 
        file.includes('django') || 
        file.includes('settings.py') ||
        file.includes('urls.py') ||
        file.includes('wsgi.py')
      );
      if (hasDjangoFiles) {
        technologies.add('django');
      }
    }

    // Flask detection
    if (technologies.has('python')) {
      const hasFlaskFiles = files.some(file => 
        file.includes('flask') || 
        file.includes('app.py') ||
        file.includes('application.py')
      );
      if (hasFlaskFiles) {
        technologies.add('flask');
      }
    }

    // FastAPI detection
    if (technologies.has('python')) {
      const hasFastAPIFiles = files.some(file => 
        file.includes('fastapi') || 
        file.includes('main.py')
      );
      if (hasFastAPIFiles) {
        technologies.add('fastapi');
      }
    }

    // MLOps frameworks
    if (technologies.has('python')) {
      const mlopsFrameworks = {
        'mlflow': ['mlflow', 'MLproject'],
        'wandb': ['wandb', 'sweep'],
        'kubeflow': ['kubeflow', 'pipeline'],
        'airflow': ['airflow', 'dags/'],
        'prefect': ['prefect'],
        'dagster': ['dagster']
      };

      for (const [framework, patterns] of Object.entries(mlopsFrameworks)) {
        const hasFramework = patterns.some(pattern => 
          files.some(file => file.includes(pattern))
        );
        if (hasFramework) {
          technologies.add(framework);
        }
      }
    }
  }

  /**
   * Analyze file type distribution
   */
  private analyzeFileTypes(files: string[]): Record<string, number> {
    const fileTypes: Record<string, number> = {};
    
    files.forEach(file => {
      const extension = file.split('.').pop()?.toLowerCase();
      if (extension && extension !== file) {
        fileTypes[extension] = (fileTypes[extension] || 0) + 1;
      } else {
        // Files without extension
        fileTypes['no_extension'] = (fileTypes['no_extension'] || 0) + 1;
      }
    });
    
    return fileTypes;
  }

  /**
   * Categorize repository size
   */
  private categorizeSize(fileCount: number): 'small' | 'medium' | 'large' {
    if (fileCount < 20) return 'small';
    if (fileCount < 100) return 'medium';
    return 'large';
  }

  /**
   * Generate a unique pattern hash for the repository
   */
  private generatePatternHash(files: string[]): string {
    // Create a deterministic hash based on file structure
    const sortedFiles = [...files].sort();
    const structureString = sortedFiles.join('|');

    // Simple hash function that works in all environments
    return this.simpleHash(structureString).substring(0, 16);
  }

  /**
   * Simple hash function that works in browser and Node.js
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
   * Compare two signatures for similarity
   */
  calculateSimilarity(sig1: RepoSignature, sig2: RepoSignature): number {
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
}
