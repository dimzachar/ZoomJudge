import { z } from 'zod';

// GitHub commit URL validation schema
const githubCommitUrlSchema = z.string().url().refine(
  (url) => {
    const githubCommitPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/commit\/[a-f0-9]{7,40}\/?$/;
    return githubCommitPattern.test(url);
  },
  {
    message: "Must be a valid GitHub commit URL (https://github.com/username/repository/commit/commit-hash)"
  }
);

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  commitHash: string;
  url: string;
  rawUrl: string;
}

export interface RepoValidationResult {
  isValid: boolean;
  repoInfo?: GitHubRepoInfo;
  error?: string;
}

export interface RepoAccessibilityResult {
  isAccessible: boolean;
  hasReadme: boolean;
  readmeContent?: string;
  error?: string;
}

/**
 * Validate and parse a GitHub commit URL
 */
export function validateGitHubUrl(url: string): RepoValidationResult {
  try {
    console.log('[UPDATED VALIDATOR] Validating GitHub commit URL:', url);
    // Basic URL validation for commit URLs
    const validationResult = githubCommitUrlSchema.safeParse(url);
    if (!validationResult.success) {
      return {
        isValid: false,
        error: validationResult.error.errors[0]?.message || 'Invalid GitHub commit URL format'
      };
    }

    // Extract owner, repo, and commit hash from URL
    const cleanUrl = url.replace(/\/$/, ''); // Remove trailing slash
    const urlParts = cleanUrl.split('/');

    if (urlParts.length < 7) {
      return {
        isValid: false,
        error: 'Invalid GitHub commit URL structure'
      };
    }

    const owner = urlParts[3];
    const repo = urlParts[4];
    const commitHash = urlParts[6]; // commit hash is after /commit/

    // Validate owner and repo names
    const namePattern = /^[a-zA-Z0-9_.-]+$/;
    if (!namePattern.test(owner) || !namePattern.test(repo)) {
      return {
        isValid: false,
        error: 'Invalid repository or owner name format'
      };
    }

    // Validate commit hash format (7-40 hex characters)
    const commitHashPattern = /^[a-f0-9]{7,40}$/;
    if (!commitHashPattern.test(commitHash)) {
      return {
        isValid: false,
        error: 'Invalid commit hash format'
      };
    }

    // Construct raw.githubusercontent.com URL for file access using specific commit
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${commitHash}`;

    return {
      isValid: true,
      repoInfo: {
        owner,
        repo,
        commitHash,
        url: cleanUrl,
        rawUrl
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: `URL validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if a GitHub repository is publicly accessible
 */
export async function checkRepoAccessibility(repoInfo: GitHubRepoInfo): Promise<RepoAccessibilityResult> {
  try {
    // Try to fetch the README file
    const readmeUrls = [
      `${repoInfo.rawUrl}/README.md`,
      `${repoInfo.rawUrl}/readme.md`,
      `${repoInfo.rawUrl}/README.txt`,
      `${repoInfo.rawUrl}/readme.txt`
    ];

    let readmeContent: string | undefined;
    let hasReadme = false;

    for (const readmeUrl of readmeUrls) {
      try {
        const response = await fetch(readmeUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'ZoomJudge-Bot/1.0'
          }
        });

        if (response.ok) {
          readmeContent = await response.text();
          hasReadme = true;
          break;
        }
      } catch (error) {
        // Continue to next README variant
        continue;
      }
    }

    // If no README found, try to access the repository root to check if it's accessible
    if (!hasReadme) {
      try {
        const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'ZoomJudge-Bot/1.0',
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        if (response.ok) {
          const repoData = await response.json();
          return {
            isAccessible: !repoData.private,
            hasReadme: false,
            error: repoData.private ? 'Repository is private' : undefined
          };
        } else if (response.status === 404) {
          return {
            isAccessible: false,
            hasReadme: false,
            error: 'Repository not found'
          };
        } else {
          return {
            isAccessible: false,
            hasReadme: false,
            error: `Repository access check failed: ${response.status}`
          };
        }
      } catch (error) {
        return {
          isAccessible: false,
          hasReadme: false,
          error: `Failed to check repository accessibility: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }

    return {
      isAccessible: true,
      hasReadme,
      readmeContent
    };
  } catch (error) {
    return {
      isAccessible: false,
      hasReadme: false,
      error: `Accessibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Fetch repository file content
 */
export async function fetchRepoFile(repoInfo: GitHubRepoInfo, filePath: string): Promise<string | null> {
  try {
    const fileUrl = `${repoInfo.rawUrl}/${filePath}`;
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'ZoomJudge-Bot/1.0'
      }
    });

    if (response.ok) {
      return await response.text();
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch file ${filePath}:`, error);
    return null;
  }
}

/**
 * Calculate file importance score for prioritization
 */
function calculateFileImportanceScore(filePath: string): number {
  let score = 0;
  const fileName = filePath.toLowerCase();

  // High priority files
  if (fileName.includes('readme')) score += 100;
  if (fileName.includes('evaluation') || fileName.includes('eval')) score += 95;
  if (fileName.includes('analysis') || fileName.includes('experiment')) score += 90;
  if (fileName.endsWith('.ipynb')) score += 85;
  if (fileName.endsWith('.md')) score += 80;
  if (fileName.endsWith('.sql')) score += 75; // dbt models

  // MLOps Pipeline Files (HIGH PRIORITY for reproducibility)
  if (fileName.includes('src/pipeline/') || fileName.includes('pipeline/')) score += 95;
  if (fileName.includes('data_ingestion') || fileName.includes('data_preprocessing')) score += 90;
  if (fileName.includes('model_training') || fileName.includes('model_registry')) score += 90;
  if (fileName.includes('orchestrate') || fileName.includes('orchestration')) score += 85;
  if (fileName.endsWith('model.py') || fileName.endsWith('lambda_function.py')) score += 85;
  if (fileName.includes('monitoring') || fileName.includes('drift')) score += 80;
  if (fileName.includes('inference') || fileName.includes('serve')) score += 75;

  // Implementation files
  if (fileName.includes('rag.') || fileName.includes('rag/')) score += 75;
  if (fileName.includes('prep.') || fileName.includes('ingest.')) score += 70;
  if (fileName.endsWith('requirements.txt') || fileName.includes('package.json')) score += 65;
  if (fileName.includes('docker') || fileName.includes('docker-compose')) score += 60;
  if (fileName.endsWith('.tf')) score += 60; // terraform
  if (fileName.endsWith('.py') || fileName.endsWith('.js') || fileName.endsWith('.ts')) score += 55;

  // Data and config files
  if (fileName.includes('ground') && fileName.includes('truth')) score += 80;
  if (fileName.includes('metrics') || fileName.includes('results')) score += 75;
  if (fileName.includes('notebook')) score += 70;
  if (fileName.endsWith('.json')) score += 50;

  // Directory-based boosts for DE Zoomcamp
  if (fileName.startsWith('dbt/')) score += 80;
  if (fileName.startsWith('terraform/')) score += 70;
  if (fileName.startsWith('orchestration/dags/')) score += 75;
  if (fileName.startsWith('processing/dataflow/')) score += 70;
  if (fileName.startsWith('processing/src/')) score += 65;
  if (fileName.startsWith('scripts/')) score += 60;

  // Bonus for files in root directory
  if (!filePath.includes('/')) score += 10;

  return score;
}

/**
 * Get repository structure and key files for evaluation
 */
export async function getRepoStructure(repoInfo: GitHubRepoInfo): Promise<{
  files: string[];
  content: Record<string, string>;
  error?: string;
}> {
  try {
    // Use GitHub API to get repository tree for the specific commit
    const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${repoInfo.commitHash}?recursive=1`, {
      method: 'GET',
      headers: {
        'User-Agent': 'ZoomJudge-Bot/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repository structure: ${response.status}`);
    }

    const treeData = await response.json();
    const files: string[] = [];
    const content: Record<string, string> = {};

    // Extract file paths
    for (const item of treeData.tree) {
      if (item.type === 'blob') {
        files.push(item.path);
      }
    }

    // Fetch content of key files - comprehensive patterns for better evaluation
    const keyFilePatterns = [
      // Core configuration files
      /^README\.(md|txt)$/i,
      /^requirements\.txt$/i,
      /^package\.json$/i,
      /(^|\/)Dockerfile$/i,
      /^docker-compose\.ya?ml$/i,
      /^\.env\.example$/i,
      /^setup\.py$/i,
      /^pyproject\.toml$/i,
      /^Cargo\.toml$/i,
      /^go\.mod$/i,
      /^pom\.xml$/i,
      /^build\.gradle$/i,
      /^Makefile$/i,
      /^Pipfile$/i,
      
      // Documentation and analysis files (CRITICAL for evaluation)
      /\.md$/i,                     // All markdown files
      /\.py$/i,                     // All Python files
      /\.ipynb$/i,                  // Jupyter notebooks
      /\.sql$/i,                    // SQL files (dbt/models)
      /\.js$/i,                     // JavaScript files
      /\.ts$/i,                     // TypeScript files
      
      // Evaluation-specific files
      /evaluation/i,                // Files with "evaluation" in path/name
      /analysis/i,                  // Analysis files
      /experiment/i,                // Experiment files
      /benchmark/i,                 // Benchmark files
      /notebook/i,                  // Notebook-related files
      /ground.?truth/i,             // Ground truth files
      /metrics/i,                   // Metrics files
      /results/i,                   // Results files
      /(^|\/)tests?(\/|$)|\btest\b/i, // Test files (avoid matching 'latest')
      
      // Common application files
      /^app\./i,                    // App entry points
      /^main\./i,                   // Main files
      /^index\./i,                  // Index files
      /^train\./i,                  // Training scripts
      /^predict\./i,                // Prediction scripts
      /^run\./i,                    // Run scripts
      /^prep\./i,                   // Preparation scripts
      /^ingest\./i,                 // Ingestion scripts
      /^rag\./i,                    // RAG implementation files
      
      // Data files (small ones) — CSV intentionally excluded by guardrail
      /\.json$/i,                   // JSON files
      /\.yml$/i,                    // YAML files
      /\.yaml$/i,                   // YAML files
      /\.toml$/i,                   // TOML files
      /\.ini$/i,                    // INI files
      
      // Data Engineering Zoomcamp specific paths
      /(^|\/)dbt\/.+\.(sql|ya?ml)$/i,
      /(^|\/)terraform\/.+\.tf$/i,
      /(^|\/)orchestration\/dags\/.+\.py$/i,
      /(^|\/)processing\/dataflow\/.+\.(py|sql|ya?ml)$/i,
      /(^|\/)processing\/src\/.+\.(py|sql)$/i,
      /(^|\/)scripts\/.+\.(sh|py)$/i,
      /(^|\/)requirements\.txt$/i,
    ];

    const keyFiles = files.filter(file => 
      keyFilePatterns.some(pattern => pattern.test(file))
    );

    // Guardrail: exclude media/binary/office/archives and CSVs
    const excludedExtensions = /\.(png|jpe?g|gif|svg|webp|bmp|tiff|ico|psd|pdf|zip|gz|tar|7z|xz|rar|mp3|wav|flac|mp4|mov|avi|mkv|pptx?|docx?|xlsx?|csv)$/i;
    const allowedJsonFiles = new Set([
      'package.json',
      'tsconfig.json',
      '.eslintrc.json',
      'components.json',
      'dashboard.json'
    ]);
    const filteredKeyFiles = keyFiles.filter(file => {
      if (excludedExtensions.test(file)) return false;
      // Exclude any logs directories
      if (/(^|\/)logs(\/|$)/i.test(file)) return false;
      const base = (file.split('/').pop() || '').toLowerCase();
      if (base.endsWith('.json') && !allowedJsonFiles.has(base)) return false;
      return true;
    });

    // Prioritize files by importance for evaluation
    const prioritizedFiles = filteredKeyFiles.sort((a, b) => {
      const scoreA = calculateFileImportanceScore(a);
      const scoreB = calculateFileImportanceScore(b);
      return scoreB - scoreA; // Sort descending (highest score first)
    });

    // Fetch content for key files (increased limit for better evaluation coverage)
    const filesToFetch = prioritizedFiles.slice(0, 50);
    
    for (const file of filesToFetch) {
      const fileContent = await fetchRepoFile(repoInfo, file);
      if (fileContent) {
        content[file] = fileContent;
      }
    }

    return {
      files,
      content
    };
  } catch (error) {
    return {
      files: [],
      content: {},
      error: `Failed to get repository structure: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Sanitize and validate repository URL for security
 */
export function sanitizeRepoUrl(url: string): string {
  // Remove any potential XSS or injection attempts
  const sanitized = url
    .trim()
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, ''); // Remove vbscript: protocol

  return sanitized;
}

/**
 * Complete repository validation workflow
 */
export async function validateRepository(url: string): Promise<{
  isValid: boolean;
  repoInfo?: GitHubRepoInfo;
  accessibility?: RepoAccessibilityResult;
  structure?: { files: string[]; content: Record<string, string> };
  error?: string;
}> {
  try {
    // Sanitize URL
    const sanitizedUrl = sanitizeRepoUrl(url);
    
    // Validate URL format
    const validation = validateGitHubUrl(sanitizedUrl);
    if (!validation.isValid || !validation.repoInfo) {
      return {
        isValid: false,
        error: validation.error
      };
    }

    // Check accessibility
    const accessibility = await checkRepoAccessibility(validation.repoInfo);
    if (!accessibility.isAccessible) {
      return {
        isValid: false,
        repoInfo: validation.repoInfo,
        accessibility,
        error: accessibility.error
      };
    }

    // Get repository structure
    const structure = await getRepoStructure(validation.repoInfo);
    
    return {
      isValid: true,
      repoInfo: validation.repoInfo,
      accessibility,
      structure
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Repository validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
