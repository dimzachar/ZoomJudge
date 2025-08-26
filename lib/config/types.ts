/**
 * Configuration types for dependency injection
 * Provides type-safe interfaces for all configuration values
 */

export interface APIConfiguration {
  openRouter: {
    apiKey: string;
    baseURL: string;
    defaultHeaders: {
      'HTTP-Referer': string;
      'X-Title': string;
    };
  };
}

export interface DatabaseConfiguration {
  convex: {
    deployment: string;
    url: string;
  };
}

export interface AuthConfiguration {
  clerk: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    frontendApiUrl: string;
    signInForceRedirectUrl: string;
    signUpForceRedirectUrl: string;
    signInFallbackRedirectUrl: string;
    signUpFallbackRedirectUrl: string;
  };
}

export interface SiteConfiguration {
  url: string;
  name: string;
  simpleLoggerEnabled: boolean;
}

export interface EmailConfiguration {
  resend: {
    apiKey: string;
    fromDomain: string;
    fromEmail: string;
    enabled: boolean;
  };
}

export interface AppConfiguration {
  api: APIConfiguration;
  database: DatabaseConfiguration;
  auth: AuthConfiguration;
  site: SiteConfiguration;
  email: EmailConfiguration;
  environment: 'development' | 'production' | 'test';
}

export interface MockConfiguration {
  enabled: boolean;
  apiResponses?: Record<string, any>;
}

export interface ConfigurationOptions {
  mockMode?: boolean;
  mockConfig?: MockConfiguration;
  overrides?: Partial<AppConfiguration>;
}

/**
 * Configuration validation result
 */
export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration source interface for different providers
 */
export interface ConfigurationSource {
  load(): Promise<Partial<AppConfiguration>>;
  validate(config: Partial<AppConfiguration>): ConfigurationValidationResult;
}
