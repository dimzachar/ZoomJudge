import { getOpenRouterClient } from './openrouter';
import { validateRepository, GitHubRepoInfo } from './github-validator';
import { evaluationLogger } from './simple-logger';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import { WorkflowReplacement } from './ultimate-hybrid/integration/WorkflowReplacement';
import { ConfigurationService } from './config/ConfigurationService';
import { APIClientOptions } from './config/APIClientFactory';

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
    breakdown: Record<string, { score: number; feedback: string; maxScore: number; sourceFiles?: string[] }>;
    overallFeedback: string;
  };
  courseId?: string;
  rubricVersion?: number;
  promptHash?: string;
  error?: string;
}

export interface CourseCriteria {
  name: string;
  description: string;
  maxScore: number;
}

export class EvaluationService {
  private currentEvaluationId: string | null = null;
  private convexClient: ConvexHttpClient | null = null;
  private workflowReplacement: WorkflowReplacement;
  private useHybridWorkflow: boolean;
  private configService: ConfigurationService;

  constructor(options: APIClientOptions = {}) {
    // Initialize configuration service
    this.configService = ConfigurationService.getInstance(options);

    // Initialize the Ultimate Hybrid workflow replacement
    this.workflowReplacement = new WorkflowReplacement({
      mockMode: options.mockMode || this.configService.isMockMode() || !this.configService.hasAPIKey()
    });

    // Feature flag to enable/disable hybrid workflow
    this.useHybridWorkflow = process.env.ENABLE_HYBRID_WORKFLOW !== 'false';
  }

  /**
   * Set the current evaluation ID for logging purposes
   */
  setEvaluationId(evaluationId: string) {
    this.currentEvaluationId = evaluationId;
    evaluationLogger.setCurrentEvaluation(evaluationId);
  }

  /**
   * Get or create Convex client
   */
  private getConvexClient(): ConvexHttpClient {
    if (!this.convexClient) {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!convexUrl) {
        throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is required');
      }
      this.convexClient = new ConvexHttpClient(convexUrl);
    }
    return this.convexClient;
  }

  /**
   * Fetch course data from Convex
   */
  async fetchCourseData(courseType: string, convexContext?: any): Promise<{
    courseId: string;
    courseName: string;
    description: string;
    maxScore: number;
    rubricVersion?: number;
    promptTemplate?: string;
    criteria: Array<{
      name: string;
      description: string;
      maxScore: number;
    }>;
  } | null> {
    try {
      let course;
      
      if (convexContext) {
        // Use Convex context if available (server-side)
        course = await convexContext.runQuery(api.courses.getCourse, { courseId: courseType });
      } else {
        // Fallback to HTTP client (client-side)
        const convex = this.getConvexClient();
        course = await convex.query(api.courses.getCourse, { courseId: courseType });
      }
      
      if (!course) {
        console.error(`Course not found: ${courseType}`);
        return null;
      }

      return {
        courseId: course.courseId,
        courseName: course.courseName,
        description: course.description,
        maxScore: course.maxScore,
        rubricVersion: course.rubricVersion,
        promptTemplate: course.promptTemplate,
        criteria: course.criteria,
      };
    } catch (error) {
      console.error('Failed to fetch course data from Convex:', error);
      return null;
    }
  }

  /**
   * Process a repository evaluation request
   */
  async processEvaluation(request: EvaluationRequest, convexContext?: any): Promise<EvaluationResult> {
    try {
      console.log('=== EVALUATION SERVICE DEBUG START ===');
      console.log(`Starting evaluation for repository: ${request.repoUrl}`);
      console.log(`Course type: ${request.courseType}`);
      console.log(`User ID: ${request.userId}`);
      console.log(`Request payload:`, JSON.stringify(request, null, 2));

      // Log the start of evaluation processing
      await evaluationLogger.logGeneral(
        'EVALUATION_START',
        'INFO',
        'Starting repository evaluation',
        {
          repoUrl: request.repoUrl,
          courseType: request.courseType,
          userId: request.userId,
          evaluationId: this.currentEvaluationId
        }
      );

      // Step 1: Fetch course data from Convex
      console.log('=== STEP 1: FETCHING COURSE DATA ===');
      const courseData = await this.fetchCourseData(request.courseType, convexContext);
      
      if (!courseData) {
        console.error(`Course data not found for: ${request.courseType}`);
        return {
          success: false,
          error: `Course configuration not found for: ${request.courseType}`
        };
      }

      console.log(`Course data fetched successfully:`);
      console.log(`- Course: ${courseData.courseName} (${courseData.courseId})`);
      console.log(`- Max Score: ${courseData.maxScore}`);
      console.log(`- Rubric Version: ${courseData.rubricVersion || 1}`);
      console.log(`- Criteria Count: ${courseData.criteria.length}`);

      // Step 2: Validate repository
      console.log('=== STEP 2: REPOSITORY VALIDATION ===');
      const validation = await validateRepository(request.repoUrl);
      console.log('Validation result:', JSON.stringify(validation, null, 2));

      await evaluationLogger.logGeneral(
        'REPOSITORY_VALIDATION',
        validation.isValid ? 'INFO' : 'ERROR',
        validation.isValid ? 'Repository validation successful' : 'Repository validation failed',
        {
          repoUrl: request.repoUrl,
          isValid: validation.isValid,
          error: validation.error,
          repoInfo: validation.repoInfo
        }
      );

      if (!validation.isValid || !validation.repoInfo) {
        console.error('Repository validation failed:', validation.error);
        return {
          success: false,
          error: validation.error || 'Repository validation failed'
        };
      }

      console.log(`Repository validated successfully:`);
      console.log(`- Owner: ${validation.repoInfo.owner}`);
      console.log(`- Repo: ${validation.repoInfo.repo}`);
      console.log(`- URL: ${validation.repoInfo.url}`);

      // Step 3: Prepare repository content for evaluation
      console.log('=== STEP 3: REPOSITORY CONTENT PREPARATION ===');

      let repoContent: string;
      let workflowMetadata: any = {};

      if (this.useHybridWorkflow) {
        console.log('🚀 Using Ultimate Hybrid Workflow');

        // Use the new Ultimate Hybrid workflow
        const workflowResult = await this.workflowReplacement.processRepository({
          repoInfo: validation.repoInfo,
          courseId: courseData.courseId,
          courseName: courseData.courseName,
          userId: request.userId,
          evaluationId: this.currentEvaluationId || undefined
        });

        // Convert content to string format for LLM
        repoContent = this.formatContentForLLM(workflowResult.selectedFiles, workflowResult.content);
        workflowMetadata = workflowResult.metadata;

        console.log(`Ultimate Hybrid workflow completed:`);
        console.log(`- Selected files: ${workflowResult.selectedFiles.length}`);
        console.log(`- Method: ${workflowResult.metadata.method} (Tier ${workflowResult.metadata.tierUsed})`);
        console.log(`- Confidence: ${(workflowResult.metadata.confidence * 100).toFixed(1)}%`);
        console.log(`- Cache hit: ${workflowResult.metadata.cacheHit}`);
        console.log(`- Processing time: ${workflowResult.metadata.processingTime}ms`);

      } else {
        console.log('📁 Using legacy workflow');

        // Use the original workflow
        const legacyContent = await this.prepareRepoContent(validation.repoInfo, validation.structure);

        if (!legacyContent) {
          console.error('Failed to prepare repository content');
          return {
            success: false,
            error: 'Failed to fetch repository content'
          };
        }

        repoContent = legacyContent;
      }

      console.log(`Repository content prepared successfully:`);
      console.log(`- Content length: ${repoContent.length} characters`);
      // Note: Content preview not logged for security (contains repository code)

      // Step 4: Perform AI evaluation
      console.log('=== STEP 4: AI EVALUATION ===');
      console.log(`Evaluating repository content with course criteria`);
      const openRouterClient = getOpenRouterClient();

      console.log('Calling OpenRouter client with parameters:');
      console.log(`- repoUrl: ${request.repoUrl}`);
      console.log(`- courseData: ${courseData.courseName} (${courseData.courseId})`);
      console.log(`- repoContent length: ${repoContent.length}`);

      const evaluationResults = await openRouterClient.evaluateRepository(
        request.repoUrl,
        courseData,
        repoContent
      );

      console.log('=== EVALUATION RESULTS ===');
      // Note: Raw results not logged for security (contains detailed feedback)
      console.log('Evaluation completed successfully - Total Score:', evaluationResults.totalScore, '/', evaluationResults.maxScore);
      console.log('=== EVALUATION SERVICE DEBUG END ===');

      return {
        success: true,
        results: {
          totalScore: evaluationResults.totalScore,
          maxScore: evaluationResults.maxScore,
          breakdown: evaluationResults.breakdown,
          overallFeedback: evaluationResults.overallFeedback,
        },
        courseId: courseData.courseId,
        rubricVersion: evaluationResults.rubricVersion,
        promptHash: evaluationResults.promptHash,
      };

    } catch (error) {
      console.error('=== EVALUATION SERVICE ERROR ===');
      console.error('Evaluation processing failed:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      console.error('=== EVALUATION SERVICE ERROR END ===');

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
      content += `URL: ${repoInfo.url}\n`;
      content += `Commit Hash: ${repoInfo.commitHash}\n\n`;

      // Add file structure overview
      content += "=== REPOSITORY STRUCTURE ===\n";
      const relevantFiles = structure.files
        .filter(file => this.isRelevantFile(file))
        .slice(0, 100); // Increased from 50 to 100 files

      content += relevantFiles.join('\n') + '\n\n';

      // Add key file contents with smarter truncation
      content += "=== KEY FILE CONTENTS ===\n\n";

      const includedFiles: string[] = [];
      // Get prioritized files based on content analysis
      const prioritizedFiles = this.prioritizeFiles(Object.keys(structure.content), structure.content);

      // Force-include critical backend + notebooks first
      const forceIncludePatterns = [
        /(^|\/)backend\/app\/(rag\.py|ingest\.py|prep\.py|app\.py|db\.py)$/i,
        /(^|\/)notebooks\/.*\.(ipynb)$/i,
      ];
      const forceIncluded = prioritizedFiles.filter((f) => forceIncludePatterns.some((p) => p.test(f)));
      const remaining = prioritizedFiles.filter((f) => !forceIncluded.includes(f));
      const cappedList = [...forceIncluded, ...remaining].slice(0, 40); // cap inclusion to keep prompt size sane
      
      // Guardrail: exclude images/videos, office/binaries/archives, CSVs, and generic JSON
      const excludedExtensions = /\.(png|jpe?g|gif|svg|webp|bmp|tiff|ico|psd|pdf|zip|gz|tar|7z|xz|rar|mp3|wav|flac|mp4|mov|avi|mkv|pptx?|docx?|xlsx?|csv)$/i;
      const allowedJsonFiles = new Set(['package.json', 'tsconfig.json', '.eslintrc.json', 'components.json', 'dashboard.json']);
      for (const filePath of cappedList) {
        const base = (filePath.split('/').pop() || '').toLowerCase();
        if (excludedExtensions.test(filePath)) {
          continue;
        }
        if (base.endsWith('.json') && !allowedJsonFiles.has(base)) {
          continue;
        }
        if (structure.content[filePath] && this.isKeyFile(filePath)) {
          content += `--- ${filePath} ---\n`;
          // Use smart truncation based on file type and importance
          const maxLength = this.getOptimalContentLength(filePath, structure.content[filePath]);
          content += this.smartTruncateContent(structure.content[filePath], filePath, maxLength) + '\n\n';
          includedFiles.push(filePath);
        }
      }

      // Add metadata about included files
      content += "=== EVALUATION METADATA ===\n";
      content += `Files analyzed: ${includedFiles.length}\n`;
      content += `Included files: ${includedFiles.join(', ')}\n\n`;

      // Add additional context based on file types found
      content += this.generateContextualInfo(structure.files);

      return content;
    } catch (error) {
      console.error('Failed to prepare repository content:', error);
      return null;
    }
  }

  /**
   * Debug helper: build lists of files at each stage for a given structure
   */
  public buildDebugFileLists(
    structure: { files: string[]; content: Record<string, string> }
  ): {
    discoveredFiles: string[];
    firstFilterMatches: string[];
    fetchedFiles: string[];
    includedInLLM: string[];
  } {
    const discoveredFiles = [...structure.files];

    // Recompute first filter using isRelevantFile as a proxy for discovery overview
    const firstFilterMatches = structure.files.filter((f) => this.isRelevantFile(f));

    // Files that have content fetched
    const fetchedFiles = Object.keys(structure.content);

    // Files that would be included to the LLM (apply same guardrail + key check)
    const excludedExtensions = /\.(png|jpe?g|gif|svg|webp|bmp|tiff|ico|psd|pdf|zip|gz|tar|7z|xz|rar|mp3|wav|flac|mp4|mov|avi|mkv|pptx?|docx?|xlsx?|csv)$/i;
    const includedInLLM = fetchedFiles.filter((filePath) => !excludedExtensions.test(filePath) && this.isKeyFile(filePath));

    return { discoveredFiles, firstFilterMatches, fetchedFiles, includedInLLM };
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
      /(^|\/)logs(\/?|$)/i,
      /(^|\/)carpark_postgres_data(\/?|$)/i,
    ];

    return !irrelevantPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Check if a file is a key file that should have its content included
   * Uses adaptive selection based on course type and file characteristics
   */
  private isKeyFile(filePath: string, courseId?: string): boolean {
    // Core files that are always important
    const corePatterns = [
      /(^|\/)README\.(md|txt)$/i,
      /(^|\/)requirements\.txt$/i,
      /(^|\/)Pipfile$/i,
      /(^|\/)package\.json$/i,
      /(^|\/)Dockerfile$/i,
      /(^|\/)docker-compose\.ya?ml$/i,
      /(^|\/)\.env\.example$/i,
      /(^|\/)setup\.py$/i,
      /(^|\/)pyproject\.toml$/i,
      /(^|\/)Makefile$/i,
      /(^|\/)\.github\/workflows\/.+\.ya?ml$/i,
    ];

    // Documentation and analysis files (course-agnostic)
    const analysisPatterns = [
      /\.md$/i,                    // All markdown files (documentation)
      /\.ipynb$/i,                 // Jupyter notebooks
      /evaluation/i,               // Files with "evaluation" in path
      /analysis/i,                 // Analysis files
      /experiment/i,               // Experiment files
      /benchmark/i,                // Benchmark files
      /metrics/i,                  // Metrics files
      /results/i,                  // Results files
      /ground.?truth/i,            // Ground truth files
      /compare/i,                  // Comparison files
      /test/i,                     // Test files
    ];

    // Main application entry points
    const entryPointPatterns = [
      /^(src\/)?main\./i,          // Main files
      /^(src\/)?app\./i,           // App files
      /^(src\/)?index\./i,         // Index files
      /^train\./i,                 // Training scripts
      /^predict\./i,               // Prediction scripts
      /^run\./i,                   // Run scripts
    ];

    // Backend Python core files (always include if present)
    const backendPythonCorePatterns = [
      /(^|\/)backend\/app\/(rag\.py|ingest\.py|prep\.py|app\.py|db\.py)$/i,
    ];

    // MLOps Pipeline Core Files (HIGH PRIORITY for reproducibility)
    const mlOpsPipelinePatterns = [
      // Core ML pipeline files
      /(^|\/)src\/pipeline\/.+\.py$/i,           // Pipeline modules (data_ingestion, model_training, etc.)
      /(^|\/)pipeline\/.+\.py$/i,                // Alternative pipeline directory
      /(^|\/)ml_pipeline\/.+\.py$/i,             // ML pipeline directory
      /(^|\/)mlops\/.+\.py$/i,                   // MLOps directory

      // Model and inference files
      /(^|\/)model\.py$/i,                       // Model definition/loading
      /(^|\/)lambda_function\.py$/i,             // Serverless deployment
      /(^|\/)inference\.py$/i,                   // Inference logic
      /(^|\/)serve\.py$/i,                       // Model serving
      /(^|\/)api\.py$/i,                         // API endpoints

      // Data handling and preprocessing
      /(^|\/)data_ingestion\.py$/i,              // Data ingestion logic
      /(^|\/)data_preprocessing\.py$/i,          // Data preprocessing
      /(^|\/)data_validation\.py$/i,             // Data validation
      /(^|\/)feature_engineering\.py$/i,         // Feature engineering

      // Training and model management
      /(^|\/)model_training\.py$/i,              // Model training
      /(^|\/)model_registry\.py$/i,              // Model registry/versioning
      /(^|\/)train\.py$/i,                       // Training scripts
      /(^|\/)orchestrate\.py$/i,                 // Workflow orchestration

      // Monitoring and evaluation
      /(^|\/)monitoring\.py$/i,                  // Model monitoring
      /(^|\/)drift_detection\.py$/i,             // Data/model drift
      /(^|\/)evaluation\.py$/i,                  // Model evaluation

      // Deployment and infrastructure
      /(^|\/)deploy\.py$/i,                      // Deployment scripts
      /(^|\/)infrastructure\/.+\.tf$/i,          // Terraform infrastructure
      /(^|\/)terraform\/.+\.tf$/i,               // Terraform files
    ];

    // Data Engineering Zoomcamp specific important files
    const deZoomcampPatterns = [
      /(^|\/)orchestration\/dags\/.+\.py$/i,
      /(^|\/)processing\/dataflow\/.+\.(py|sql|ya?ml)$/i,
      /(^|\/)processing\/src\/.+\.(py|sql)$/i,
      /(^|\/)dbt\/.+\.(sql|ya?ml)$/i,
      /(^|\/)terraform\/.+\.tf$/i,
      /(^|\/)scripts\/.+\.(sh|py)$/i,
      /(^|\/)requirements\.txt$/i,
    ];

    // Configuration and monitoring (course-agnostic)
    const infraPatterns = [
      /config/i,                   // Configuration files
      /monitor/i,                  // Monitoring files
      /grafana/i,                  // Grafana configs
      /dashboard/i,                // Dashboard configs
      /deploy/i,                   // Deployment files
    ];

    const allPatterns = [
      ...corePatterns,
      ...analysisPatterns,
      ...entryPointPatterns,
      ...mlOpsPipelinePatterns,    // Added MLOps patterns with high priority
      ...infraPatterns,
      ...backendPythonCorePatterns,
      ...deZoomcampPatterns,
    ];

    return allPatterns.some(pattern => pattern.test(filePath));
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
   * Smart truncation that preserves important parts of files based on file type
   */
  private smartTruncateContent(content: string, filePath: string, maxLength: number): string {
    const fileName = filePath.toLowerCase();

    // Handle README files specially - they have their own logic for when to truncate
    if (fileName.includes('readme')) {
      return this.smartTruncateReadme(content, maxLength);
    }

    // For non-README files, use the standard size check
    if (content.length <= maxLength) {
      return content;
    }

    // Handle Jupyter notebooks specially
    if (fileName.endsWith('.ipynb')) {
      return this.summarizeJupyterNotebook(content, filePath, maxLength);
    }

    // Handle CSV/data files specially
    if (fileName.endsWith('.csv') || fileName.endsWith('.json') || fileName.endsWith('.txt')) {
      return this.summarizeDataFile(content, filePath, maxLength);
    }

    // For code files, prioritize key sections
    if (this.isCodeFile(fileName)) {
      return this.smartTruncateCode(content, filePath, maxLength);
    }

    // For markdown documentation
    if (fileName.endsWith('.md')) {
      return this.smartTruncateMarkdown(content, filePath, maxLength);
    }

    // For other files, use standard truncation with better indication
    return content.substring(0, maxLength) + `\n... [${filePath} truncated - ${content.length - maxLength} characters omitted] ...`;
  }

  private summarizeJupyterNotebook(content: string, filePath: string, maxLength: number): string {
    try {
      const notebook = JSON.parse(content);
      let summary = `=== JUPYTER NOTEBOOK SUMMARY: ${filePath} ===\n`;
      
      if (notebook.cells) {
        const cellTypes = notebook.cells.reduce((acc: any, cell: any) => {
          acc[cell.cell_type] = (acc[cell.cell_type] || 0) + 1;
          return acc;
        }, {});
        
        summary += `Cells: ${notebook.cells.length} total (${Object.entries(cellTypes).map(([type, count]) => `${count} ${type}`).join(', ')})\n\n`;
        
        // Include key markdown cells (likely explanations/analysis)
        const markdownCells = notebook.cells.filter((cell: any) => cell.cell_type === 'markdown');
        let contentLength = summary.length;
        
        for (const cell of markdownCells.slice(0, 5)) { // Max 5 markdown cells
          const cellContent = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
          if (contentLength + cellContent.length < maxLength * 0.8) {
            summary += `--- Markdown Cell ---\n${cellContent}\n\n`;
            contentLength += cellContent.length;
          }
        }
        
        // Include some code cells if space allows
        const codeCells = notebook.cells.filter((cell: any) => cell.cell_type === 'code');
        for (const cell of codeCells.slice(0, 3)) { // Max 3 code cells
          const cellContent = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
          if (contentLength + cellContent.length < maxLength) {
            summary += `--- Code Cell ---\n${cellContent.substring(0, 500)}\n\n`;
            contentLength += Math.min(cellContent.length, 500);
          }
        }
      }
      
      return summary + `... [Notebook analysis complete - ${content.length - summary.length} characters omitted] ...`;
    } catch {
      return `[JUPYTER NOTEBOOK: ${filePath} - ${Math.round(content.length/1024)}KB - Parse error, treating as text]\n` + 
             content.substring(0, maxLength * 0.8) + '\n... [Content truncated] ...';
    }
  }

  private summarizeDataFile(content: string, filePath: string, maxLength: number): string {
    const lines = content.split('\n');
    const fileSize = Math.round(content.length / 1024);
    
    let summary = `=== DATA FILE SUMMARY: ${filePath} (${fileSize}KB) ===\n`;
    summary += `Lines: ${lines.length}\n\n`;
    
    // Show first few lines (headers)
    const previewLines = Math.min(10, lines.length);
    summary += `--- First ${previewLines} lines ---\n`;
    summary += lines.slice(0, previewLines).join('\n');
    
    if (lines.length > previewLines) {
      summary += `\n\n--- Last 3 lines ---\n`;
      summary += lines.slice(-3).join('\n');
    }
    
    return summary + `\n... [Data file contains ${lines.length - previewLines - 3} additional lines] ...`;
  }

  private smartTruncateReadme(content: string, maxLength: number): string {
    // Analyze content to determine if truncation is needed
    const truncationReason = this.analyzeReadmeTruncationReason(content);

    // If content has non-text content, always truncate to remove it
    if (truncationReason.hasNonTextContent) {
      return this.truncateReadmeWithNonTextContent(content, maxLength, truncationReason);
    }

    // If content is pure text and within limits, don't truncate
    if (content.length <= maxLength) {
      return content;
    }

    // For large pure text READMEs, use intelligent section-based truncation
    return this.truncateLargeTextReadme(content, maxLength, truncationReason);
  }

  /**
   * Analyze why README needs truncation
   */
  private analyzeReadmeTruncationReason(content: string): {
    hasNonTextContent: boolean;
    hasBase64Images: boolean;
    hasExcessiveWhitespace: boolean;
    hasBinaryContent: boolean;
    reason: string;
  } {
    const base64ImagePattern = /data:image\/[^;]+;base64,([A-Za-z0-9+/=]{100,})/g;
    const largeBase64Pattern = /[A-Za-z0-9+/=]{500,}/g;
    const binaryPattern = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/g;

    const hasBase64Images = base64ImagePattern.test(content);
    const hasLargeBase64 = largeBase64Pattern.test(content);
    const hasBinaryContent = binaryPattern.test(content);

    const whitespaceRatio = (content.match(/\s/g) || []).length / content.length;
    const hasExcessiveWhitespace = whitespaceRatio > 0.3;

    const hasNonTextContent = hasBase64Images || hasLargeBase64 || hasBinaryContent || hasExcessiveWhitespace;

    let reason = '';
    if (hasBase64Images) reason = 'embedded base64 images';
    else if (hasLargeBase64) reason = 'large embedded binary data';
    else if (hasBinaryContent) reason = 'binary content';
    else if (hasExcessiveWhitespace) reason = 'excessive whitespace/formatting';
    else reason = 'large file size';

    return {
      hasNonTextContent,
      hasBase64Images,
      hasExcessiveWhitespace,
      hasBinaryContent,
      reason
    };
  }

  /**
   * Truncate README with non-text content by preserving text sections
   */
  private truncateReadmeWithNonTextContent(content: string, maxLength: number, reason: any): string {
    const lines = content.split('\n');
    let result = '';
    let currentLength = 0;
    let skippedSections = 0;

    for (const line of lines) {
      // Skip lines that appear to be base64 or binary content
      if (this.isNonTextLine(line)) {
        skippedSections++;
        continue;
      }

      if (currentLength + line.length + 1 > maxLength) break;

      result += line + '\n';
      currentLength += line.length + 1;
    }

    const skippedNote = skippedSections > 0 ? ` (${skippedSections} non-text sections removed)` : '';
    return result + `\n... [README truncated due to ${reason.reason}${skippedNote}] ...`;
  }

  /**
   * Truncate large text README intelligently by preserving key sections
   */
  private truncateLargeTextReadme(content: string, maxLength: number, reason: any): string {
    const lines = content.split('\n');
    let result = '';
    let currentLength = 0;

    // Preserve the beginning (60% of limit)
    const beginningLimit = Math.floor(maxLength * 0.6);
    const beginningContent = content.substring(0, beginningLimit);
    result += beginningContent;
    currentLength += beginningContent.length;

    // Look for important sections in the remaining content
    const remainingContent = content.substring(beginningLimit);
    const importantKeywords = [
      'evaluation', 'criteria', 'scoring', 'assessment', 'rubric', 'grading', 'results', 'metrics',
      'installation', 'setup', 'getting started', 'requirements', 'dependencies',
      'architecture', 'design', 'overview', 'features', 'usage', 'examples',
      'api', 'configuration', 'deployment', 'testing', 'contributing'
    ];

    const remainingLines = remainingContent.split('\n');
    let preservedSections = 0;

    for (const line of remainingLines) {
      if (currentLength + line.length + 1 > maxLength) break;

      const lowerLine = line.toLowerCase();
      const isImportant = importantKeywords.some(keyword => lowerLine.includes(keyword)) ||
                         line.startsWith('#') || // Headers
                         line.startsWith('##') ||
                         line.startsWith('###');

      if (isImportant) {
        result += '\n' + line;
        currentLength += line.length + 1;
        preservedSections++;
      }
    }

    const omittedChars = content.length - currentLength;
    const sectionNote = preservedSections > 0 ? ` (${preservedSections} key sections preserved)` : '';
    return result + `\n... [README truncated - ${omittedChars} characters omitted${sectionNote}] ...`;
  }

  /**
   * Check if a line contains non-text content
   */
  private isNonTextLine(line: string): boolean {
    // Check for base64 patterns
    if (/^[A-Za-z0-9+/=]{50,}$/.test(line.trim())) return true;

    // Check for data URLs
    if (/data:image\/[^;]+;base64,/.test(line)) return true;

    // Check for binary-like content
    if (/[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(line)) return true;

    return false;
  }

  private smartTruncateCode(content: string, filePath: string, maxLength: number): string {
    const lines = content.split('\n');
    
    // For code files, prioritize imports, main functions, and comments
    let result = '';
    let currentLength = 0;
    
    // Include imports/requires at the top
    const importLines = lines.filter(line => 
      /^(import|from|require|#include|using)/.test(line.trim())
    ).slice(0, 20);
    
    for (const line of importLines) {
      if (currentLength + line.length > maxLength * 0.3) break;
      result += line + '\n';
      currentLength += line.length + 1;
    }
    
    // Include main content up to limit
    const remainingLength = maxLength - currentLength;
    result += content.substring(result.length, result.length + remainingLength);
    
    return result + `\n... [Code file truncated - ${content.length - result.length} characters omitted] ...`;
  }

  private smartTruncateMarkdown(content: string, filePath: string, maxLength: number): string {
    // For markdown, prioritize headers and key sections
    const lines = content.split('\n');
    let result = '';
    let currentLength = 0;
    
    for (const line of lines) {
      if (currentLength + line.length > maxLength) break;
      
      // Always include headers and important keywords
      if (line.startsWith('#') || 
          /evaluation|criteria|scoring|results|analysis|conclusion/i.test(line)) {
        result += line + '\n';
        currentLength += line.length + 1;
      } else if (currentLength < maxLength * 0.8) {
        result += line + '\n'; 
        currentLength += line.length + 1;
      }
    }
    
    return result + `\n... [Markdown truncated - focused on headers and key content] ...`;
  }

  private isCodeFile(fileName: string): boolean {
    const codeExtensions = ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb', '.scala', '.kt'];
    return codeExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Prioritize files based on their importance for evaluation
   */
  private prioritizeFiles(filePaths: string[], fileContents: Record<string, string>): string[] {
    const fileScores = filePaths.map(filePath => ({
      path: filePath,
      score: this.calculateFileImportance(filePath, fileContents[filePath] || '')
    }));

    // Sort by score (descending) and return file paths
    return fileScores
      .sort((a, b) => b.score - a.score)
      .map(item => item.path);
  }

  /**
   * Calculate importance score for a file based on multiple factors
   */
  private calculateFileImportance(filePath: string, content: string): number {
    let score = 0;
    const fileName = filePath.toLowerCase();

    // Base scores for file types (highest priority)
    if (fileName.includes('readme')) score += 100;
    if (fileName.includes('evaluation') || fileName.includes('eval')) score += 95;
    if (fileName.includes('analysis') || fileName.includes('experiment')) score += 90;
    if (fileName.endsWith('.ipynb')) score += 85;
    if (fileName.endsWith('.md')) score += 80;

    // MLOps Pipeline Files (HIGH PRIORITY for reproducibility assessment)
    if (fileName.includes('src/pipeline/') || fileName.includes('pipeline/')) score += 95;
    if (fileName.includes('data_ingestion') || fileName.includes('data_preprocessing')) score += 90;
    if (fileName.includes('model_training') || fileName.includes('model_registry')) score += 90;
    if (fileName.includes('orchestrate') || fileName.includes('orchestration')) score += 85;
    if (fileName.endsWith('model.py') || fileName.endsWith('lambda_function.py')) score += 85;
    if (fileName.includes('monitoring') || fileName.includes('drift')) score += 80;
    if (fileName.includes('inference') || fileName.includes('serve')) score += 75;

    // Infrastructure and deployment files
    if (fileName.includes('infrastructure/') || fileName.includes('terraform/')) score += 75;
    if (fileName.includes('requirements') || fileName.includes('package.json')) score += 70;
    if (fileName.includes('docker')) score += 60;
    if (this.isCodeFile(fileName)) score += 50;

    // Content-based scoring (if content is available)
    if (content) {
      const lowerContent = content.toLowerCase();

      // Evaluation-related keywords
      const evaluationKeywords = [
        'evaluation', 'metrics', 'baseline', 'comparison', 'benchmark',
        'ground truth', 'results', 'analysis', 'experiment', 'scoring'
      ];

      evaluationKeywords.forEach(keyword => {
        const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
        score += matches * 5;
      });

      // MLOps and data-related keywords (higher weight for reproducibility)
      const mlopsKeywords = [
        'data source', 'dataset', 'data access', 'data pipeline', 'data ingestion',
        'model training', 'model deployment', 'model registry', 'mlflow', 'wandb',
        'reproducibility', 'environment', 'dependencies', 'version'
      ];

      mlopsKeywords.forEach(keyword => {
        const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
        score += matches * 4; // Higher weight than general tech keywords
      });

      // Technology-specific keywords that might be relevant
      const techKeywords = [
        'model', 'training', 'prediction', 'deployment', 'pipeline',
        'monitoring', 'grafana', 'docker', 'kubernetes', 'airflow',
        'jupyter', 'notebook'
      ];

      techKeywords.forEach(keyword => {
        const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
        score += matches * 2;
      });

      // File size consideration (prefer reasonably sized files)
      if (content.length > 100 && content.length < 50000) {
        score += 10; // Sweet spot for meaningful content
      }

      if (content.length > 100000) {
        score -= 20; // Penalize very large files
      }
    }

    return score;
  }

  /**
   * Determine optimal length for README files based on content analysis
   */
  private getReadmeOptimalLength(content: string): number {
    const MAX_README_LENGTH = 50000; // 50KB limit for README files
    const ABSOLUTE_MAX_README_LENGTH = 100000; // 100KB absolute maximum

    // If content appears to be pure text, be more lenient but still have limits
    if (this.isPureTextReadme(content)) {
      // For pure text under 50KB, don't truncate
      if (content.length <= MAX_README_LENGTH) {
        return content.length + 1000; // Add buffer to avoid truncation
      }
      // For pure text over 50KB, allow up to 100KB maximum
      return ABSOLUTE_MAX_README_LENGTH;
    }

    // If content contains non-text elements, use more conservative limit
    return MAX_README_LENGTH;
  }

  /**
   * Check if README content is pure text without embedded binary data
   */
  private isPureTextReadme(content: string): boolean {
    // Check for base64 encoded images (common in GitHub READMEs)
    const base64ImagePattern = /data:image\/[^;]+;base64,([A-Za-z0-9+/=]{100,})/g;
    if (base64ImagePattern.test(content)) {
      return false;
    }

    // Check for large blocks of base64 data (>500 chars of continuous base64)
    const largeBase64Pattern = /[A-Za-z0-9+/=]{500,}/g;
    if (largeBase64Pattern.test(content)) {
      return false;
    }

    // Check for excessive whitespace (more than 30% of content)
    const whitespaceRatio = (content.match(/\s/g) || []).length / content.length;
    if (whitespaceRatio > 0.3) {
      return false;
    }

    // Check for binary-like content patterns
    const binaryPattern = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/g;
    if (binaryPattern.test(content)) {
      return false;
    }

    return true;
  }

  /**
   * Get optimal content length for different file types
   */
  private getOptimalContentLength(filePath: string, content: string): number {
    const fileName = filePath.toLowerCase();

    // README files - give much more space as they're crucial for evaluation
    // Only truncate if they contain non-text content or exceed 50KB
    if (fileName.includes('readme')) {
      return this.getReadmeOptimalLength(content);
    }
    
    // Jupyter notebooks - need more space for analysis
    if (fileName.endsWith('.ipynb')) return 10000;
    
    // Evaluation/analysis files - important, give good space
    if (fileName.includes('evaluation') || fileName.includes('analysis')) return 7000;
    
    // Documentation files
    if (fileName.endsWith('.md')) return 6000;
    
    // Configuration files - usually concise
    if (fileName.includes('docker') || fileName.includes('requirements')) return 3000;
    
    // Code files - moderate space
    if (this.isCodeFile(fileName)) return 5000;
    
    // Default
    return 5000;
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
   * Format content from hybrid workflow for LLM evaluation
   */
  private formatContentForLLM(selectedFiles: string[], content: Record<string, string>): string {
    let formattedContent = '';

    // Add header with file selection metadata
    formattedContent += `=== REPOSITORY ANALYSIS ===\n`;
    formattedContent += `Selected Files: ${selectedFiles.length}\n`;
    formattedContent += `Files with Content: ${Object.keys(content).length}\n\n`;

    // Add each file's content with smart truncation to prevent excessive prompt size
    let totalContentLength = formattedContent.length;
    const maxTotalLength = 200000; // Limit total content to ~200KB to prevent cost issues

    for (const filePath of selectedFiles) {
      // Check if we've exceeded the total length limit
      if (totalContentLength > maxTotalLength) {
        formattedContent += `=== FILE: ${filePath} ===\n`;
        formattedContent += '[Content omitted due to size limits]\n\n';
        continue;
      }

      formattedContent += `=== FILE: ${filePath} ===\n`;

      if (content[filePath]) {
        // Apply smart truncation based on file type
        const maxLength = this.getOptimalContentLength(filePath, content[filePath]);
        const truncatedContent = this.smartTruncateContent(content[filePath], filePath, maxLength);
        
        formattedContent += truncatedContent;
        totalContentLength += truncatedContent.length;
      } else {
        formattedContent += '[Content not available]';
      }

      formattedContent += '\n\n';
    }

    return formattedContent;
  }

  /**
   * Get hybrid workflow performance statistics
   */
  async getHybridWorkflowStats() {
    if (this.useHybridWorkflow) {
      return {
        performanceStats: await this.workflowReplacement.getPerformanceStats(),
        cacheWarmingStats: this.workflowReplacement.getCacheWarmingStats()
      };
    }
    return null;
  }

  /**
   * Test the evaluation service
   */
  async testService(): Promise<boolean> {
    try {
      // Test OpenRouter connection by creating a client
      const openRouterClient = getOpenRouterClient();
      return true; // If we can create the client, assume it's working
    } catch (error) {
      console.error('Evaluation service test failed:', error);
      return false;
    }
  }
}

// Lazy-loaded singleton instance to avoid module load time instantiation
let evaluationServiceInstance: EvaluationService | null = null;

export function getEvaluationService(options?: APIClientOptions): EvaluationService {
  if (!evaluationServiceInstance) {
    evaluationServiceInstance = new EvaluationService(options);
  }
  return evaluationServiceInstance;
}

// For backward compatibility
export const evaluationService = {
  get instance() {
    return getEvaluationService();
  }
};
