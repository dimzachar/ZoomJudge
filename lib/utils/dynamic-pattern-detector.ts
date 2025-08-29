/**
 * Dynamic Pattern Detection System
 * Implements the comprehensive pattern detection outlined in test-plan-edge-cases.md
 */

export interface FilePatternMatcher {
  category: string;
  patterns: RegExp[];
  priority: number;
  description: string;
}

/**
 * Documentation file patterns - detects any documentation regardless of naming
 */
export const documentationPatterns: FilePatternMatcher[] = [
  {
    category: 'documentation',
    patterns: [
      /^readme\.(md|rst|txt)$/i,
      /^(install|installation)\.(md|rst|txt)$/i,
      /^(setup|getting[_-]?started|quickstart)\.(md|rst|txt)$/i,
      /^(how[_-]?to[_-]?run|run|running|usage)\.(md|rst|txt)$/i,
      /^(guide|tutorial|walkthrough)\.(md|rst|txt)$/i,
      /^(contributing|changelog|license)\.(md|rst|txt)$/i,
    ],
    priority: 95,
    description: 'Documentation and setup files'
  }
];

/**
 * Configuration file patterns - detects build/task/environment files
 */
export const configurationPatterns: FilePatternMatcher[] = [
  {
    category: 'environment',
    patterns: [
      /^environment\.(yml|yaml)$/i,
      /^conda\.(yml|yaml)$/i,
      /^\.env(\.example|\.template)?$/i,
      /^requirements.*\.txt$/i,
      /^pyproject\.toml$/i,
      /^setup\.(py|cfg)$/i,
      /^pipfile(\.lock)?$/i,
      /^poetry\.lock$/i,
    ],
    priority: 90,
    description: 'Environment and dependency files'
  },
  {
    category: 'build',
    patterns: [
      /^(makefile|gnumakefile)$/i,
      /^taskfile\.(yml|yaml)$/i,
      /^justfile$/i,
      /^build\.(sh|py|js|gradle)$/i,
      /^dockerfile(\..*)?$/i,
      /^docker-compose.*\.(yml|yaml)$/i,
    ],
    priority: 85,
    description: 'Build and containerization files'
  },
  {
    category: 'workflow',
    patterns: [
      /^prefect\.(yaml|yml)$/i,
      /^airflow\.cfg$/i,
      /^kubeflow\/.*$/i,
      /^pipeline\.(yaml|yml)$/i,
      /^mlflow\.yml$/i,
      /^mlproject$/i,
      /^dvc\.(yaml|lock)$/i,
    ],
    priority: 88,
    description: 'Workflow orchestration files'
  }
];

/**
 * CI/CD patterns - detects continuous integration files
 */
export const cicdPatterns: FilePatternMatcher[] = [
  {
    category: 'cicd',
    patterns: [
      /^\.github\/workflows\/.*\.(yml|yaml)$/i,
      /^\.gitlab-ci\.yml$/i,
      /^\.travis\.yml$/i,
      /^\.circleci\/config\.yml$/i,
      /^azure-pipelines\.yml$/i,
      /^buildkite\.yml$/i,
      /^jenkins\.yml$/i,
      /^\.pre-commit-config\.yaml$/i,
    ],
    priority: 80,
    description: 'CI/CD and automation files'
  }
];

/**
 * Infrastructure as Code patterns
 */
export const infrastructurePatterns: FilePatternMatcher[] = [
  {
    category: 'infrastructure',
    patterns: [
      /^.*\.tf$/i,
      /^.*\.tfvars$/i,
      /^terraform\.tfstate$/i,
      /^pulumi\.(yaml|yml)$/i,
      /^pulumi\..*\.(yaml|yml)$/i,
      /^playbook\.yml$/i,
      /^inventory$/i,
    ],
    priority: 82,
    description: 'Infrastructure as Code files'
  }
];

/**
 * All pattern matchers combined
 */
export const allPatternMatchers = [
  ...documentationPatterns,
  ...configurationPatterns,
  ...cicdPatterns,
  ...infrastructurePatterns,
];

/**
 * Dynamic file detection - finds files matching any pattern
 */
export class DynamicPatternDetector {
  
  /**
   * Find files matching documentation patterns
   */
  static findDocumentationFiles(files: string[]): string[] {
    return this.findFilesByPatterns(files, documentationPatterns);
  }

  /**
   * Find files matching configuration patterns
   */
  static findConfigurationFiles(files: string[]): string[] {
    return this.findFilesByPatterns(files, configurationPatterns);
  }

  /**
   * Find files matching CI/CD patterns
   */
  static findCICDFiles(files: string[]): string[] {
    return this.findFilesByPatterns(files, cicdPatterns);
  }

  /**
   * Find files matching infrastructure patterns
   */
  static findInfrastructureFiles(files: string[]): string[] {
    return this.findFilesByPatterns(files, infrastructurePatterns);
  }

  /**
   * Find all important files using all patterns
   */
  static findAllImportantFiles(files: string[]): { [category: string]: string[] } {
    const results: { [category: string]: string[] } = {};
    
    for (const matcher of allPatternMatchers) {
      const matchedFiles = this.findFilesByPatterns(files, [matcher]);
      if (matchedFiles.length > 0) {
        results[matcher.category] = matchedFiles;
      }
    }
    
    return results;
  }

  /**
   * Find files by specific pattern matchers
   */
  private static findFilesByPatterns(files: string[], matchers: FilePatternMatcher[]): string[] {
    const foundFiles = new Set<string>();
    
    // Only check root files for most patterns (files without '/')
    const rootFiles = files.filter(f => !f.includes('/'));
    
    for (const matcher of matchers) {
      for (const pattern of matcher.patterns) {
        for (const file of rootFiles) {
          if (pattern.test(file)) {
            foundFiles.add(file);
          }
        }
        
        // For CI/CD and infrastructure, also check subdirectories
        if (matcher.category === 'cicd' || matcher.category === 'infrastructure') {
          for (const file of files) {
            if (pattern.test(file)) {
              foundFiles.add(file);
            }
          }
        }
      }
    }
    
    return Array.from(foundFiles);
  }

  /**
   * Get missing important files that should be discovered
   */
  static getMissingImportantFiles(availableFiles: string[]): string[] {
    const missingFiles: string[] = [];
    
    // Check each pattern category
    for (const matcher of allPatternMatchers) {
      const foundFiles = this.findFilesByPatterns(availableFiles, [matcher]);
      
      // If no files found for high-priority categories, suggest common alternatives
      if (foundFiles.length === 0 && matcher.priority >= 85) {
        const suggestions = this.getSuggestedFilesForCategory(matcher.category);
        missingFiles.push(...suggestions);
      }
    }
    
    return [...new Set(missingFiles)]; // Remove duplicates
  }

  /**
   * Get suggested file names for categories with no matches
   */
  private static getSuggestedFilesForCategory(category: string): string[] {
    const suggestions: { [key: string]: string[] } = {
      'documentation': ['README.md', 'how_to_run.md', 'INSTALL.md', 'setup.md'],
      'environment': ['environment.yml', 'requirements.txt', 'pyproject.toml', 'setup.py'],
      'build': ['Makefile', 'Dockerfile', 'docker-compose.yml'],
      'workflow': ['prefect.yaml', 'dvc.yaml', 'mlproject'],
      'infrastructure': ['main.tf', 'variables.tf']
    };
    
    return suggestions[category] || [];
  }
}
