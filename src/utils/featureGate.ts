/**
 * Feature gate utilities for tracking and logging feature usage
 */

import { UserTier, FeatureUsage } from '@/types/tiers';
import { canAccessFeature } from './tierValidation';

/**
 * Track feature usage attempt
 * This would typically send data to an analytics service or backend
 */
export function trackFeatureUsage(usage: Omit<FeatureUsage, 'timestamp'>): void {
  const fullUsage: FeatureUsage = {
    ...usage,
    timestamp: new Date(),
  };
  
  // Log to console for debugging (in production, send to analytics service)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Feature Usage]', fullUsage);
  }
  
  // Store in localStorage for demo purposes
  if (typeof window !== 'undefined') {
    try {
      const existing = localStorage.getItem('featureUsageLog');
      const log = existing ? JSON.parse(existing) : [];
      log.push(fullUsage);
      
      // Keep only last 100 entries
      const trimmed = log.slice(-100);
      localStorage.setItem('featureUsageLog', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to track feature usage:', error);
    }
  }
}

/**
 * Get feature usage log
 */
export function getFeatureUsageLog(): FeatureUsage[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const existing = localStorage.getItem('featureUsageLog');
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error('Failed to get feature usage log:', error);
    return [];
  }
}

/**
 * Clear feature usage log
 */
export function clearFeatureUsageLog(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('featureUsageLog');
  }
}

/**
 * Get feature usage statistics
 */
export interface FeatureUsageStats {
  totalAttempts: number;
  successfulAttempts: number;
  blockedAttempts: number;
  mostUsedFeatures: Array<{ feature: string; count: number }>;
  blockedFeatures: Array<{ feature: string; count: number }>;
}

export function getFeatureUsageStats(userId?: string): FeatureUsageStats {
  const log = getFeatureUsageLog();
  const filtered = userId ? log.filter(entry => entry.userId === userId) : log;
  
  const stats: FeatureUsageStats = {
    totalAttempts: filtered.length,
    successfulAttempts: filtered.filter(e => e.success).length,
    blockedAttempts: filtered.filter(e => !e.success).length,
    mostUsedFeatures: [],
    blockedFeatures: [],
  };
  
  // Count feature usage
  const featureCounts = new Map<string, number>();
  const blockedCounts = new Map<string, number>();
  
  filtered.forEach(entry => {
    if (entry.success) {
      featureCounts.set(entry.feature, (featureCounts.get(entry.feature) || 0) + 1);
    } else {
      blockedCounts.set(entry.feature, (blockedCounts.get(entry.feature) || 0) + 1);
    }
  });
  
  // Convert to sorted arrays
  stats.mostUsedFeatures = Array.from(featureCounts.entries())
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  stats.blockedFeatures = Array.from(blockedCounts.entries())
    .map(([feature, count]) => ({ feature, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  return stats;
}

/**
 * Feature gate wrapper function
 * Checks access, tracks usage, and executes callback if allowed
 */
export function withFeatureGate<T>(
  feature: string,
  userId: string,
  userTier: UserTier,
  callback: () => T,
  onBlocked?: (reason: string) => void
): T | null {
  const featureKey = feature as any; // Type assertion for feature check
  const access = canAccessFeature(userTier, featureKey);
  
  if (access.allowed) {
    trackFeatureUsage({
      feature,
      userId,
      tier: userTier,
      success: true,
    });
    return callback();
  } else {
    trackFeatureUsage({
      feature,
      userId,
      tier: userTier,
      success: false,
      metadata: {
        reason: access.reason,
        requiredTier: access.requiredTier,
      },
    });
    
    if (onBlocked) {
      onBlocked(access.reason || 'Feature not available');
    }
    
    return null;
  }
}
