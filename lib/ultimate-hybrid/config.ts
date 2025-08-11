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
  MAX_FILES_PER_EVALUATION: 25,
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
  
  // Monitoring
  METRICS_COLLECTION_ENABLED: true,
  PERFORMANCE_LOGGING_ENABLED: true,
  ERROR_TRACKING_ENABLED: true
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
  }
} as const;

export type RepoType = keyof typeof REPO_TYPE_PATTERNS;
