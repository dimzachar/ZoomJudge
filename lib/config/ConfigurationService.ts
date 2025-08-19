/**
 * Centralized Configuration Service
 * Manages all application configuration with dependency injection support
 */

import { 
  AppConfiguration, 
  ConfigurationOptions, 
  ConfigurationValidationResult,
  MockConfiguration 
} from './types';

export class ConfigurationService {
  private static instance: ConfigurationService | null = null;
  private config: AppConfiguration;
  private mockMode: boolean;
  private mockConfig: MockConfiguration;

  private constructor(options: ConfigurationOptions = {}) {
    this.mockMode = options.mockMode || false;
    this.mockConfig = options.mockConfig || { enabled: false };
    this.config = this.loadConfiguration(options.overrides);
    
    // Validate configuration on initialization
    const validation = this.validateConfiguration();
    if (!validation.isValid) {
      console.warn('Configuration validation failed:', validation.errors);
      if (!this.mockMode) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
    }
  }

  /**
   * Get singleton instance of ConfigurationService
   * Lazy-loaded to avoid issues with module instantiation in Convex
   */
  public static getInstance(options?: ConfigurationOptions): ConfigurationService {
    if (!ConfigurationService.instance) {
      try {
        ConfigurationService.instance = new ConfigurationService(options);
      } catch (error) {
        console.warn('Failed to create ConfigurationService:', error instanceof Error ? error.message : String(error));
        // Return a minimal instance in case of environment issues
        ConfigurationService.instance = new ConfigurationService({
          mockMode: true,
          ...options
        });
      }
    }
    return ConfigurationService.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    ConfigurationService.instance = null;
  }

  /**
   * Load configuration from environment variables and overrides
   */
  private loadConfiguration(overrides?: Partial<AppConfiguration>): AppConfiguration {
    const baseConfig: AppConfiguration = {
      api: {
        openRouter: {
          apiKey: process.env.OPENROUTER_API_KEY || '',
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || 'ZoomJudge',
          },
        },
      },
      database: {
        convex: {
          deployment: process.env.CONVEX_DEPLOYMENT || '',
          url: process.env.NEXT_PUBLIC_CONVEX_URL || '',
        },
      },
      auth: {
        clerk: {
          publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
          secretKey: process.env.CLERK_SECRET_KEY || '',
          webhookSecret: process.env.CLERK_WEBHOOK_SECRET || '',
          frontendApiUrl: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL || '',
          signInForceRedirectUrl: process.env.NEXT_PUBLIC_CLERK_SIGNIN_REDIRECT || '/dashboard',
          signUpForceRedirectUrl: process.env.NEXT_PUBLIC_CLERK_SIGNUP_REDIRECT || '/dashboard',
          signInFallbackRedirectUrl: process.env.NEXT_PUBLIC_CLERK_SIGNIN_FALLBACK || '/dashboard',
          signUpFallbackRedirectUrl: process.env.NEXT_PUBLIC_CLERK_SIGNUP_FALLBACK || '/dashboard',
        },
      },
      site: {
        url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        name: process.env.NEXT_PUBLIC_SITE_NAME || 'ZoomJudge',
        simpleLoggerEnabled: process.env.SIMPLE_LOGGER_ENABLED === 'true',
      },
      environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    };

    // Apply overrides if provided
    if (overrides) {
      return this.mergeConfigurations(baseConfig, overrides);
    }

    return baseConfig;
  }

  /**
   * Deep merge configurations
   */
  private mergeConfigurations(base: AppConfiguration, overrides: Partial<AppConfiguration>): AppConfiguration {
    const merged = { ...base };
    
    if (overrides.api) {
      merged.api = { ...merged.api, ...overrides.api };
      if (overrides.api.openRouter) {
        merged.api.openRouter = { ...merged.api.openRouter, ...overrides.api.openRouter };
      }
    }
    
    if (overrides.database) {
      merged.database = { ...merged.database, ...overrides.database };
    }
    
    if (overrides.auth) {
      merged.auth = { ...merged.auth, ...overrides.auth };
    }
    
    if (overrides.site) {
      merged.site = { ...merged.site, ...overrides.site };
    }
    
    if (overrides.environment) {
      merged.environment = overrides.environment;
    }

    return merged;
  }

  /**
   * Validate current configuration
   */
  private validateConfiguration(): ConfigurationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Skip validation in mock mode
    if (this.mockMode) {
      return { isValid: true, errors, warnings };
    }

    // Validate API configuration
    if (!this.config.api.openRouter.apiKey) {
      errors.push('OPENROUTER_API_KEY is required');
    }

    // Validate database configuration
    if (!this.config.database.convex.deployment) {
      warnings.push('CONVEX_DEPLOYMENT is not set');
    }
    if (!this.config.database.convex.url) {
      warnings.push('NEXT_PUBLIC_CONVEX_URL is not set');
    }

    // Validate auth configuration
    if (!this.config.auth.clerk.publishableKey) {
      warnings.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set');
    }
    if (!this.config.auth.clerk.secretKey) {
      warnings.push('CLERK_SECRET_KEY is not set');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get full configuration
   */
  public getConfig(): AppConfiguration {
    return { ...this.config };
  }

  /**
   * Get API configuration
   */
  public getAPIConfig() {
    return { ...this.config.api };
  }

  /**
   * Get OpenRouter configuration
   */
  public getOpenRouterConfig() {
    return { ...this.config.api.openRouter };
  }

  /**
   * Get database configuration
   */
  public getDatabaseConfig() {
    return { ...this.config.database };
  }

  /**
   * Get auth configuration
   */
  public getAuthConfig() {
    return { ...this.config.auth };
  }

  /**
   * Get site configuration
   */
  public getSiteConfig() {
    return { ...this.config.site };
  }

  /**
   * Check if running in mock mode
   */
  public isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * Check if API key is available
   */
  public hasAPIKey(): boolean {
    return !!this.config.api.openRouter.apiKey;
  }

  /**
   * Get environment
   */
  public getEnvironment() {
    return this.config.environment;
  }

  /**
   * Update configuration at runtime (useful for testing)
   */
  public updateConfig(updates: Partial<AppConfiguration>): void {
    this.config = this.mergeConfigurations(this.config, updates);
  }
}
