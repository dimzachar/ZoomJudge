import OpenAI from 'openai';

// OpenRouter API client configuration
export class OpenRouterClient {
  private client: OpenAI;

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
   * Evaluate a GitHub repository using Claude Sonnet 4
   * @param repoUrl - The GitHub repository URL
   * @param courseType - The course type for evaluation criteria
   * @param repoContent - The repository content to analyze
   * @returns Evaluation results
   */
  async evaluateRepository(
    repoUrl: string,
    courseType: string,
    repoContent: string
  ): Promise<{
    totalScore: number;
    maxScore: number;
    breakdown: Record<string, { score: number; feedback: string; maxScore: number }>;
    overallFeedback: string;
  }> {
    try {
      const prompt = this.constructEvaluationPrompt(repoUrl, courseType, repoContent);
      
      const completion = await this.client.chat.completions.create({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code reviewer and educator specializing in evaluating GitHub repositories for Zoomcamp courses. Provide detailed, constructive feedback and accurate scoring based on the provided rubric.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent scoring
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response received from OpenRouter API');
      }

      return this.parseEvaluationResponse(response);
    } catch (error) {
      console.error('Error evaluating repository:', error);
      throw new Error(`Failed to evaluate repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Construct the evaluation prompt based on course type and repository content
   */
  private constructEvaluationPrompt(repoUrl: string, courseType: string, repoContent: string): string {
    const basePrompt = `
Please evaluate the following GitHub repository for the ${courseType} course:

Repository URL: ${repoUrl}

Repository Content:
${repoContent}

Please provide your evaluation in the following JSON format:
{
  "totalScore": <number>,
  "maxScore": <number>,
  "breakdown": {
    "criterion1": {
      "score": <number>,
      "feedback": "<detailed feedback>",
      "maxScore": <number>
    },
    "criterion2": {
      "score": <number>,
      "feedback": "<detailed feedback>",
      "maxScore": <number>
    }
  },
  "overallFeedback": "<comprehensive overall feedback>"
}

Evaluation Criteria for ${courseType}:
`;

    // Add course-specific criteria
    const courseCriteria = this.getCourseCriteria(courseType);
    return basePrompt + courseCriteria;
  }

  /**
   * Get course-specific evaluation criteria
   */
  private getCourseCriteria(courseType: string): string {
    const criteria: Record<string, string> = {
      'data-engineering': `
1. **Data Pipeline Architecture (25 points)**: Evaluate the overall design and structure of data pipelines
2. **Data Processing Logic (25 points)**: Assess the quality and efficiency of data transformation code
3. **Infrastructure as Code (20 points)**: Review Terraform, Docker, or other IaC implementations
4. **Data Quality & Testing (15 points)**: Check for data validation, testing, and quality assurance
5. **Documentation & README (15 points)**: Evaluate project documentation and setup instructions
`,
      'machine-learning': `
1. **Model Development (30 points)**: Evaluate model selection, training, and validation approaches
2. **Data Preprocessing (20 points)**: Assess data cleaning, feature engineering, and preparation
3. **Model Evaluation (20 points)**: Review metrics, validation strategies, and performance analysis
4. **Code Quality (15 points)**: Evaluate code structure, modularity, and best practices
5. **Documentation & Reproducibility (15 points)**: Check for clear documentation and reproducible results
`,
      'llm-zoomcamp': `
1. **LLM Integration (30 points)**: Evaluate proper use of language models and APIs
2. **Prompt Engineering (25 points)**: Assess prompt design and optimization techniques
3. **Application Architecture (20 points)**: Review overall system design and structure
4. **User Experience (15 points)**: Evaluate interface design and usability
5. **Documentation & Setup (10 points)**: Check for clear instructions and documentation
`,
      'mlops': `
1. **CI/CD Pipeline (25 points)**: Evaluate automated testing, building, and deployment
2. **Model Monitoring (25 points)**: Assess monitoring, logging, and alerting systems
3. **Infrastructure Management (20 points)**: Review containerization, orchestration, and scaling
4. **Model Versioning (15 points)**: Check for proper model and data versioning
5. **Documentation & Best Practices (15 points)**: Evaluate adherence to MLOps best practices
`,
      'stock-markets': `
1. **Trading Strategy Implementation (30 points)**: Evaluate trading logic and strategy development
2. **Data Analysis & Visualization (25 points)**: Assess market data analysis and visualization
3. **Risk Management (20 points)**: Review risk assessment and management techniques
4. **Backtesting & Validation (15 points)**: Check for proper strategy testing and validation
5. **Documentation & Results (10 points)**: Evaluate documentation and result presentation
`
    };

    return criteria[courseType] || criteria['data-engineering']; // Default to data-engineering
  }

  /**
   * Parse the evaluation response from the AI
   */
  private parseEvaluationResponse(response: string): {
    totalScore: number;
    maxScore: number;
    breakdown: Record<string, { score: number; feedback: string; maxScore: number }>;
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

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: 'Hello, please respond with "Connection successful"'
          }
        ],
        max_tokens: 10,
      });

      return completion.choices[0]?.message?.content?.includes('Connection successful') || false;
    } catch (error) {
      console.error('OpenRouter connection test failed:', error);
      return false;
    }
  }
}

// Export a function to get the client instance
export function getOpenRouterClient(): OpenRouterClient {
  return new OpenRouterClient();
}
