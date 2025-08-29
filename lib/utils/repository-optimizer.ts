/**
 * Repository optimization utilities for handling large repositories and artifact filtering
 */

export interface RepositoryOptimizationResult {
  files: string[];
  wasFiltered: boolean;
  filterReason?: string;
  originalCount: number;
  filteredCount: number;
}

export interface MLExperimentSignals {
  artifactCount: number;
  mlrunCount: number;
  hasMLflowConfig: boolean;
  hasWandb: boolean;
  hasExperimentPatterns: number;
  hasDvcConfig: boolean;
}

/**
 * Detect if repository contains ML experiment tracking with threshold-based detection
 */
export function detectMLExperimentRepository(files: string[]): { isMLRepo: boolean; signals: MLExperimentSignals } {
  const signals: MLExperimentSignals = {
    artifactCount: files.filter(f => f.includes('artifacts/')).length,
    mlrunCount: files.filter(f => f.includes('mlruns/')).length,
    hasMLflowConfig: files.some(f => f.includes('MLproject') || f.includes('mlflow.yml') || f.includes('mlflow.yaml')),
    hasWandb: files.some(f => f.includes('wandb/') || f.includes('.wandb/')),
    hasExperimentPatterns: files.filter(f => /[0-9a-f]{8}-[0-9a-f]{4}/.test(f)).length,
    hasDvcConfig: files.some(f => f.includes('dvc.yaml') || f.includes('.dvc/'))
  };

  // Threshold-based detection to avoid false positives
  const isMLRepo = (
    (signals.artifactCount > 100 || signals.mlrunCount > 50 || signals.hasExperimentPatterns > 50) &&
    (signals.hasMLflowConfig || signals.hasWandb || signals.hasDvcConfig)
  );

  return { isMLRepo, signals };
}

/**
 * Check if a file is an important artifact that should be preserved
 */
export function isImportantArtifact(file: string): boolean {
  // Preserve important configuration and model files
  if (file.includes('MLproject') || 
      file.includes('conda.yaml') || 
      file.includes('conda.yml') ||
      file.includes('model.pkl') ||
      file.includes('model.joblib') ||
      file.includes('dvc.yaml') ||
      file.includes('dvc.lock')) {
    return true;
  }

  // Keep first classification report only (not duplicates)
  if (file.includes('classification_report') && !file.includes('_1.txt') && !file.includes('_2.txt')) {
    return true;
  }

  // Keep only ONE requirements.txt file (prefer root level, then shortest path)
  if (file.includes('requirements.txt')) {
    // Only keep root-level requirements.txt or the first one found
    const pathDepth = file.split('/').length;
    return pathDepth <= 2; // Root level or one directory deep
  }

  // Keep experiment configuration files
  if (file.includes('experiment.yaml') || file.includes('config.yaml') || file.includes('params.yaml')) {
    return true;
  }

  return false;
}

/**
 * Check if a file is an experiment artifact that should be filtered
 */
export function isExperimentArtifact(file: string): boolean {
  // Common artifact patterns
  const artifactPatterns = [
    /artifacts\/[0-9a-f]{8}-[0-9a-f]{4}/,  // MLflow artifacts with UUIDs
    /mlruns\/[0-9]+\/[0-9a-f]{8}-[0-9a-f]{4}/,  // MLflow runs
    /wandb\/run-[0-9]{8}-[0-9]{6}/,  // Wandb runs
    /outputs\/[0-9]{4}-[0-9]{2}-[0-9]{2}/,  // Date-based output directories
  ];

  return artifactPatterns.some(pattern => pattern.test(file));
}

/**
 * Apply intelligent artifact filtering to reduce noise from ML experiment files
 */
export function filterMLArtifacts(files: string[]): RepositoryOptimizationResult {
  const originalCount = files.length;
  const detection = detectMLExperimentRepository(files);

  if (!detection.isMLRepo) {
    return {
      files,
      wasFiltered: false,
      originalCount,
      filteredCount: originalCount
    };
  }

  console.log(`🔬 ML experiment repository detected:`, {
    artifacts: detection.signals.artifactCount,
    mlruns: detection.signals.mlrunCount,
    hasMLflow: detection.signals.hasMLflowConfig,
    hasWandb: detection.signals.hasWandb,
    experimentPatterns: detection.signals.hasExperimentPatterns
  });

  // Filter out experiment artifacts but preserve important ones
  const filteredFiles = files.filter(file => {
    if (isExperimentArtifact(file)) {
      return isImportantArtifact(file);
    }
    return true;
  });

  // Apply additional deduplication for redundant artifacts
  const deduplicatedFiles = deduplicateArtifacts(filteredFiles);

  const filteredCount = deduplicatedFiles.length;
  const filterReason = `Filtered ${originalCount - filteredCount} ML experiment artifacts (${detection.signals.artifactCount} artifacts, ${detection.signals.mlrunCount} mlruns)`;

  console.log(`📊 Artifact filtering result: ${originalCount} → ${filteredCount} files (${Math.round((1 - filteredCount/originalCount) * 100)}% reduction)`);

  return {
    files: deduplicatedFiles,
    wasFiltered: true,
    filterReason,
    originalCount,
    filteredCount
  };
}

/**
 * Deduplicate redundant artifact files (keep only representative samples)
 */
function deduplicateArtifacts(files: string[]): string[] {
  const requirementsTxtFiles = files.filter(f => f.includes('requirements.txt'));
  const mlmodelFiles = files.filter(f => f.includes('MLmodel'));
  const reportFiles = files.filter(f => f.includes('classification_report.json'));
  const otherFiles = files.filter(f =>
    !f.includes('requirements.txt') &&
    !f.includes('MLmodel') &&
    !f.includes('classification_report.json')
  );

  // Keep only 2-3 representative samples of each type
  const deduplicatedFiles = [
    ...otherFiles,
    ...requirementsTxtFiles.slice(0, 2), // Keep only 2 requirements.txt files
    ...mlmodelFiles.slice(0, 2),         // Keep only 2 MLmodel files
    ...reportFiles.slice(0, 2)           // Keep only 2 report files
  ];

  if (requirementsTxtFiles.length > 2) {
    console.log(`🔧 Deduplicated artifacts: ${requirementsTxtFiles.length} → 2 requirements.txt files`);
  }

  return deduplicatedFiles;
}

/**
 * Handle GitHub API responses with intelligent truncation handling for edge cases only
 * Normal repos: No change in behavior
 * Edge cases (35k+ files): Smart directory fetching with authentication
 */
export async function handleTruncatedResponse(
  repoInfo: { owner: string; repo: string; commitHash: string },
  data: any
): Promise<string[]> {
  // Extract all files from the response
  const allFiles = data.tree
    .filter((item: any) => item.type === 'blob')
    .map((item: any) => item.path)
    .filter((path: string) => path && typeof path === 'string');

  console.log(`📁 GitHub API returned ${allFiles.length} files for ${repoInfo.owner}/${repoInfo.repo}`);
  console.log(`🔍 THRESHOLD CHECK: ${allFiles.length} files >= 1000? ${allFiles.length >= 1000}`);

  // EDGE CASE: Handle large repositories (1000+ files) with intelligent discovery
  if (allFiles.length >= 1000) {
    console.log(`🚨 EDGE CASE: Large repository detected (${allFiles.length} files), using intelligent directory discovery...`);
    console.log(`📊 Repository status: truncated=${data.truncated}, files=${allFiles.length}`);

    try {
      console.log(`🔍 Calling fetchCriticalDirectoriesWithAuth...`);
      const additionalFiles = await fetchCriticalDirectoriesWithAuth(repoInfo, data, allFiles);
      console.log(`📊 fetchCriticalDirectoriesWithAuth returned ${additionalFiles.length} files`);
      console.log(`📋 Sample additional files: ${additionalFiles.slice(0, 5).join(', ')}`);

      const totalFiles = [...new Set([...allFiles, ...additionalFiles])];

      console.log(`✅ Edge case handling: ${allFiles.length} → ${totalFiles.length} files (+${additionalFiles.length} from intelligent discovery)`);
      return totalFiles;

    } catch (error) {
      console.warn(`⚠️ Edge case handling failed, proceeding with ${allFiles.length} files:`, error);
      return allFiles;
    }
  }

  // NORMAL REPOS: No change - return as before
  console.log(`📁 Normal repository (${allFiles.length} files), using standard discovery`);
  if (data.truncated) {
    console.warn(`⚠️ Small repo truncated (${allFiles.length} files), but proceeding normally`);
  }

  return allFiles;
}

/**
 * EDGE CASE ONLY: Fetch critical directories with authentication and throttling
 * Only called for repositories with 35k+ files that are truncated
 */
async function fetchCriticalDirectoriesWithAuth(
  repoInfo: { owner: string; repo: string; commitHash: string },
  truncatedData: any,
  availableFiles: string[]
): Promise<string[]> {
  console.log(`🔍 EDGE CASE: Fetching critical directories for massive repo ${repoInfo.owner}/${repoInfo.repo}`);

  // Get GitHub token for higher rate limits (15k vs 5k requests/hour)
  const headers: Record<string, string> = {
    'User-Agent': 'ZoomJudge-Bot/1.0',
    'Accept': 'application/vnd.github.v3+json'
  };

  // Add authentication if available
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    console.log(`🔑 Using GitHub token for edge case handling`);
  } else {
    console.warn(`⚠️ No GitHub token - edge case handling may hit rate limits`);
  }

  // Get available directories from truncated response
  const availableDirectories = new Set<string>();
  truncatedData.tree.forEach((item: any) => {
    if (item.type === 'tree') {
      availableDirectories.add(item.path);
    }
    if (item.type === 'blob' && item.path.includes('/')) {
      const dirPath = item.path.substring(0, item.path.lastIndexOf('/'));
      availableDirectories.add(dirPath);
    }
  });

  // INTELLIGENT directory discovery: Find what directories actually exist
  const missingDirectories = await discoverMissingDirectories(repoInfo, truncatedData, headers);
  console.log(`🔍 Discovered ${missingDirectories.length} missing directories: ${missingDirectories.slice(0, 5).join(', ')}${missingDirectories.length > 5 ? '...' : ''}`);

  const additionalFiles: string[] = [];
  const fetchedDirs = new Set<string>();
  let requestCount = 0;
  const MAX_REQUESTS = 15; // Increased to include root files

  // Throttling function
  const throttle = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // FIRST: Check for missing important root files (DYNAMIC PATTERNS)
  const { DynamicPatternDetector } = await import('./dynamic-pattern-detector');

  // Get missing files using dynamic pattern detection
  const missingImportantFiles = DynamicPatternDetector.getMissingImportantFiles(
    availableFiles.filter(f => !f.includes('/')) // Only check root files
  );

  console.log(`🔍 Dynamic pattern detection found ${missingImportantFiles.length} missing important files: ${missingImportantFiles.slice(0, 5).join(', ')}${missingImportantFiles.length > 5 ? '...' : ''}`);

  const importantRootFiles = missingImportantFiles;

  const availableRootFiles = new Set(
    availableFiles.filter(f => !f.includes('/')).map(f => f.toLowerCase())
  );

  const missingRootFiles = importantRootFiles.filter(file =>
    !availableRootFiles.has(file.toLowerCase())
  );

  console.log(`🔍 Missing important root files: ${missingRootFiles.join(', ')}`);

  // Fetch missing root files (INCREASED LIMIT for critical files)
  for (const file of missingRootFiles.slice(0, 10)) { // Increased to 10 root files
    if (requestCount >= MAX_REQUESTS) break;

    try {
      console.log(`🔍 Checking missing root file: ${file}`);
      const fileResponse = await fetch(
        `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${file}?ref=${repoInfo.commitHash}`,
        { method: 'GET', headers }
      );

      if (fileResponse.ok) {
        additionalFiles.push(file);
        console.log(`✅ Found missing root file: ${file}`);
      }

      requestCount++;
      await throttle(300); // Reduced delay for faster processing
    } catch (error) {
      console.log(`📂 Root file '${file}' not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
      requestCount++;
    }
  }

  for (const dir of missingDirectories) {
    if (requestCount >= MAX_REQUESTS) {
      console.log(`🛑 Reached request limit (${MAX_REQUESTS}) for edge case handling`);
      break;
    }

    if (!fetchedDirs.has(dir)) {
      try {
        console.log(`🔍 Fetching missing directory: ${dir}`);
        const dirFiles = await fetchDirectoryFilesWithAuth(repoInfo, dir, headers);

        if (dirFiles.length > 0) {
          console.log(`✅ Found missing directory '${dir}' with ${dirFiles.length} files`);
          additionalFiles.push(...dirFiles);
          fetchedDirs.add(dir);
        }

        requestCount++;

        // Throttle requests to avoid rate limits (1 request per second)
        if (requestCount < MAX_REQUESTS) {
          await throttle(1000);
        }

      } catch (error) {
        // Expected for non-existent directories - don't log as error
        console.log(`📂 Directory '${dir}' not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  console.log(`📊 Edge case handling: Fetched ${fetchedDirs.size} critical directories, ${additionalFiles.length} additional files`);
  return additionalFiles;
}

/**
 * INTELLIGENT: Discover missing directories by analyzing repository structure
 * This replaces hardcoded directory lists with dynamic discovery
 */
async function discoverMissingDirectories(
  repoInfo: { owner: string; repo: string; commitHash: string },
  truncatedData: any,
  headers: Record<string, string>
): Promise<string[]> {
  console.log(`🧠 Intelligently discovering missing directories...`);

  // Get all directories that ARE present in truncated response
  const availableDirectories = new Set<string>();
  const availableFiles = new Set<string>();

  truncatedData.tree.forEach((item: any) => {
    if (item.type === 'tree') {
      availableDirectories.add(item.path);
    } else if (item.type === 'blob') {
      availableFiles.add(item.path);
      // Extract parent directories from file paths
      const parts = item.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join('/');
        availableDirectories.add(dirPath);
      }
    }
  });

  console.log(`📂 Found ${availableDirectories.size} directories in truncated response`);

  // Try to discover what directories SHOULD exist by sampling the repository structure
  // Use a lightweight approach: check common root-level directories first
  const potentialDirectories: string[] = [];

  try {
    // Get the root tree (non-recursive) to see top-level directories
    const rootResponse = await fetch(
      `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${repoInfo.commitHash}`,
      {
        method: 'GET',
        headers
      }
    );

    if (rootResponse.ok) {
      const rootData = await rootResponse.json();
      const rootDirectories = rootData.tree
        .filter((item: any) => item.type === 'tree')
        .map((item: any) => item.path);

      console.log(`🌳 Root directories found: ${rootDirectories.join(', ')}`);
      console.log(`📂 Available directories in truncated response: ${Array.from(availableDirectories).slice(0, 10).join(', ')}...`);

      // Find directories that exist at root but are missing from truncated response
      for (const rootDir of rootDirectories) {
        if (!availableDirectories.has(rootDir)) {
          potentialDirectories.push(rootDir);
          console.log(`🔍 Missing root directory detected: ${rootDir}`);
        } else {
          console.log(`✅ Directory already available: ${rootDir}`);
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ Could not fetch root tree for intelligent discovery: ${error}`);
  }

  // Prioritize directories by importance for evaluation
  const priorityScore = (dir: string): number => {
    const patterns = [
      { pattern: /^(src|source|lib|app)$/i, score: 100 },
      { pattern: /^(infra|infrastructure|terraform|k8s)$/i, score: 95 },
      { pattern: /^(tests?|test|__tests__|spec)$/i, score: 90 },
      { pattern: /^(flows|dags|pipelines|workflows)$/i, score: 85 },
      { pattern: /^(webapp|web|frontend|backend|client|server)$/i, score: 80 },
      { pattern: /^(data|models|reports|analysis)$/i, score: 75 },
      { pattern: /^(docs?|documentation)$/i, score: 70 },
      { pattern: /^(config|configs|settings)$/i, score: 65 },
      { pattern: /^(scripts|bin|tools|utils)$/i, score: 60 }
    ];

    for (const { pattern, score } of patterns) {
      if (pattern.test(dir)) return score;
    }
    return 50; // Default score for other directories
  };

  // Sort by priority and return top candidates
  const sortedDirectories = potentialDirectories
    .sort((a, b) => priorityScore(b) - priorityScore(a))
    .slice(0, 15); // Limit to prevent excessive API calls

  console.log(`🎯 Prioritized missing directories: ${sortedDirectories.join(', ')}`);
  return sortedDirectories;
}

/**
 * Fetch files from a specific directory with authentication
 */
async function fetchDirectoryFilesWithAuth(
  repoInfo: { owner: string; repo: string; commitHash: string },
  directoryPath: string,
  headers: Record<string, string>
): Promise<string[]> {
  const response = await fetch(
    `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${repoInfo.commitHash}:${directoryPath}?recursive=1`,
    {
      method: 'GET',
      headers
    }
  );

  if (!response.ok) {
    throw new Error(`Directory ${directoryPath} not found or inaccessible (${response.status})`);
  }

  const data = await response.json();

  if (!data.tree || !Array.isArray(data.tree)) {
    return [];
  }

  // Return file paths with directory prefix
  return data.tree
    .filter((item: any) => item.type === 'blob')
    .map((item: any) => `${directoryPath}/${item.path}`)
    .filter((path: string) => path && typeof path === 'string');
}

/**
 * LEGACY: Fetch missing directories when GitHub API response is truncated
 * @deprecated Use fetchCriticalDirectoriesWithAuth for edge cases
 */
async function fetchMissingDirectories(
  repoInfo: { owner: string; repo: string; commitHash: string },
  truncatedData: any,
  availableFiles: string[]
): Promise<string[]> {
  console.log(`🔍 Attempting to fetch missing directories for ${repoInfo.owner}/${repoInfo.repo}`);

  // Get all directories that are present in the truncated response
  const availableDirectories = new Set<string>();
  truncatedData.tree.forEach((item: any) => {
    if (item.type === 'tree') {
      availableDirectories.add(item.path);
    }
    // Also extract directories from file paths
    if (item.type === 'blob' && item.path.includes('/')) {
      const dirPath = item.path.substring(0, item.path.lastIndexOf('/'));
      availableDirectories.add(dirPath);
    }
  });

  console.log(`📂 Available directories in truncated response: ${Array.from(availableDirectories).slice(0, 10).join(', ')}${availableDirectories.size > 10 ? '...' : ''}`);

  // Common important directories that might be missing (based on passcompass analysis)
  const importantDirectories = [
    // Core application directories
    'src', 'lib', 'app', 'components', 'pages', 'api',
    'flows', 'infra', 'terraform', 'k8s', 'kubernetes',
    'tests', 'test', '__tests__', 'spec',
    'webapp', 'web', 'frontend', 'backend', 'client', 'server',

    // Data and analysis
    'data', 'datasets', 'models', 'artifacts',
    'reports', 'analysis', 'notebooks', '_exploration',
    'imgs', 'images', 'assets', 'static', 'public',

    // Documentation and configuration
    'docs', 'documentation', 'config', 'configs', 'settings',
    'scripts', 'bin', 'tools', 'utils', 'helpers', 'common', 'shared',

    // Development and deployment
    'deployment', 'deploy', 'ci', 'cd', '.github', '.vscode',
    'migrations', 'sql', 'database', 'experiments'
  ];

  const allFiles = [...availableFiles];
  const fetchedDirectories = new Set<string>();

  // Try to fetch each important directory that's not in the truncated response
  for (const dir of importantDirectories) {
    if (!availableDirectories.has(dir) && !fetchedDirectories.has(dir)) {
      try {
        const dirFiles = await fetchDirectoryFiles(repoInfo, dir);
        if (dirFiles.length > 0) {
          console.log(`✅ Found missing directory '${dir}' with ${dirFiles.length} files`);
          allFiles.push(...dirFiles);
          fetchedDirectories.add(dir);
        }
      } catch (error) {
        // Directory doesn't exist or is inaccessible - this is expected for many directories
        // Don't log errors for missing directories as it's normal
      }
    }
  }

  // Also try nested important directories (based on common patterns + passcompass)
  const nestedImportantDirs = [
    // GitHub and CI/CD
    '.github/workflows', '.github/actions',

    // Source code patterns
    'src/main', 'src/components', 'src/pages', 'src/api', 'src/passcompass_utils',
    'webapp/templates', 'webapp/static', 'webapp/api',

    // Infrastructure patterns
    'infra/terraform', 'infra/k8s', 'infra/docker', 'infra/gcp', 'infra/aws',

    // Testing patterns
    'tests/unit', 'tests/integration', 'tests/e2e', 'tests/functional',

    // Data and ML patterns
    'data/raw', 'data/processed', 'data/external',
    'models/trained', 'models/artifacts',
    'flows/training_pipeline', 'flows/evidently_pipeline',

    // Documentation and configuration
    'docs/api', 'docs/guides', 'docs/setup',
    'config/environments', 'config/database', 'config/ml',

    // Reports and analysis
    'reports/figures', 'reports/analysis',
    '_exploration/notebooks', '_exploration/data'
  ];

  for (const dir of nestedImportantDirs) {
    if (!fetchedDirectories.has(dir)) {
      try {
        const dirFiles = await fetchDirectoryFiles(repoInfo, dir);
        if (dirFiles.length > 0) {
          console.log(`✅ Found missing nested directory '${dir}' with ${dirFiles.length} files`);
          allFiles.push(...dirFiles);
          fetchedDirectories.add(dir);
        }
      } catch (error) {
        // Expected for non-existent directories
      }
    }
  }

  console.log(`📊 Fetched ${fetchedDirectories.size} missing directories, added ${allFiles.length - availableFiles.length} files`);

  return [...new Set(allFiles)]; // Remove duplicates
}

/**
 * Fetch files from a specific directory using GitHub API
 */
async function fetchDirectoryFiles(
  repoInfo: { owner: string; repo: string; commitHash: string },
  directoryPath: string
): Promise<string[]> {
  const response = await fetch(
    `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/git/trees/${repoInfo.commitHash}:${directoryPath}?recursive=1`,
    {
      method: 'GET',
      headers: {
        'User-Agent': 'ZoomJudge-Bot/1.0',
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Directory ${directoryPath} not found or inaccessible`);
  }

  const data = await response.json();

  if (!data.tree || !Array.isArray(data.tree)) {
    return [];
  }

  // Return file paths with directory prefix
  return data.tree
    .filter((item: any) => item.type === 'blob')
    .map((item: any) => `${directoryPath}/${item.path}`)
    .filter((path: string) => path && typeof path === 'string');
}

/**
 * Prioritize files when dealing with truncated GitHub API responses
 */
function prioritizeFilesForTruncatedRepo(files: string[]): string[] {
  const priorityPatterns = [
    // Essential configuration files (highest priority)
    { pattern: /^README\.(md|txt)$/i, weight: 100 },
    { pattern: /^requirements\.txt$/i, weight: 95 },
    { pattern: /^package\.json$/i, weight: 95 },
    { pattern: /(^|\/)Dockerfile$/i, weight: 90 },
    { pattern: /^docker-compose\.ya?ml$/i, weight: 90 },
    { pattern: /^Makefile$/i, weight: 85 },
    { pattern: /^setup\.py$/i, weight: 85 },
    { pattern: /^pyproject\.toml$/i, weight: 85 },
    
    // Infrastructure and deployment (high priority)
    { pattern: /\.tf$/i, weight: 80 },
    { pattern: /\.ya?ml$/i, weight: 75 },
    { pattern: /^\.github\/workflows\//i, weight: 80 },
    
    // Source code (medium-high priority)
    { pattern: /\.py$/i, weight: 70 },
    { pattern: /\.js$/i, weight: 65 },
    { pattern: /\.ts$/i, weight: 65 },
    { pattern: /\.ipynb$/i, weight: 60 },
    
    // Documentation (medium priority)
    { pattern: /\.md$/i, weight: 50 },
    { pattern: /docs?\//i, weight: 45 },
  ];

  // Score and sort files
  const scoredFiles = files.map(file => {
    let score = 0;
    for (const { pattern, weight } of priorityPatterns) {
      if (pattern.test(file)) {
        score = Math.max(score, weight);
      }
    }
    
    // Boost score for files in root directory
    if (!file.includes('/')) {
      score += 20;
    }
    
    // Reduce score for deeply nested files
    const depth = (file.match(/\//g) || []).length;
    score -= Math.min(depth * 5, 30);
    
    return { file, score };
  });

  // Sort by score and return top files
  return scoredFiles
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(10000, files.length)) // Reasonable limit
    .map(item => item.file);
}
