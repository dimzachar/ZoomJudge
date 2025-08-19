// Subscription tier types
export type UserTier = 'free' | 'starter' | 'pro' | 'enterprise'

// Feature permissions mapping
export const TIER_FEATURES = {
  'detailed-feedback': ['starter', 'pro', 'enterprise'],
  'performance-charts': ['starter', 'pro', 'enterprise'],
  'comparison-tools': ['pro', 'enterprise'],
  'custom-criteria': ['enterprise'],
  'api-access': ['pro', 'enterprise'],
  'priority-processing': ['pro', 'enterprise'],
  'team-collaboration': ['enterprise'],
  'export-pdf': ['starter', 'pro', 'enterprise'],
  'export-advanced': ['pro', 'enterprise'],
  'analytics-advanced': ['pro', 'enterprise'],
  'bulk-processing': ['enterprise'],
} as const

export type FeatureKey = keyof typeof TIER_FEATURES

// Tier limits
export const TIER_LIMITS = {
  free: {
    evaluationsPerMonth: 4,
    features: ['basic-score', 'basic-history'],
    description: '4 repository evaluations per month, Basic scoring (no analysis or feedback), One evaluation engine (no model options)'
  },
  starter: {
    evaluationsPerMonth: 5, // Beta testing limit - will increase later
    features: ['basic-score', 'detailed-feedback', 'basic-charts', 'export-pdf', 'email-notifications'],
    description: 'Full scoring + LLM feedback, [evaluation limit and other features to be specified]'
  },
  pro: {
    evaluationsPerMonth: 6, // Beta testing limit - will increase later
    features: ['all-starter', 'advanced-analytics', 'comparison-tools', 'priority-processing', 'api-access', 'team-support'],
    description: '[all Pro features including evaluation limits to be specified]'
  },
  enterprise: {
    evaluationsPerMonth: -1, // unlimited
    features: ['all-pro', 'team-collaboration', 'custom-criteria', 'bulk-processing', 'dedicated-support'],
    description: 'custom'
  }
} as const

/**
 * Check if a user tier has access to a specific feature
 */
export const canAccessFeature = (
  feature: FeatureKey,
  userTier: UserTier
): boolean => {
  const allowedTiers = TIER_FEATURES[feature] as readonly UserTier[]
  return allowedTiers?.includes(userTier) ?? false
}

/**
 * Get the minimum tier required for a feature
 */
export const getMinimumTierForFeature = (feature: FeatureKey): UserTier => {
  const allowedTiers = TIER_FEATURES[feature] as readonly UserTier[]
  if (!allowedTiers || allowedTiers.length === 0) return 'enterprise'

  const tierOrder: UserTier[] = ['free', 'starter', 'pro', 'enterprise']
  for (const tier of tierOrder) {
    if (allowedTiers.includes(tier)) {
      return tier
    }
  }
  return 'enterprise'
}

/**
 * Get tier display information
 */
export const getTierInfo = (tier: UserTier) => {
  const tierInfo = {
    free: {
      name: 'Free',
      price: '$0',
      color: 'gray',
      description: '4 repo evals/month only score'
    },
    starter: {
      name: 'Starter',
      price: '$12',
      color: 'blue',
      description: '5 repo evals/month + detailed feedback'
    },
    pro: {
      name: 'Pro',
      price: '$20',
      color: 'purple',
      description: '6 repo evals/month + team support'
    },
    enterprise: {
      name: 'Enterprise',
      price: 'Custom',
      color: 'gold',
      description: 'custom'
    }
  }

  return tierInfo[tier]
}

/**
 * Check if user has reached their monthly evaluation limit
 */
export const hasReachedEvaluationLimit = (
  currentUsage: number,
  userTier: UserTier
): boolean => {
  const limit = TIER_LIMITS[userTier].evaluationsPerMonth
  if (limit === -1) return false // unlimited
  return currentUsage >= limit
}

/**
 * Get usage percentage for current tier
 */
export const getUsagePercentage = (
  currentUsage: number,
  userTier: UserTier
): number => {
  const limit = TIER_LIMITS[userTier].evaluationsPerMonth
  if (limit === -1) return 0 // unlimited
  return Math.min((currentUsage / limit) * 100, 100)
}
