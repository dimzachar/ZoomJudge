/**
 * API Client Factory
 * Creates API clients with dependency injection support
 */

import OpenAI from 'openai';
import { APIConfiguration } from './types';
import { ConfigurationService } from './ConfigurationService';

export interface APIClientOptions {
  mockMode?: boolean;
  configuration?: APIConfiguration;
}

export interface MockAPIClient {
  chat: {
    completions: {
      create: (params: any) => Promise<any>;
    };
  };
}

/**
 * Factory for creating API clients with proper dependency injection
 */
export class APIClientFactory {
  private static mockClient: MockAPIClient | null = null;

  /**
   * Create OpenRouter client with dependency injection
   */
  public static createOpenRouterClient(options: APIClientOptions = {}): OpenAI | MockAPIClient {
    const { mockMode = false, configuration } = options;

    // Return mock client in mock mode
    if (mockMode) {
      return this.createMockClient();
    }

    // Get configuration from provided config or service
    const config = configuration || ConfigurationService.getInstance().getAPIConfig();
    
    if (!config.openRouter.apiKey) {
      throw new Error('OpenRouter API key is required but not provided');
    }

    return new OpenAI({
      baseURL: config.openRouter.baseURL,
      apiKey: config.openRouter.apiKey,
      defaultHeaders: config.openRouter.defaultHeaders,
    });
  }

  /**
   * Create mock client for testing
   */
  private static createMockClient(): MockAPIClient {
    if (!this.mockClient) {
      this.mockClient = {
        chat: {
          completions: {
            create: async (params: any) => {
              // Mock response based on the request
              const mockResponse = this.generateMockResponse(params);
              
              // Simulate API delay
              await new Promise(resolve => setTimeout(resolve, 100));
              
              return mockResponse;
            },
          },
        },
      };
    }
    return this.mockClient;
  }

  /**
   * Generate mock response based on request parameters
   */
  private static generateMockResponse(params: any): any {
    const isFileSelection = params.messages?.some((msg: any) => 
      msg.content?.includes('file selection') || 
      msg.content?.includes('select files')
    );

    if (isFileSelection) {
      return {
        id: 'mock-completion-file-selection',
        object: 'chat.completion',
        created: Date.now(),
        model: params.model || 'qwen/qwen-2.5-coder-32b-instruct',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify({
                selectedFiles: [
                  'src/main.py',
                  'src/models/user.py',
                  'src/api/routes.py',
                  'tests/test_main.py',
                  'requirements.txt'
                ],
                reasoning: 'Selected core application files, models, API routes, tests, and dependencies for comprehensive evaluation.',
                confidence: 0.85
              })
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 50,
          total_tokens: 200
        }
      };
    }

    // Default mock response for evaluation
    return {
      id: 'mock-completion-evaluation',
      object: 'chat.completion',
      created: Date.now(),
      model: params.model || 'anthropic/claude-sonnet-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `# Repository Evaluation

## Overall Assessment
This repository demonstrates good software engineering practices with clear structure and documentation.

## Scoring
- Code Quality: 8/10
- Documentation: 7/10
- Testing: 6/10
- Architecture: 8/10

## Recommendations
1. Improve test coverage
2. Add more inline documentation
3. Consider implementing CI/CD pipeline

**Total Score: 29/40**`
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 500,
        completion_tokens: 200,
        total_tokens: 700
      }
    };
  }

  /**
   * Validate API client configuration
   */
  public static validateConfiguration(config: APIConfiguration): boolean {
    return !!(
      config.openRouter &&
      config.openRouter.apiKey &&
      config.openRouter.baseURL &&
      config.openRouter.defaultHeaders
    );
  }

  /**
   * Create client with automatic configuration detection
   */
  public static createAutoConfiguredClient(): OpenAI | MockAPIClient {
    const configService = ConfigurationService.getInstance();
    
    return this.createOpenRouterClient({
      mockMode: configService.isMockMode() || !configService.hasAPIKey(),
      configuration: configService.getAPIConfig()
    });
  }

  /**
   * Reset mock client (useful for testing)
   */
  public static resetMockClient(): void {
    this.mockClient = null;
  }
}
