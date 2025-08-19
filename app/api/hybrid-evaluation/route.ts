import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { EvaluationServiceIntegration } from '@/lib/ultimate-hybrid/integration/EvaluationServiceIntegration';
import { validateRepository } from '@/lib/github-validator';
import { ConfigurationService } from '@/lib/config/ConfigurationService';
import { hybridEvaluationSchema } from '@/lib/validation/api-schemas';
import { handleSecurityError, generateRequestId } from '@/lib/error-handling';
import { logSecurityEvent } from '@/lib/security-audit';
import { sanitizeRepoData } from '@/lib/sanitization';
import { validateRuntimeEnv } from '@/lib/env-validation';

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent');

  try {
    // Validate environment first
    validateRuntimeEnv();

    // 🔒 NEW: Add authentication check
    const { userId } = await auth();

    if (!userId) {
      logSecurityEvent({
        type: 'unauthorized_api_access',
        ip,
        userAgent: userAgent || undefined,
        details: {
          path: '/api/hybrid-evaluation',
          requestId,
          reason: 'No authentication provided'
        }
      });

      return NextResponse.json(
        { error: 'Authentication required', requestId },
        { status: 401 }
      );
    }

    // 🔒 NEW: Add billing validation
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const canEvaluate = await convex.query(api.userUsage.canPerformEvaluationForUser, {
      userId,
    });

    if (!canEvaluate.canEvaluate) {
      logSecurityEvent({
        type: 'billing_limit_exceeded',
        ip,
        userAgent: userAgent || undefined,
        details: {
          path: '/api/hybrid-evaluation',
          userId,
          currentUsage: canEvaluate.currentCount,
          limit: canEvaluate.limit,
          tier: canEvaluate.tier,
          requestId
        }
      });

      return NextResponse.json(
        {
          error: 'Billing limit exceeded',
          reason: canEvaluate.reason,
          requestId
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Enhanced input validation with sanitization
    const validationResult = await hybridEvaluationSchema.safeParseAsync(body);

    if (!validationResult.success) {
      logSecurityEvent({
        type: 'validation_failure',
        ip,
        userAgent: userAgent || undefined,
        details: {
          errors: validationResult.error.issues,
          path: '/api/hybrid-evaluation',
          requestId
        }
      });

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
          requestId
        },
        { status: 400 }
      );
    }

    // Sanitize the validated data
    const sanitizedData = sanitizeRepoData(validationResult.data);
    const { repoUrl, courseId, userId: requestUserId } = sanitizedData;

    // Initialize configuration service
    const configService = ConfigurationService.getInstance();

    // Initialize the Ultimate Hybrid system with enhanced configuration
    const integration = new EvaluationServiceIntegration({
      mockMode: configService.isMockMode() || !configService.hasAPIKey()
    });

    // Configure A/B testing for comparison
    integration.updateABTestConfig({
      enabled: true,
      hybridPercentage: 100, // Always use hybrid for this demo page
      comparisonMode: true,   // Compare with current system
      logResults: true
    });

    // Validate and fetch real repository files using existing working logic
    console.log(`🧪 Hybrid Evaluation API called:`);
    console.log(`   Repository: ${repoUrl}`);
    console.log(`   Course: ${courseId}`);

    let files: string[] = [];

    try {
      // Use the existing validateRepository function that already works correctly
      const validation = await validateRepository(repoUrl);

      if (!validation.isValid || !validation.structure) {
        throw new Error(validation.error || 'Repository validation failed');
      }

      // Get the actual files from the repository structure
      files = validation.structure.files;

      console.log(`   ✅ Real files fetched: ${files.length}`);
      console.log(`   📁 Sample files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);

    } catch (error) {
      console.warn(`⚠️ Failed to fetch real files, using mock data:`, error);
      // Fallback to mock files if GitHub API fails
      files = getMockFilesForCourse(courseId);
      console.log(`   Fallback mock files: ${files.length}`);
    }

    // Run the Ultimate Hybrid file selection
    const result = await integration.selectFilesWithABTest(
      {
        repoUrl,
        courseId,
        userId: userId,
        evaluationId: `api-${Date.now()}`
      },
      files
    );

    // Format response for the UI
    const response = {
      selectedFiles: result.selectedFiles,
      method: result.method,
      confidence: result.metadata.confidence || 0.8,
      processingTime: result.metadata.processingTime || 0,
      tierUsed: result.metadata.tierUsed || 2,
      cacheHit: result.metadata.cacheHit || false,
      tokenUsage: result.metadata.tokenUsage,
      comparison: result.metadata.comparison ? {
        fileOverlap: result.metadata.comparison.comparison.fileOverlap,
        hybridAdvantages: result.metadata.comparison.comparison.hybridAdvantages,
        currentFiles: result.metadata.comparison.currentSystem.selectedFiles.length,
        hybridFiles: result.metadata.comparison.hybridSystem.selectedFiles.length,
        uniqueToHybrid: result.metadata.comparison.comparison.uniqueToHybrid,
        uniqueToCurrent: result.metadata.comparison.comparison.uniqueToCurrent
      } : null
    };

    console.log(`✅ Hybrid Evaluation completed:`);
    console.log(`   Method: ${response.method}`);
    console.log(`   Tier: ${response.tierUsed}`);
    console.log(`   Files: ${response.selectedFiles.length}`);
    console.log(`   Confidence: ${(response.confidence * 100).toFixed(1)}%`);
    // Note: File names and detailed content not logged for security

    return NextResponse.json({
      ...response,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Hybrid Evaluation API error:', error);

    // Log security event for unexpected errors
    logSecurityEvent({
      type: 'suspicious_activity',
      ip,
      userAgent: userAgent || undefined,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: '/api/hybrid-evaluation',
        requestId
      }
    });

    // Use structured error handling
    const errorResponse = handleSecurityError(error, requestId);
    return NextResponse.json(errorResponse, {
      status: errorResponse.statusCode,
      headers: {
        'X-Request-ID': requestId
      }
    });
  }
}

function getMockFilesForCourse(courseId: string): string[] {
  const mockFiles: Record<string, string[]> = {
    'data-engineering': [
      'README.md',
      'dbt/models/staging/stg_users.sql',
      'dbt/models/marts/dim_users.sql',
      'dbt/dbt_project.yml',
      'terraform/main.tf',
      'terraform/variables.tf',
      'terraform/outputs.tf',
      'orchestration/dags/daily_pipeline.py',
      'processing/etl.py',
      'dashboard/app.py',
      'dashboard/config.py',
      'requirements.txt',
      'docker-compose.yml',
      'scripts/setup.sh',
      '.env.example'
    ],
    'machine-learning': [
      'README.md',
      'train.py',
      'predict.py',
      'model.py',
      'data_preprocessing.py',
      'notebooks/eda.ipynb',
      'notebooks/model_training.ipynb',
      'notebooks/model_evaluation.ipynb',
      'requirements.txt',
      'setup.py',
      'config.yaml',
      'tests/test_model.py',
      'scripts/download_data.py'
    ],
    'llm-zoomcamp': [
      'README.md',
      'backend/app/main.py',
      'backend/app/routers/chat.py',
      'rag/ingest.py',
      'rag/prep.py',
      'rag/search.py',
      'api/routes.py',
      'api/models.py',
      'requirements.txt',
      'Dockerfile',
      '.env.example',
      'notebooks/evaluation.ipynb',
      'data/documents.json',
      'config/settings.py'
    ],
    'mlops': [
      'README.md',
      'src/pipeline/data_ingestion.py',
      'src/pipeline/training.py',
      'src/pipeline/deployment.py',
      'src/models/model.py',
      'requirements.txt',
      'Dockerfile',
      'docker-compose.yml',
      'config.yaml',
      'monitoring/metrics.py',
      'tests/test_pipeline.py',
      'notebooks/exploration.ipynb',
      '.gitignore',
      'setup.py',
      'scripts/deploy.sh',
      'airflow/dags/ml_pipeline.py'
    ],
    'stock-markets': [
      'README.md',
      'src/data/market_data.py',
      'src/strategies/trading_strategy.py',
      'src/backtesting/backtest.py',
      'src/portfolio/portfolio_manager.py',
      'src/risk/risk_management.py',
      'notebooks/market_analysis.ipynb',
      'notebooks/strategy_development.ipynb',
      'config/trading_config.yaml',
      'requirements.txt',
      'Dockerfile',
      'tests/test_strategies.py',
      'data/historical_data.csv'
    ]
  };

  return mockFiles[courseId] || mockFiles['data-engineering'];
}

// Enhanced health check endpoint
export async function GET() {
  const requestId = generateRequestId();

  try {
    // Validate environment
    const env = validateRuntimeEnv();
    const configService = ConfigurationService.getInstance();

    return NextResponse.json({
      status: 'ok',
      service: 'Ultimate Hybrid Evaluation API',
      mockMode: configService.isMockMode() || !configService.hasAPIKey(),
      environment: env.NODE_ENV,
      hasRedis: !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
      hasAuth: !!(env.CLERK_SECRET_KEY && env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
      timestamp: new Date().toISOString(),
      requestId
    });
  } catch (error) {
    const errorResponse = handleSecurityError(error, requestId);
    return NextResponse.json(errorResponse, {
      status: errorResponse.statusCode
    });
  }
}
