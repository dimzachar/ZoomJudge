/**
 * Configuration for Ultimate Hybrid Architecture
 */

export const HYBRID_CONFIG = {
  // Performance thresholds
  CACHE_SIMILARITY_THRESHOLD: 0.85,
  FINGERPRINT_CONFIDENCE_THRESHOLD: 0.8,
  MAX_PROCESSING_TIME_MS: 10000,

  // Cache settings
  CACHE_TTL_HOURS: 24,
  MAX_CACHE_ENTRIES: 1000,

  // File selection limits
  MAX_FILES_PER_EVALUATION: 50,
  MIN_FILES_PER_EVALUATION: 5,

  // AI settings
  AI_SELECTION_TIMEOUT_MS: 5000,
  AI_FALLBACK_ENABLED: true,

  // Benchmarking
  BENCHMARK_SAMPLE_SIZE: 20,
  ACCURACY_IMPROVEMENT_TARGET: 0.15, // 15%
  SPEED_IMPROVEMENT_TARGET: 0.6,     // 60% faster
  TOKEN_REDUCTION_TARGET: 0.6,       // 60% reduction

  // Feature flags
  ENABLE_INTELLIGENT_CACHING: true,
  ENABLE_AI_GUIDED_SELECTION: true,
  ENABLE_REPOSITORY_FINGERPRINTING: true,
  ENABLE_AI_VALIDATION: true,

  // Monitoring
  METRICS_COLLECTION_ENABLED: true,
  PERFORMANCE_LOGGING_ENABLED: true,
  ERROR_TRACKING_ENABLED: true
} as const;

// AI Model Configurations
export const AI_MODEL_CONFIGS = {
  // File Selection Model - Fast and cheap for file selection decisions
  FILE_SELECTION: {
    model: 'qwen/qwen-2.5-coder-32b-instruct',
    maxTokens: 2000,
    temperature: 0.1,
    purpose: 'file_selection',
    costTier: 'low',
    description: 'Fast, cost-effective model for intelligent file selection'
  },

  // Alternative file selection models
  FILE_SELECTION_ALTERNATIVES: [
    {
      model: 'anthropic/claude-3-haiku',
      maxTokens: 2000,
      temperature: 0.1,
      purpose: 'file_selection',
      costTier: 'low',
      description: 'Claude Haiku - fast and efficient for file selection'
    },
    {
      model: 'openai/gpt-4o-mini',
      maxTokens: 2000,
      temperature: 0.1,
      purpose: 'file_selection',
      costTier: 'low',
      description: 'GPT-4o Mini - cost-effective for file selection'
    },
    {
      model: 'google/gemini-flash-1.5',
      maxTokens: 2000,
      temperature: 0.1,
      purpose: 'file_selection',
      costTier: 'low',
      description: 'Gemini Flash - fast for file selection tasks'
    }
  ],

  // Evaluation Model - High quality for final evaluation
  EVALUATION: {
    model: 'z-ai/glm-4.5-air:free',
    maxTokens: 16000,
    temperature: 0.1,
    purpose: 'evaluation',
    costTier: 'high',
    description: 'High-quality model for detailed repository evaluation'
  },

  // Alternative evaluation models for fallback
  EVALUATION_ALTERNATIVES: [
    {
      model: 'anthropic/claude-sonnet-4',
      maxTokens: 16000,
      temperature: 0.1,
      purpose: 'evaluation',
      costTier: 'free',
      description: 'Free backup model for evaluation when primary fails'
    },
    {
      model: 'qwen/qwen-2.5-coder-32b-instruct',
      maxTokens: 16000,
      temperature: 0.1,
      purpose: 'evaluation',
      costTier: 'high',
      description: 'High-quality Claude model as secondary backup'
    }
  ]
} as const;

export const REPO_TYPE_PATTERNS = {
  'mlops-project': {
    indicators: [
      /pipeline/i,
      /model/i,
      /train/i,
      /deploy/i,
      /mlflow/i,
      /kubeflow/i
    ],
    required: [
      'requirements.txt',
      /.*\.py$/
    ],
    directories: [
      'src/pipeline',
      'pipeline',
      'ml_pipeline',
      'workflows',
      'models'
    ]
  },
  'data-engineering': {
    indicators: [
      /dbt/i,
      /terraform/i,
      /orchestration/i,
      /airflow/i,
      /prefect/i,
      /dagster/i
    ],
    required: [
      /\.(sql|tf|yml|yaml)$/
    ],
    directories: [
      'dbt',
      'terraform',
      'orchestration',
      'dags',
      'processing'
    ]
  },
  'llm-project': {
    indicators: [
      /rag/i,
      /backend/i,
      /ingest/i,
      /prep/i,
      /embedding/i,
      /vector/i,
      /llm/i
    ],
    required: [
      /backend/i,
      /\.py$/
    ],
    directories: [
      'backend',
      'rag',
      'ingest',
      'prep',
      'api'
    ]
  },
  'machine-learning': {
    indicators: [
      /train/i,
      /model/i,
      /predict/i,
      /ml/i,
      /machine.learning/i,
      /sklearn/i,
      /tensorflow/i,
      /pytorch/i
    ],
    required: [
      /\.py$/,
      /\.ipynb$/
    ],
    directories: [
      'src',
      'models',
      'notebooks',
      'data',
      'scripts'
    ]
  },
  'stock-markets': {
    indicators: [
      /stock/i,
      /trading/i,
      /market/i,
      /portfolio/i,
      /backtesting/i,
      /strategy/i,
      /finance/i
    ],
    required: [
      /\.py$/
    ],
    directories: [
      'src',
      'strategies',
      'backtesting',
      'portfolio',
      'data'
    ]
  }
} as const;

export type RepoType = keyof typeof REPO_TYPE_PATTERNS;
