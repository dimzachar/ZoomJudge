/**
 * AI-Guided File Selection using a fast/cheap model
 * Separate from the main evaluation model for cost efficiency
 */

import OpenAI from 'openai';
import { CourseCriterion } from './CriterionMapper';
import { evaluationLogger } from '../../simple-logger';

export interface AIFileSelectionConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  maxFiles: number;
}

export interface AIFileSelectionResult {
  selectedFiles: string[];
  reasoning: string;
  confidence: number;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  processingTime: number;
  method: 'ai_guided';
}

export interface FileSelectionPromptData {
  repoUrl: string;
  courseId: string;
  courseName: string;
  criteria: CourseCriterion[];
  files: string[];
  maxFiles: number;
}

export class AIGuidedSelector {
  private client: OpenAI | null = null;
  private config: AIFileSelectionConfig;
  private currentEvaluationId: string | null = null;
  private mockMode: boolean = false;

  constructor(config?: Partial<AIFileSelectionConfig> & { mockMode?: boolean }) {
    this.mockMode = config?.mockMode || false;

    if (!this.mockMode && !process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    // Default configuration for fast/cheap file selection model
    this.config = {
      model: 'qwen/qwen-2.5-coder-32b-instruct', // Fast, cheap model for file selection
      maxTokens: 2000, // Much lower than evaluation model (16K)
      temperature: 0.1, // Low temperature for consistent selection
      maxFiles: 25, // Maximum files to select
      ...config
    };

    if (!this.mockMode) {
      this.client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'ZoomJudge File Selector',
        },
      });
    }
  }

  /**
   * Set the current evaluation ID for logging purposes
   */
  setEvaluationId(evaluationId: string) {
    this.currentEvaluationId = evaluationId;
  }

  /**
   * Update the AI model configuration
   */
  updateConfig(config: Partial<AIFileSelectionConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AIFileSelectionConfig {
    return { ...this.config };
  }

  /**
   * Select files using AI guidance based on course criteria
   */
  async selectFiles(promptData: FileSelectionPromptData): Promise<AIFileSelectionResult> {
    const startTime = Date.now();

    try {
      console.log('=== AI-GUIDED FILE SELECTION START ===');
      console.log(`Repository: ${promptData.repoUrl}`);
      console.log(`Course: ${promptData.courseName} (${promptData.courseId})`);
      console.log(`Available files: ${promptData.files.length}`);
      console.log(`Model: ${this.config.model}`);
      console.log(`Max files to select: ${promptData.maxFiles}`);

      // Log the start of AI file selection
      await evaluationLogger.logGeneral(
        'AI_FILE_SELECTION_START',
        'INFO',
        'Starting AI-guided file selection',
        {
          repoUrl: promptData.repoUrl,
          courseId: promptData.courseId,
          model: this.config.model,
          availableFiles: promptData.files.length,
          maxFiles: promptData.maxFiles,
          evaluationId: this.currentEvaluationId
        }
      );

      // Step 1: Construct file selection prompt
      const prompt = this.constructFileSelectionPrompt(promptData);
      console.log(`File selection prompt constructed. Length: ${prompt.length} characters`);

      // Step 2: Make API call to file selection model
      const requestPayload = {
        model: this.config.model,
        messages: [
          {
            role: 'system' as const,
            content: 'You are an expert file selection assistant for code evaluation. Your job is to select the most relevant files for evaluating a repository against specific course criteria. Focus on files that provide the best evidence for assessment.'
          },
          {
            role: 'user' as const,
            content: prompt
          }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      };

      // Handle mock mode for testing
      if (this.mockMode) {
        console.log('🧪 Mock mode: Simulating AI file selection...');
        return this.generateMockAIResponse(promptData);
      }

      if (!this.client) {
        throw new Error('OpenAI client not initialized');
      }

      console.log('Making API call to file selection model...');

      // Log the request
      await evaluationLogger.logGeneral(
        'AI_FILE_SELECTION_REQUEST',
        'DEBUG',
        'Sending file selection request to AI model',
        {
          model: this.config.model,
          promptLength: prompt.length,
          maxTokens: this.config.maxTokens
        }
      );

      const completion = await this.client.chat.completions.create(requestPayload);

      const response = completion.choices[0]?.message?.content;
      const finishReason = completion.choices[0]?.finish_reason;

      // Log the complete AI interaction
      await evaluationLogger.logLLMRequest(
        this.config.model,
        prompt,
        requestPayload,
        completion,
        completion.usage,
        finishReason
      );

      if (!response) {
        throw new Error(`No response received from AI file selection model. Finish reason: ${finishReason}`);
      }

      console.log(`AI response received. Length: ${response.length} characters`);
      console.log('AI response:', response);

      // Step 3: Parse the AI response
      const parsedResult = this.parseFileSelectionResponse(response, promptData.files);
      
      const processingTime = Date.now() - startTime;

      const result: AIFileSelectionResult = {
        selectedFiles: parsedResult.selectedFiles,
        reasoning: parsedResult.reasoning,
        confidence: parsedResult.confidence,
        tokenUsage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        processingTime,
        method: 'ai_guided'
      };

      console.log('=== AI-GUIDED FILE SELECTION RESULTS ===');
      console.log(`Selected files: ${result.selectedFiles.length}`);
      console.log(`Processing time: ${processingTime}ms`);
      console.log(`Token usage: ${result.tokenUsage.totalTokens} total`);
      console.log(`Confidence: ${result.confidence}`);
      console.log('Selected files:', result.selectedFiles);
      console.log('=== AI-GUIDED FILE SELECTION END ===');

      // Log the successful completion
      await evaluationLogger.logGeneral(
        'AI_FILE_SELECTION_SUCCESS',
        'INFO',
        'AI-guided file selection completed successfully',
        {
          selectedFiles: result.selectedFiles.length,
          processingTime: result.processingTime,
          tokenUsage: result.tokenUsage,
          confidence: result.confidence,
          model: this.config.model
        }
      );

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('=== AI-GUIDED FILE SELECTION ERROR ===');
      console.error('Error in AI file selection:', error);
      console.error('=== AI-GUIDED FILE SELECTION ERROR END ===');

      // Log the error
      await evaluationLogger.logGeneral(
        'AI_FILE_SELECTION_ERROR',
        'ERROR',
        'AI-guided file selection failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          repoUrl: promptData.repoUrl,
          courseId: promptData.courseId,
          model: this.config.model,
          processingTime
        }
      );

      throw new Error(`AI file selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Construct the file selection prompt based on course criteria and available files
   */
  private constructFileSelectionPrompt(promptData: FileSelectionPromptData): string {
    const { repoUrl, courseId, courseName, criteria, files, maxFiles } = promptData;

    const prompt = `
You are tasked with selecting the most relevant files from a GitHub repository for evaluation against specific course criteria.

**Repository**: ${repoUrl}
**Course**: ${courseName} (${courseId})
**Available Files**: ${files.length}
**Maximum Files to Select**: ${maxFiles}

**Course Evaluation Criteria**:
${criteria.map((criterion, index) => 
  `${index + 1}. **${criterion.name}** (${criterion.maxScore} points): ${criterion.description}`
).join('\n')}

**Available Files**:
${files.slice(0, 200).join('\n')}${files.length > 200 ? '\n... [Additional files truncated for brevity]' : ''}

**Your Task**:
Select the ${maxFiles} most relevant files that would provide the best evidence for evaluating this repository against the course criteria. Focus on:

1. **Essential files**: README, requirements, configuration files
2. **Criterion-specific files**: Files that directly relate to each evaluation criterion
3. **Implementation files**: Core code that demonstrates the project's functionality
4. **Documentation files**: Files that explain the approach and methodology
5. **Evidence files**: Files that show results, analysis, or evaluation

**Response Format**:
Provide your response in the following JSON format:

{
  "selectedFiles": [
    "README.md",
    "src/pipeline/train.py",
    "requirements.txt",
    ...
  ],
  "reasoning": "Brief explanation of why these files were selected and how they relate to the evaluation criteria",
  "confidence": 0.85
}

**Important Guidelines**:
- Select exactly ${maxFiles} files or fewer if there aren't enough relevant files
- Prioritize files that provide evidence for multiple criteria
- Include essential documentation (README, requirements, etc.)
- Focus on implementation files over configuration files
- Ensure selected files actually exist in the provided file list
- Confidence should be between 0.0 and 1.0 based on how well the selected files cover the criteria

Select the files now:`;

    return prompt;
  }

  /**
   * Parse the AI response for file selection
   */
  private parseFileSelectionResponse(response: string, availableFiles: string[]): {
    selectedFiles: string[];
    reasoning: string;
    confidence: number;
  } {
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!parsed.selectedFiles || !Array.isArray(parsed.selectedFiles)) {
        throw new Error('Invalid response structure: selectedFiles must be an array');
      }

      // Filter selected files to ensure they exist in available files
      const validSelectedFiles = parsed.selectedFiles.filter((file: string) => 
        availableFiles.includes(file)
      );

      // If no valid files found, fall back to basic selection
      if (validSelectedFiles.length === 0) {
        console.warn('No valid files found in AI response, falling back to basic selection');
        const fallbackFiles = this.getFallbackFileSelection(availableFiles);
        return {
          selectedFiles: fallbackFiles,
          reasoning: 'AI selection failed, used fallback pattern-based selection',
          confidence: 0.3
        };
      }

      return {
        selectedFiles: validSelectedFiles.slice(0, this.config.maxFiles),
        reasoning: parsed.reasoning || 'No reasoning provided',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5))
      };

    } catch (error) {
      console.error('Error parsing AI file selection response:', error);
      console.error('Raw response:', response);
      
      // Fallback to pattern-based selection
      const fallbackFiles = this.getFallbackFileSelection(availableFiles);
      return {
        selectedFiles: fallbackFiles,
        reasoning: `AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}. Used fallback selection.`,
        confidence: 0.2
      };
    }
  }

  /**
   * Generate mock AI response for testing
   */
  private async generateMockAIResponse(promptData: FileSelectionPromptData): Promise<AIFileSelectionResult> {
    const startTime = Date.now();

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Smart mock selection based on course criteria
    const selectedFiles = this.generateSmartMockSelection(promptData);

    const processingTime = Date.now() - startTime;

    return {
      selectedFiles,
      reasoning: `Mock AI selection for ${promptData.courseId} course. Selected ${selectedFiles.length} files based on criteria: ${promptData.criteria.map(c => c.name).join(', ')}.`,
      confidence: 0.85,
      tokenUsage: {
        promptTokens: 800,
        completionTokens: 150,
        totalTokens: 950
      },
      processingTime,
      method: 'ai_guided'
    };
  }

  /**
   * Generate smart mock file selection based on course criteria
   */
  private generateSmartMockSelection(promptData: FileSelectionPromptData): string[] {
    const { files, criteria, courseId, maxFiles } = promptData;
    const selectedFiles = new Set<string>();

    // Always include README
    const readme = files.find(f => /README\.(md|txt)$/i.test(f));
    if (readme) selectedFiles.add(readme);

    // Course-specific intelligent selection
    if (courseId === 'mlops') {
      // MLOps priorities
      const mlopsPatterns = [
        /requirements\.txt$/i,
        /Dockerfile$/i,
        /pipeline.*\.py$/i,
        /train.*\.py$/i,
        /deploy.*\.py$/i,
        /model.*\.py$/i,
        /monitoring.*\.py$/i,
        /\.ipynb$/i
      ];

      for (const pattern of mlopsPatterns) {
        const matches = files.filter(f => pattern.test(f));
        matches.slice(0, 2).forEach(f => selectedFiles.add(f));
        if (selectedFiles.size >= maxFiles) break;
      }
    } else if (courseId === 'data-engineering') {
      // Data Engineering priorities
      const dePatterns = [
        /dbt.*\.(sql|yml)$/i,
        /terraform.*\.tf$/i,
        /orchestration.*\.py$/i,
        /etl.*\.py$/i,
        /pipeline.*\.py$/i,
        /dashboard.*\.(py|sql)$/i
      ];

      for (const pattern of dePatterns) {
        const matches = files.filter(f => pattern.test(f));
        matches.slice(0, 2).forEach(f => selectedFiles.add(f));
        if (selectedFiles.size >= maxFiles) break;
      }
    } else if (courseId === 'llm-zoomcamp') {
      // LLM priorities
      const llmPatterns = [
        /rag.*\.py$/i,
        /ingest.*\.py$/i,
        /prep.*\.py$/i,
        /backend.*\.py$/i,
        /api.*\.py$/i,
        /\.env\.example$/i,
        /\.ipynb$/i
      ];

      for (const pattern of llmPatterns) {
        const matches = files.filter(f => pattern.test(f));
        matches.slice(0, 2).forEach(f => selectedFiles.add(f));
        if (selectedFiles.size >= maxFiles) break;
      }
    }

    // Fill remaining slots with general important files
    const generalPatterns = [
      /setup\.py$/i,
      /config\.(yaml|yml|json)$/i,
      /docker-compose\.yml$/i,
      /\.py$/i
    ];

    for (const pattern of generalPatterns) {
      if (selectedFiles.size >= maxFiles) break;
      const matches = files.filter(f => pattern.test(f) && !selectedFiles.has(f));
      matches.slice(0, 1).forEach(f => selectedFiles.add(f));
    }

    return Array.from(selectedFiles).slice(0, maxFiles);
  }

  /**
   * Fallback file selection using basic patterns
   */
  private getFallbackFileSelection(files: string[]): string[] {
    const essentialPatterns = [
      /README\.(md|txt)$/i,
      /requirements\.txt$/i,
      /package\.json$/i,
      /Dockerfile$/i,
      /\.py$/i,
      /\.ipynb$/i,
      /\.md$/i
    ];

    const selectedFiles = new Set<string>();

    // Add files matching essential patterns
    for (const pattern of essentialPatterns) {
      const matches = files.filter(file => pattern.test(file));
      matches.slice(0, 5).forEach(file => selectedFiles.add(file));
      
      if (selectedFiles.size >= this.config.maxFiles) break;
    }

    return Array.from(selectedFiles).slice(0, this.config.maxFiles);
  }
}
