import { z } from 'zod';

// GitHub URL validation schema
const githubUrlSchema = z.string().url().refine(
  (url) => {
    const githubPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
    return githubPattern.test(url);
  },
  {
    message: "Must be a valid GitHub repository URL (https://github.com/username/repository)"
  }
);

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
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
 * Validate and parse a GitHub repository URL
 */
export function validateGitHubUrl(url: string): RepoValidationResult {
  try {
    // Basic URL validation
    const validationResult = githubUrlSchema.safeParse(url);
    if (!validationResult.success) {
      return {
        isValid: false,
        error: validationResult.error.errors[0]?.message || 'Invalid GitHub URL format'
      };
    }

    // Extract owner and repo from URL
    const cleanUrl = url.replace(/\/$/, ''); // Remove trailing slash
    const urlParts = cleanUrl.split('/');
    
    if (urlParts.length < 5) {
      return {
        isValid: false,
        error: 'Invalid GitHub URL structure'
      };
    }

    const owner = urlParts[3];
    const repo = urlParts[4];

    // Validate owner and repo names
    const namePattern = /^[a-zA-Z0-9_.-]+$/;
    if (!namePattern.test(owner) || !namePattern.test(repo)) {
      return {
        isValid: false,
        error: 'Invalid repository or owner name format'
      };
    }

    // Construct raw.githubusercontent.com URL for file access
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main`;

    return {
      isValid: true,
      repoInfo: {
        owner,
        repo,
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
 * Get repository structure and key files for evaluation
 */
export async function getRepoStructure(repoInfo: GitHubRepoInfo): Promise<{
  files: string[];
  content: Record<string, string>;
  error?: string;
}> {
  try {
    // Use GitHub API to get repository tree
    const response = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/main?recursive=1`, {
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

    // Fetch content of key files (README, requirements, config files, etc.)
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
      /^build\.gradle$/i
    ];

    const keyFiles = files.filter(file => 
      keyFilePatterns.some(pattern => pattern.test(file))
    );

    // Fetch content for key files (limit to prevent excessive API calls)
    const filesToFetch = keyFiles.slice(0, 10);
    
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
