import OpenAI from 'openai';
import { evaluationLogger } from './simple-logger';
import { APIClientFactory, APIClientOptions, MockAPIClient } from './config/APIClientFactory';
import { ConfigurationService } from './config/ConfigurationService';

// OpenRouter API client configuration
export class OpenRouterClient {
  private client: OpenAI | MockAPIClient;
  private currentEvaluationId: string | null = null;
  private mockMode: boolean;

  constructor(options: APIClientOptions = {}) {
    // Determine if we should use mock mode
    const configService = ConfigurationService.getInstance(options);
    this.mockMode = options.mockMode || configService.isMockMode() || !configService.hasAPIKey();

    // Create client using factory
    this.client = APIClientFactory.createOpenRouterClient({
      mockMode: this.mockMode,
      configuration: options.configuration
    });
  }

  /**
   * Set the current evaluation ID for logging purposes
   */
  setEvaluationId(evaluationId: string) {
    this.currentEvaluationId = evaluationId;
    if (typeof evaluationLogger !== 'undefined' && evaluationLogger.setCurrentEvaluation) {
      evaluationLogger.setCurrentEvaluation(evaluationId);
    }
  }

  /**
   * Check if client is in mock mode
   */
  isMockMode(): boolean {
    return this.mockMode;
  }



  /**
   * Evaluate a GitHub repository using Claude Sonnet 4
   * @param repoUrl - The GitHub repository URL
   * @param courseData - The course data with criteria from Convex
   * @param repoContent - The repository content to analyze
   * @returns Evaluation results including prompt hash and rubric version
   */
  async evaluateRepository(
    repoUrl: string,
    courseData: {
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
    },
    repoContent: string
  ): Promise<{
    totalScore: number;
    maxScore: number;
    breakdown: Record<string, { score: number; feedback: string; maxScore: number; sourceFiles?: string[] }>;
    overallFeedback: string;
    promptHash: string;
    rubricVersion: number;
  }> {
    try {
      console.log('=== OPENROUTER CLIENT DEBUG START ===');
      console.log(`Repository URL: ${repoUrl}`);
      console.log(`Course: ${courseData.courseName} (${courseData.courseId})`);
      console.log(`Repository Content Length: ${repoContent.length} characters`);
      console.log(`Rubric Version: ${courseData.rubricVersion || 1}`);

      // Log the start of evaluation
      await evaluationLogger.logGeneral(
        'OPENROUTER_START',
        'INFO',
        'Starting OpenRouter evaluation',
        {
          repoUrl,
          courseId: courseData.courseId,
          courseName: courseData.courseName,
          rubricVersion: courseData.rubricVersion || 1,
          contentLength: repoContent.length,
          evaluationId: this.currentEvaluationId
        }
      );

      // Step 1: Construct evaluation prompt
      console.log('=== STEP 1: CONSTRUCTING EVALUATION PROMPT ===');
      const { prompt, promptHash } = this.constructEvaluationPrompt(repoUrl, courseData, repoContent);
      console.log(`Prompt constructed successfully. Length: ${prompt.length} characters`);
      console.log(`Prompt hash: ${promptHash}`);
      console.log('Prompt preview (first 1000 chars):', prompt.substring(0, 1000));
      console.log('Prompt preview (last 500 chars):', prompt.substring(prompt.length - 500));

      // Step 2: Prepare API request
      console.log('=== STEP 2: PREPARING API REQUEST ===');
      const requestPayload = {
        model: 'qwen/qwen3-coder:free', // Upgraded to Claude 3.5 Sonnet for better analysis
        messages: [
          {
            role: 'system' as const,
            content: 'You are an expert code reviewer and educator specializing in evaluating GitHub repositories for Zoomcamp courses. Provide detailed, constructive feedback and accurate scoring based on the provided rubric. Analyze the repository thoroughly and provide comprehensive feedback for each criterion.'
          },
          {
            role: 'user' as const,
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent scoring
        max_tokens: 16000, // Increased token limit for more detailed responses
      };

      // Note: Request payload not logged for security (contains repository content)
      console.log('API Request prepared - Model:', requestPayload.model, 'Messages:', requestPayload.messages.length);

      // Step 3: Make API call
      console.log('=== STEP 3: MAKING API CALL ===');
      console.log('Sending request to OpenRouter API...');

      // Log the request
      await evaluationLogger.logGeneral(
        'LLM_REQUEST',
        'DEBUG',
        'Sending request to OpenRouter API',
        { model: requestPayload.model, promptLength: prompt.length }
      );

      const completion = await this.client.chat.completions.create(requestPayload);

      console.log('API Response received:', JSON.stringify({
        id: completion.id,
        model: completion.model,
        usage: completion.usage,
        choices: completion.choices?.map((choice: any) => ({
          index: choice.index,
          finish_reason: choice.finish_reason,
          message: {
            role: choice.message?.role,
            content: choice.message?.content ?
              choice.message.content.substring(0, 500) + '...[truncated]' :
              'No content'
          }
        }))
      }, null, 2));

      const response = completion.choices[0]?.message?.content;
      const finishReason = completion.choices[0]?.finish_reason;

      // Log the complete LLM interaction
      await evaluationLogger.logLLMRequest(
        requestPayload.model,
        prompt,
        requestPayload,
        completion,
        completion.usage,
        finishReason
      );

      if (!response || response === "No content") {
        console.error('No response content received from OpenRouter API');
        console.error('Finish reason:', finishReason);
        console.error('Usage stats:', completion.usage);

        if (finishReason === 'length') {
          throw new Error('Model response was truncated due to token limit. Try using a model with higher token limits or reduce the repository size.');
        } else {
          throw new Error(`No response received from OpenRouter API. Finish reason: ${finishReason}`);
        }
      }

      console.log('=== STEP 4: PARSING RESPONSE ===');
      console.log(`Raw LLM response length: ${response.length} characters`);
      console.log('Raw LLM response:', response);

      const parsedResults = this.parseEvaluationResponse(response);
      console.log('Parsed evaluation results:', JSON.stringify(parsedResults, null, 2));
      console.log('=== OPENROUTER CLIENT DEBUG END ===');

      return {
        ...parsedResults,
        promptHash,
        rubricVersion: courseData.rubricVersion || 1,
      };
    } catch (error) {
      console.error('=== OPENROUTER CLIENT ERROR ===');
      console.error('Error evaluating repository:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      console.error('=== OPENROUTER CLIENT ERROR END ===');

      // Log the error
      await evaluationLogger.logGeneral(
        'OPENROUTER_ERROR',
        'ERROR',
        'OpenRouter evaluation failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : 'No stack trace',
          repoUrl,
          courseId: courseData.courseId,
          courseName: courseData.courseName
        }
      );

      throw new Error(`Failed to evaluate repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Construct the evaluation prompt based on course data and repository content
   */
  private constructEvaluationPrompt(
    repoUrl: string, 
    courseData: {
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
    }, 
    repoContent: string
  ): { prompt: string; promptHash: string } {
    // Use custom prompt template if provided, otherwise use default
    const promptPrefix = courseData.promptTemplate || `
Please evaluate the following GitHub repository for the ${courseData.courseName} course:

Repository URL: ${repoUrl}

Repository Content:
${repoContent}

Please provide your evaluation in the following JSON format. CRITICALLY IMPORTANT: For each criterion, you MUST specify which files you analyzed in the "sourceFiles" array. Use the actual criterion names as keys in the breakdown object:
{
  "totalScore": <number>,
  "maxScore": <number>,
  "breakdown": {
    "Problem description": {
      "score": <number>,
      "feedback": "<detailed feedback>",
      "maxScore": <number>,
      "sourceFiles": ["file1.py", "README.md", "notebook.ipynb"]
    },
    "Model Implementation": {
      "score": <number>,
      "feedback": "<detailed feedback>",
      "maxScore": <number>,
      "sourceFiles": ["file2.py", "config.yml"]
    }
  },
  "overallFeedback": "<comprehensive overall feedback>"
}

EVALUATION INSTRUCTIONS:
1. **File Analysis**: Carefully examine ALL provided files. Look for evaluation notebooks, analysis files, documentation about methods used, and implementation details.
2. **Source Tracking**: For each criterion, you MUST list the specific files that provided evidence for your scoring in the "sourceFiles" array.
3. **Deep Analysis**: Don't just look at README files - examine code files, notebooks, configuration files, and data files for evidence of implementation.
4. **Evidence-Based Scoring**: Base your scores on concrete evidence found in the files, not assumptions.
5. **File Mentions**: When you find relevant evidence in a file, mention the specific file name in your feedback.
6. **DISCRETE SCORING ONLY**: Each criterion has specific conditions that map to exact point values. You MUST determine which condition is met and assign ONLY the exact score specified for that condition. DO NOT interpolate or assign fractional scores (like 0.5, 1.5, 2.5). For example:
   - If a criterion says "0 points: condition A, 1 point: condition B, 2 points: condition C" - you must assign exactly 0, 1, or 2 based on which condition is met
   - Never assign partial credit between the defined point levels
7. **Problem Description Scoring Guidelines**: For "Problem description" criteria, be very strict about what constitutes a description:
   - **0 points**: Project title alone, generic statements like "final project", or no explanation of what problem is being solved
   - **1 point**: Brief mention of the problem domain but lacks context, objectives, or clear explanation of what the project aims to solve
   - **2 points**: Clear explanation of the specific problem, context, objectives, and how the solution addresses the problem
8. **Best Practices Interpretation**: For LLM Zoomcamp "Best practices" criterion, when it says "at least evaluating it", this means looking for evidence of EXPLORATION or EXPERIMENTATION, not final implementation. Award points if you find:
   - Notebooks or files showing experiments with hybrid search, document re-ranking, or query rewriting
   - Evaluation results comparing different approaches (even if not used in final system)
   - Documentation discussing these techniques or their evaluation
   - Code that tests or explores these methods (even if commented out or in separate files)

Course Description: ${courseData.description}
Maximum Possible Score: ${courseData.maxScore}

Evaluation Criteria:
`;

    // Generate criteria text from course data
    const criteriaText = courseData.criteria.map((criterion, index) => {
      return `${index + 1}. **${criterion.name}** (${criterion.maxScore} points): ${criterion.description}`;
    }).join('\n');

    const fullPrompt = promptPrefix + criteriaText;
    
    // Generate a hash of the prompt for audit purposes
    const promptHash = this.generatePromptHash(fullPrompt);
    
    return { prompt: fullPrompt, promptHash };
  }

  /**
   * Generate a hash of the prompt for audit purposes
   */
  private generatePromptHash(prompt: string): string {
    // Simple hash function - in production, consider using crypto
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }



  /**
   * Parse the evaluation response from the AI
   */
  private parseEvaluationResponse(response: string): {
    totalScore: number;
    maxScore: number;
    breakdown: Record<string, { score: number; feedback: string; maxScore: number; sourceFiles?: string[] }>;
    overallFeedback: string;
  } {
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!parsed.totalScore || !parsed.maxScore || !parsed.breakdown || !parsed.overallFeedback) {
        throw new Error('Invalid response structure');
      }

      // Validate that all scores are whole numbers (log warning if fractional scores are found)
      for (const [criterionName, criterionData] of Object.entries(parsed.breakdown)) {
        if (typeof criterionData === 'object' && criterionData !== null && 'score' in criterionData) {
          const score = (criterionData as any).score;
          if (!Number.isInteger(score)) {
            console.warn(`WARNING: Fractional score detected for "${criterionName}": ${score}. This should not happen with proper prompt instructions.`);
          }
        }
      }

      // Calculate the correct total score from individual criterion scores
      let calculatedTotalScore = 0;
      let calculatedMaxScore = 0;

      for (const [, criterionData] of Object.entries(parsed.breakdown)) {
        if (typeof criterionData === 'object' && criterionData !== null && 'score' in criterionData && 'maxScore' in criterionData) {
          const score = (criterionData as any).score;
          const maxScore = (criterionData as any).maxScore;
          calculatedTotalScore += score;
          calculatedMaxScore += maxScore;
        }
      }

      // Check if AI's calculation matches our calculation
      if (parsed.totalScore !== calculatedTotalScore) {
        console.warn(`WARNING: AI calculation error detected. AI reported total: ${parsed.totalScore}, Correct total: ${calculatedTotalScore}. Using correct calculation.`);
        parsed.totalScore = calculatedTotalScore;
      }

      if (parsed.maxScore !== calculatedMaxScore) {
        console.warn(`WARNING: AI max score error detected. AI reported max: ${parsed.maxScore}, Correct max: ${calculatedMaxScore}. Using correct calculation.`);
        parsed.maxScore = calculatedMaxScore;
      }

      return parsed;
    } catch (error) {
      console.error('Error parsing evaluation response:', error);
      // Return a fallback response
      return {
        totalScore: 0,
        maxScore: 100,
        breakdown: {
          'parsing_error': {
            score: 0,
            feedback: 'Failed to parse evaluation response. Please try again.',
            maxScore: 100
          }
        },
        overallFeedback: 'Unable to complete evaluation due to parsing error.'
      };
    }
  }
}

// Export a function to get the client instance
export function getOpenRouterClient(): OpenRouterClient {
  return new OpenRouterClient();
}

// Shared prompt builder to ensure consistency across evaluators (OpenRouter and Anthropic web-search)
export function buildCourseEvaluationPrompt(
  repoUrl: string,
  courseData: {
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
  },
  repoContent: string
): { prompt: string; promptHash: string } {
  // Duplicate the private constructEvaluationPrompt structure for external reuse
  const promptPrefix = courseData.promptTemplate || `
Please evaluate the following GitHub repository for the ${courseData.courseName} course:

Repository URL: ${repoUrl}

Repository Content:
${repoContent}

Please provide your evaluation in the following JSON format. CRITICALLY IMPORTANT: For each criterion, you MUST specify which files you analyzed in the "sourceFiles" array. Use the actual criterion names as keys in the breakdown object:
{
  "totalScore": <number>,
  "maxScore": <number>,
  "breakdown": {
    "Problem description": {
      "score": <number>,
      "feedback": "<detailed feedback>",
      "maxScore": <number>,
      "sourceFiles": ["file1.py", "README.md", "notebook.ipynb"]
    },
    "Model Implementation": {
      "score": <number>,
      "feedback": "<detailed feedback>",
      "maxScore": <number>,
      "sourceFiles": ["file2.py", "config.yml"]
    }
  },
  "overallFeedback": "<comprehensive overall feedback>"
}

EVALUATION INSTRUCTIONS:
1. **File Analysis**: Carefully examine ALL provided files. Look for evaluation notebooks, analysis files, documentation about methods used, and implementation details.
2. **Source Tracking**: For each criterion, you MUST list the specific files that provided evidence for your scoring in the "sourceFiles" array.
3. **Deep Analysis**: Don't just look at README files - examine code files, notebooks, configuration files, and data files for evidence of implementation.
4. **Evidence-Based Scoring**: Base your scores on concrete evidence found in the files, not assumptions.
5. **File Mentions**: When you find relevant evidence in a file, mention the specific file name in your feedback.
6. **DISCRETE SCORING ONLY**: Each criterion has specific conditions that map to exact point values. You MUST determine which condition is met and assign ONLY the exact score specified for that condition. DO NOT interpolate or assign fractional scores (like 0.5, 1.5, 2.5). For example:
   - If a criterion says "0 points: condition A, 1 point: condition B, 2 points: condition C" - you must assign exactly 0, 1, or 2 based on which condition is met
   - Never assign partial credit between the defined point levels
7. **Problem Description Scoring Guidelines**: For "Problem description" criteria, be very strict about what constitutes a description:
   - **0 points**: Project title alone, generic statements like "final project", or no explanation of what problem is being solved
   - **1 point**: Brief mention of the problem domain but lacks context, objectives, or clear explanation of what the project aims to solve
   - **2 points**: Clear explanation of the specific problem, context, objectives, and how the solution addresses the problem
8. **Best Practices Interpretation**: For LLM Zoomcamp "Best practices" criterion, when it says "at least evaluating it", this means looking for evidence of EXPLORATION or EXPERIMENTATION, not final implementation. Award points if you find:
   - Notebooks or files showing experiments with hybrid search, document re-ranking, or query rewriting
   - Evaluation results comparing different approaches (even if not used in final system)
   - Documentation discussing these techniques or their evaluation
   - Code that tests or explores these methods (even if commented out or in separate files)

Course Description: ${courseData.description}
Maximum Possible Score: ${courseData.maxScore}

Evaluation Criteria:
`;

  const criteriaText = courseData.criteria.map((criterion, index) => {
    return `${index + 1}. **${criterion.name}** (${criterion.maxScore} points): ${criterion.description}`;
  }).join('\n');

  const fullPrompt = promptPrefix + criteriaText;

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fullPrompt.length; i++) {
    const char = fullPrompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const promptHash = Math.abs(hash).toString(16);

  return { prompt: fullPrompt, promptHash };
}
