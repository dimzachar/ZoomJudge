import { getOpenRouterClient } from './openrouter';
import { validateRepository, GitHubRepoInfo } from './github-validator';

export interface EvaluationRequest {
  repoUrl: string;
  courseType: string;
  userId: string;
}

export interface EvaluationResult {
  success: boolean;
  evaluationId?: string;
  results?: {
    totalScore: number;
    maxScore: number;
    breakdown: Record<string, { score: number; feedback: string; maxScore: number }>;
    overallFeedback: string;
  };
  error?: string;
}

export class EvaluationService {
  /**
   * Process a repository evaluation request
   */
  async processEvaluation(request: EvaluationRequest): Promise<EvaluationResult> {
    try {
      // Step 1: Validate repository
      console.log(`Starting evaluation for ${request.repoUrl}`);
      const validation = await validateRepository(request.repoUrl);
      
      if (!validation.isValid || !validation.repoInfo) {
        return {
          success: false,
          error: validation.error || 'Repository validation failed'
        };
      }

      // Step 2: Prepare repository content for evaluation
      const repoContent = await this.prepareRepoContent(validation.repoInfo, validation.structure);
      
      if (!repoContent) {
        return {
          success: false,
          error: 'Failed to fetch repository content'
        };
      }

      // Step 3: Perform AI evaluation
      console.log(`Evaluating repository content for course: ${request.courseType}`);
      const openRouterClient = getOpenRouterClient();
      const evaluationResults = await openRouterClient.evaluateRepository(
        request.repoUrl,
        request.courseType,
        repoContent
      );

      return {
        success: true,
        results: evaluationResults
      };

    } catch (error) {
      console.error('Evaluation processing failed:', error);
      return {
        success: false,
        error: `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Prepare repository content for AI evaluation
   */
  private async prepareRepoContent(
    repoInfo: GitHubRepoInfo, 
    structure?: { files: string[]; content: Record<string, string> }
  ): Promise<string | null> {
    try {
      if (!structure) {
        return null;
      }

      let content = `Repository: ${repoInfo.owner}/${repoInfo.repo}\n`;
      content += `URL: ${repoInfo.url}\n\n`;

      // Add file structure overview
      content += "=== REPOSITORY STRUCTURE ===\n";
      const relevantFiles = structure.files
        .filter(file => this.isRelevantFile(file))
        .slice(0, 50); // Limit to prevent token overflow
      
      content += relevantFiles.join('\n') + '\n\n';

      // Add key file contents
      content += "=== KEY FILE CONTENTS ===\n\n";
      
      for (const [filePath, fileContent] of Object.entries(structure.content)) {
        if (this.isKeyFile(filePath)) {
          content += `--- ${filePath} ---\n`;
          content += this.truncateContent(fileContent, 2000) + '\n\n';
        }
      }

      // Add additional context based on file types found
      content += this.generateContextualInfo(structure.files);

      return content;
    } catch (error) {
      console.error('Failed to prepare repository content:', error);
      return null;
    }
  }

  /**
   * Check if a file is relevant for evaluation
   */
  private isRelevantFile(filePath: string): boolean {
    const irrelevantPatterns = [
      /node_modules/,
      /\.git/,
      /\.vscode/,
      /\.idea/,
      /__pycache__/,
      /\.pyc$/,
      /\.log$/,
      /\.tmp$/,
      /\.cache/,
      /dist/,
      /build/,
      /coverage/,
    ];

    return !irrelevantPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Check if a file is a key file that should have its content included
   */
  private isKeyFile(filePath: string): boolean {
    const keyFilePatterns = [
      /^README\.(md|txt)$/i,
      /^requirements\.txt$/i,
      /^package\.json$/i,
      /^Dockerfile$/i,
      /^docker-compose\.ya?ml$/i,
      /^\.env\.example$/i,
      /^setup\.py$/i,
      /^pyproject\.toml$/i,
      /^Cargo\.toml$/i,
      /^go\.mod$/i,
      /^pom\.xml$/i,
      /^build\.gradle$/i,
      /^Makefile$/i,
      /^\.github\/workflows\/.+\.ya?ml$/i,
    ];

    return keyFilePatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Truncate content to prevent token overflow
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength) + '\n... [Content truncated for brevity] ...';
  }

  /**
   * Generate contextual information based on files found
   */
  private generateContextualInfo(files: string[]): string {
    let context = "=== REPOSITORY ANALYSIS ===\n";

    // Detect programming languages
    const languages = this.detectLanguages(files);
    if (languages.length > 0) {
      context += `Programming Languages Detected: ${languages.join(', ')}\n`;
    }

    // Detect frameworks and tools
    const frameworks = this.detectFrameworks(files);
    if (frameworks.length > 0) {
      context += `Frameworks/Tools Detected: ${frameworks.join(', ')}\n`;
    }

    // Detect project structure patterns
    const patterns = this.detectProjectPatterns(files);
    if (patterns.length > 0) {
      context += `Project Patterns: ${patterns.join(', ')}\n`;
    }

    return context + '\n';
  }

  /**
   * Detect programming languages from file extensions
   */
  private detectLanguages(files: string[]): string[] {
    const languageMap: Record<string, string> = {
      '.py': 'Python',
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.java': 'Java',
      '.scala': 'Scala',
      '.go': 'Go',
      '.rs': 'Rust',
      '.cpp': 'C++',
      '.c': 'C',
      '.cs': 'C#',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
      '.r': 'R',
      '.sql': 'SQL',
      '.sh': 'Shell',
      '.ps1': 'PowerShell',
    };

    const detectedLanguages = new Set<string>();
    
    files.forEach(file => {
      const ext = file.substring(file.lastIndexOf('.'));
      if (languageMap[ext]) {
        detectedLanguages.add(languageMap[ext]);
      }
    });

    return Array.from(detectedLanguages);
  }

  /**
   * Detect frameworks and tools from file patterns
   */
  private detectFrameworks(files: string[]): string[] {
    const frameworks: string[] = [];

    // Check for specific files that indicate frameworks
    const frameworkIndicators: Record<string, string> = {
      'package.json': 'Node.js',
      'requirements.txt': 'Python',
      'Pipfile': 'Python/Pipenv',
      'poetry.lock': 'Python/Poetry',
      'Cargo.toml': 'Rust/Cargo',
      'go.mod': 'Go Modules',
      'pom.xml': 'Maven',
      'build.gradle': 'Gradle',
      'Dockerfile': 'Docker',
      'docker-compose.yml': 'Docker Compose',
      'terraform.tf': 'Terraform',
      'main.tf': 'Terraform',
      'serverless.yml': 'Serverless Framework',
      'kubernetes.yaml': 'Kubernetes',
      'k8s.yaml': 'Kubernetes',
    };

    files.forEach(file => {
      const fileName = file.split('/').pop() || '';
      if (frameworkIndicators[fileName]) {
        frameworks.push(frameworkIndicators[fileName]);
      }
    });

    // Check for directory patterns
    if (files.some(f => f.includes('/.github/workflows/'))) {
      frameworks.push('GitHub Actions');
    }
    if (files.some(f => f.includes('/terraform/'))) {
      frameworks.push('Terraform');
    }
    if (files.some(f => f.includes('/k8s/') || f.includes('/kubernetes/'))) {
      frameworks.push('Kubernetes');
    }

    return [...new Set(frameworks)];
  }

  /**
   * Detect common project patterns
   */
  private detectProjectPatterns(files: string[]): string[] {
    const patterns: string[] = [];

    // Check for common project structures
    if (files.some(f => f.includes('/src/')) && files.some(f => f.includes('/tests/'))) {
      patterns.push('Standard Source/Test Structure');
    }
    
    if (files.some(f => f.includes('/notebooks/')) || files.some(f => f.endsWith('.ipynb'))) {
      patterns.push('Jupyter Notebooks');
    }
    
    if (files.some(f => f.includes('/data/')) || files.some(f => f.includes('/datasets/'))) {
      patterns.push('Data Directory Structure');
    }
    
    if (files.some(f => f.includes('/models/')) || files.some(f => f.includes('/ml/'))) {
      patterns.push('Machine Learning Structure');
    }
    
    if (files.some(f => f.includes('/pipelines/')) || files.some(f => f.includes('/etl/'))) {
      patterns.push('Data Pipeline Structure');
    }

    if (files.some(f => f.includes('/.github/workflows/'))) {
      patterns.push('CI/CD Pipeline');
    }

    return patterns;
  }

  /**
   * Test the evaluation service
   */
  async testService(): Promise<boolean> {
    try {
      // Test OpenRouter connection
      const openRouterClient = getOpenRouterClient();
      const connectionTest = await openRouterClient.testConnection();
      return connectionTest;
    } catch (error) {
      console.error('Evaluation service test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const evaluationService = new EvaluationService();
