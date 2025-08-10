import OpenAI from 'openai';
import { evaluationLogger } from './simple-logger';

// OpenRouter API client configuration
export class OpenRouterClient {
  private client: OpenAI;
  private currentEvaluationId: string | null = null;

  constructor() {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }

    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'ZoomJudge',
      },
    });
  }

  /**
   * Set the current evaluation ID for logging purposes
   */
  setEvaluationId(evaluationId: string) {
    this.currentEvaluationId = evaluationId;
    evaluationLogger.setCurrentEvaluation(evaluationId);
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
        model: 'anthropic/claude-sonnet-4', // Upgraded to Claude 3.5 Sonnet for better analysis
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

      console.log('API Request payload:', JSON.stringify({
        ...requestPayload,
        messages: requestPayload.messages.map(msg => ({
          ...msg,
          content: msg.content.length > 200 ? msg.content.substring(0, 200) + '...[truncated]' : msg.content
        }))
      }, null, 2));

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
        choices: completion.choices?.map(choice => ({
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

Please provide your evaluation in the following JSON format. CRITICALLY IMPORTANT: For each criterion, you MUST specify which files you analyzed in the "sourceFiles" array:
{
  "totalScore": <number>,
  "maxScore": <number>,
  "breakdown": {
    "criterion1": {
      "score": <number>,
      "feedback": "<detailed feedback>",
      "maxScore": <number>,
      "sourceFiles": ["file1.py", "README.md", "notebook.ipynb"]
    },
    "criterion2": {
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

Please provide your evaluation in the following JSON format. CRITICALLY IMPORTANT: For each criterion, you MUST specify which files you analyzed in the "sourceFiles" array:
{
  "totalScore": <number>,
  "maxScore": <number>,
  "breakdown": {
    "criterion1": {
      "score": <number>,
      "feedback": "<detailed feedback>",
      "maxScore": <number>,
      "sourceFiles": ["file1.py", "README.md", "notebook.ipynb"]
    },
    "criterion2": {
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