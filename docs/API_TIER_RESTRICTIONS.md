# API Access Restrictions by Account Tier/Pricing Model

## Overview

This document outlines the architecture and implementation strategy for restricting API access based on account tiers or pricing models in the LinkToMe application. The implementation leverages the existing Role-Based Access Control (RBAC) system and extends it with tier-based restrictions.

## Current System Architecture

### Frontend (Next.js)
- **Authentication**: JWT tokens stored in HTTP-only cookies
- **Authorization**: Role and permission-based access control
- **API Client**: Centralized API utilities (`src/utils/api.ts`, `src/hooks/useApiQuery.ts`)
- **User Context**: Auth and RBAC context providers manage user state

### Backend (Azure Functions)
- **API Endpoints**: Exposed via `/api/*` routes
- **Authentication**: JWT validation from HTTP-only cookies
- **Authorization**: Role/permission validation per endpoint

## Proposed Architecture

### 1. Tier System Design

#### Account Tiers
Define account tiers with different feature and API access levels:

```typescript
// src/types/subscription.ts
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export interface TierLimits {
  // API Rate Limits
  apiCallsPerHour: number;
  apiCallsPerDay: number;
  
  // Feature Limits
  maxLinks: number;
  maxCustomDomains: number;
  analyticsRetentionDays: number;
  
  // Access Control
  allowedEndpoints: string[];
  allowedFeatures: string[];
  
  // Additional Restrictions
  allowBulkOperations: boolean;
  allowExportData: boolean;
  allowAdvancedAnalytics: boolean;
}

export interface UserSubscription {
  UserId: string;
  tier: SubscriptionTier;
  status: 'active' | 'suspended' | 'cancelled' | 'trial';
  startDate: string;
  endDate?: string;
  limits: TierLimits;
}
```

#### Tier Configuration
```typescript
// src/config/tiers.ts
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    apiCallsPerHour: 100,
    apiCallsPerDay: 1000,
    maxLinks: 5,
    maxCustomDomains: 0,
    analyticsRetentionDays: 7,
    allowedEndpoints: [
      'public/Profile',
      'public/Links',
      'auth/*',
      'user/Profile',
      'user/Links'
    ],
    allowedFeatures: ['basic_analytics', 'basic_customization'],
    allowBulkOperations: false,
    allowExportData: false,
    allowAdvancedAnalytics: false,
  },
  [SubscriptionTier.BASIC]: {
    apiCallsPerHour: 500,
    apiCallsPerDay: 5000,
    maxLinks: 25,
    maxCustomDomains: 1,
    analyticsRetentionDays: 30,
    allowedEndpoints: [
      'public/Profile',
      'public/Links',
      'auth/*',
      'user/*',
      'analytics/Basic'
    ],
    allowedFeatures: ['basic_analytics', 'advanced_customization', 'qr_codes'],
    allowBulkOperations: false,
    allowExportData: true,
    allowAdvancedAnalytics: false,
  },
  [SubscriptionTier.PRO]: {
    apiCallsPerHour: 2000,
    apiCallsPerDay: 20000,
    maxLinks: 100,
    maxCustomDomains: 5,
    analyticsRetentionDays: 365,
    allowedEndpoints: ['*'], // All endpoints
    allowedFeatures: ['*'], // All features
    allowBulkOperations: true,
    allowExportData: true,
    allowAdvancedAnalytics: true,
  },
  [SubscriptionTier.ENTERPRISE]: {
    apiCallsPerHour: -1, // Unlimited
    apiCallsPerDay: -1,
    maxLinks: -1,
    maxCustomDomains: -1,
    analyticsRetentionDays: -1,
    allowedEndpoints: ['*'],
    allowedFeatures: ['*'],
    allowBulkOperations: true,
    allowExportData: true,
    allowAdvancedAnalytics: true,
  },
};
```

### 2. Database Schema Changes

#### User Table Enhancement
```sql
-- Add subscription tier column to users table
ALTER TABLE Users ADD COLUMN subscriptionTier VARCHAR(50) DEFAULT 'free';
ALTER TABLE Users ADD COLUMN subscriptionStatus VARCHAR(50) DEFAULT 'active';
ALTER TABLE Users ADD COLUMN subscriptionStartDate DATETIME;
ALTER TABLE Users ADD COLUMN subscriptionEndDate DATETIME;
```

#### Subscription History Table
```sql
CREATE TABLE SubscriptionHistory (
  id VARCHAR(36) PRIMARY KEY,
  UserId VARCHAR(36) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  startDate DATETIME NOT NULL,
  endDate DATETIME,
  cancelledAt DATETIME,
  reason VARCHAR(255),
  created DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (UserId) REFERENCES Users(UserId)
);
```

#### API Usage Tracking Table
```sql
CREATE TABLE ApiUsage (
  id VARCHAR(36) PRIMARY KEY,
  UserId VARCHAR(36) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  responseStatus INT,
  responseTime INT,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  FOREIGN KEY (UserId) REFERENCES Users(UserId),
  INDEX idx_user_timestamp (UserId, timestamp),
  INDEX idx_timestamp (timestamp)
);

-- Create aggregated usage table for performance
CREATE TABLE ApiUsageHourly (
  id VARCHAR(36) PRIMARY KEY,
  UserId VARCHAR(36) NOT NULL,
  hour DATETIME NOT NULL,
  endpoint VARCHAR(255),
  callCount INT DEFAULT 0,
  avgResponseTime INT,
  errorCount INT DEFAULT 0,
  FOREIGN KEY (UserId) REFERENCES Users(UserId),
  UNIQUE KEY unique_user_hour_endpoint (UserId, hour, endpoint)
);
```

### 3. Backend Implementation

#### A. Middleware for Tier Validation

Create a middleware function to validate tier access for each API endpoint:

```typescript
// backend/middleware/tierValidation.ts
import { HttpRequest } from '@azure/functions';
import { TierLimits, SubscriptionTier, TIER_LIMITS } from '../config/tiers';

interface UserFromToken {
  UserId: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: string;
}

export interface TierValidationResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
  tier?: SubscriptionTier;
}

/**
 * Check if user's subscription tier allows access to the endpoint
 */
export async function validateTierAccess(
  user: UserFromToken,
  endpoint: string,
  method: string
): Promise<TierValidationResult> {
  // Check subscription status
  if (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'trial') {
    return {
      allowed: false,
      reason: 'Subscription is not active',
      tier: user.subscriptionTier,
    };
  }

  const tierLimits = TIER_LIMITS[user.subscriptionTier];
  
  // Check if endpoint is allowed for this tier
  const endpointAllowed = isEndpointAllowed(endpoint, tierLimits.allowedEndpoints);
  if (!endpointAllowed) {
    return {
      allowed: false,
      reason: `Endpoint '${endpoint}' is not available in your ${user.subscriptionTier} plan`,
      tier: user.subscriptionTier,
    };
  }

  // Check rate limits
  const rateLimitCheck = await checkRateLimit(user.UserId, tierLimits);
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck;
  }

  return { allowed: true, tier: user.subscriptionTier };
}

/**
 * Check if endpoint matches allowed patterns
 */
function isEndpointAllowed(endpoint: string, allowedEndpoints: string[]): boolean {
  // If wildcard is allowed, all endpoints are accessible
  if (allowedEndpoints.includes('*')) {
    return true;
  }

  return allowedEndpoints.some(pattern => {
    // Convert pattern to regex (support wildcards)
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(endpoint);
  });
}

/**
 * Check rate limits for the user
 */
async function checkRateLimit(
  userId: string,
  limits: TierLimits
): Promise<TierValidationResult> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get usage counts (from cache or database)
  const hourlyUsage = await getUsageCount(userId, oneHourAgo, now);
  const dailyUsage = await getUsageCount(userId, oneDayAgo, now);

  // Check hourly limit
  if (limits.apiCallsPerHour !== -1 && hourlyUsage >= limits.apiCallsPerHour) {
    return {
      allowed: false,
      reason: 'Hourly API rate limit exceeded',
      currentUsage: hourlyUsage,
      limit: limits.apiCallsPerHour,
    };
  }

  // Check daily limit
  if (limits.apiCallsPerDay !== -1 && dailyUsage >= limits.apiCallsPerDay) {
    return {
      allowed: false,
      reason: 'Daily API rate limit exceeded',
      currentUsage: dailyUsage,
      limit: limits.apiCallsPerDay,
    };
  }

  return { allowed: true };
}

/**
 * Get API usage count for user in time range
 * Should use Redis or in-memory cache for production
 */
async function getUsageCount(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<number> {
  // Implementation would query ApiUsage table or Redis cache
  // For performance, use Redis with sliding window counters
  // Example: ZCOUNT user:{userId}:calls {startTimestamp} {endTimestamp}
  
  // Placeholder implementation
  return 0;
}

/**
 * Record API usage
 */
export async function recordApiUsage(
  userId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Insert into database
  // Also increment Redis counters for rate limiting
  
  const timestamp = new Date();
  
  // Redis commands for sliding window rate limiting
  // ZADD user:{userId}:calls {timestamp} {timestamp}
  // ZREMRANGEBYSCORE user:{userId}:calls -inf {timestamp - 24 hours}
  // EXPIRE user:{userId}:calls 86400
}
```

#### B. HTTP Function Wrapper

Wrap all Azure Functions with tier validation:

```typescript
// backend/middleware/apiHandler.ts
import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { validateTierAccess, recordApiUsage } from './tierValidation';
import { verifyToken } from './auth';

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  bypassTierCheck?: boolean; // For auth endpoints
  customTierValidation?: (user: any) => Promise<boolean>;
}

/**
 * Wrapper for Azure Functions that adds tier validation
 */
export function withTierValidation(
  handler: AzureFunction,
  options: ApiHandlerOptions = {}
): AzureFunction {
  return async (context: Context, req: HttpRequest): Promise<void> => {
    const startTime = Date.now();
    const { requireAuth = true, bypassTierCheck = false } = options;

    try {
      // 1. Authenticate user (if required)
      let user = null;
      if (requireAuth) {
        user = await verifyToken(req);
        if (!user) {
          context.res = {
            status: 401,
            body: { error: 'Unauthorized' },
          };
          return;
        }
      }

      // 2. Validate tier access (if not bypassed)
      if (!bypassTierCheck && user) {
        const endpoint = context.bindingData.endpoint || req.url;
        const validation = await validateTierAccess(user, endpoint, req.method);
        
        if (!validation.allowed) {
          context.res = {
            status: 403,
            headers: {
              'X-RateLimit-Remaining': validation.limit 
                ? String(validation.limit - (validation.currentUsage || 0))
                : '0',
              'X-RateLimit-Limit': validation.limit ? String(validation.limit) : '0',
            },
            body: {
              error: validation.reason || 'Access denied',
              tier: validation.tier,
              currentUsage: validation.currentUsage,
              limit: validation.limit,
            },
          };
          return;
        }
      }

      // 3. Execute the actual handler
      await handler(context, req);

      // 4. Record API usage
      if (user) {
        const responseTime = Date.now() - startTime;
        await recordApiUsage(
          user.UserId,
          context.bindingData.endpoint || req.url,
          req.method,
          context.res?.status || 200,
          responseTime,
          req.headers['x-forwarded-for'] || req.headers['x-real-ip'],
          req.headers['user-agent']
        );
      }

    } catch (error) {
      context.log.error('Error in tier validation wrapper:', error);
      context.res = {
        status: 500,
        body: { error: 'Internal server error' },
      };
    }
  };
}
```

#### C. Example Function Implementation

```typescript
// backend/functions/GetLinks/index.ts
import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { withTierValidation } from '../../middleware/apiHandler';

const getLinksHandler: AzureFunction = async (
  context: Context,
  req: HttpRequest
): Promise<void> => {
  // Your existing business logic here
  const user = req.user; // Added by auth middleware
  
  // Fetch links from database
  const links = await fetchUserLinks(user.UserId);
  
  context.res = {
    status: 200,
    body: { links },
  };
};

// Export wrapped function
export default withTierValidation(getLinksHandler, {
  requireAuth: true,
  bypassTierCheck: false,
});
```

### 4. Frontend Changes

#### A. Update User Type

```typescript
// src/types/api.ts
import { SubscriptionTier } from './subscription';

export interface UserAuth {
  UserId: string;
  email: string;
  username: string;
  userRole: string;
  roles: string[];
  permissions: string[];
  userManagements: UserManagement[];
  // New subscription fields
  subscriptionTier?: SubscriptionTier;
  subscriptionStatus?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}
```

#### B. Tier-Aware API Error Handling

```typescript
// src/utils/api.ts
// Update error handling to detect tier restriction errors

const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const errorData = error.response?.data as ApiError | undefined;
    
    // Check for tier restriction (403 with tier info)
    if (error.response?.status === 403 && errorData?.tier) {
      const upgradeMessage = getUpgradeMessage(errorData);
      return upgradeMessage;
    }
    
    // Check for rate limit (429)
    if (error.response?.status === 429) {
      const limit = error.response.headers['x-ratelimit-limit'];
      return `Rate limit exceeded. Limit: ${limit} requests. Please upgrade your plan for higher limits.`;
    }
    
    if (errorData?.error) {
      return errorData.error;
    }
    
    return error.response?.statusText || error.message || 'An error occurred';
  }
  
  return 'An unknown error occurred';
};

function getUpgradeMessage(errorData: any): string {
  const tier = errorData.tier || 'current';
  const reason = errorData.reason || 'This feature is not available in your plan';
  return `${reason}. You are on the ${tier} plan. Please upgrade to access this feature.`;
}
```

#### C. Tier Display Component

```typescript
// src/components/TierBadge.tsx
import React from 'react';
import { Chip } from '@mui/material';
import { SubscriptionTier } from '@/types/subscription';

interface TierBadgeProps {
  tier: SubscriptionTier;
}

const TIER_COLORS: Record<SubscriptionTier, string> = {
  [SubscriptionTier.FREE]: 'default',
  [SubscriptionTier.BASIC]: 'primary',
  [SubscriptionTier.PRO]: 'secondary',
  [SubscriptionTier.ENTERPRISE]: 'warning',
};

export const TierBadge: React.FC<TierBadgeProps> = ({ tier }) => {
  return (
    <Chip
      label={tier.toUpperCase()}
      color={TIER_COLORS[tier] as any}
      size="small"
      sx={{ fontWeight: 'bold' }}
    />
  );
};
```

#### D. Feature Gating Hook

```typescript
// src/hooks/useTierAccess.ts
import { useAuthContext } from '@/providers/AuthProvider';
import { SubscriptionTier } from '@/types/subscription';

export interface TierAccessResult {
  hasAccess: boolean;
  currentTier: SubscriptionTier;
  requiredTier?: SubscriptionTier;
  message?: string;
}

export function useTierAccess(requiredTier: SubscriptionTier): TierAccessResult {
  const { user } = useAuthContext();
  
  const currentTier = user?.subscriptionTier || SubscriptionTier.FREE;
  
  const tierOrder = [
    SubscriptionTier.FREE,
    SubscriptionTier.BASIC,
    SubscriptionTier.PRO,
    SubscriptionTier.ENTERPRISE,
  ];
  
  const currentTierIndex = tierOrder.indexOf(currentTier);
  const requiredTierIndex = tierOrder.indexOf(requiredTier);
  
  const hasAccess = currentTierIndex >= requiredTierIndex;
  
  return {
    hasAccess,
    currentTier,
    requiredTier: hasAccess ? undefined : requiredTier,
    message: hasAccess
      ? undefined
      : `This feature requires ${requiredTier} plan or higher`,
  };
}
```

#### E. Usage Dashboard Component

```typescript
// src/components/UsageDashboard.tsx
import React from 'react';
import { Box, Typography, LinearProgress, Card, CardContent } from '@mui/material';
import { useApiGet } from '@/hooks/useApiQuery';

interface UsageData {
  hourlyUsage: number;
  hourlyLimit: number;
  dailyUsage: number;
  dailyLimit: number;
  tier: string;
}

export const UsageDashboard: React.FC = () => {
  const { data, isLoading } = useApiGet<UsageData>({
    url: 'user/Usage',
    queryKey: 'userUsage',
  });

  if (isLoading || !data) {
    return <Typography>Loading usage data...</Typography>;
  }

  const hourlyPercentage = (data.hourlyUsage / data.hourlyLimit) * 100;
  const dailyPercentage = (data.dailyUsage / data.dailyLimit) * 100;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          API Usage - {data.tier} Plan
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Hourly Usage</Typography>
            <Typography variant="body2">
              {data.hourlyUsage} / {data.hourlyLimit}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(hourlyPercentage, 100)}
            color={hourlyPercentage > 90 ? 'error' : 'primary'}
          />
        </Box>

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Daily Usage</Typography>
            <Typography variant="body2">
              {data.dailyUsage} / {data.dailyLimit}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(dailyPercentage, 100)}
            color={dailyPercentage > 90 ? 'error' : 'primary'}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
```

### 5. Rate Limiting Implementation

#### Using Redis for Rate Limiting

```typescript
// backend/utils/rateLimiter.ts
import { createClient, RedisClientType } from 'redis';

class RateLimiter {
  private client: RedisClientType;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL,
    });
    this.client.connect();
  }

  /**
   * Sliding window rate limiter
   */
  async checkRateLimit(
    userId: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const key = `ratelimit:${userId}`;

    // Remove old entries
    await this.client.zRemRangeByScore(key, '-inf', windowStart);

    // Count requests in current window
    const count = await this.client.zCard(key);

    if (count >= maxRequests) {
      // Get the oldest timestamp to calculate reset time
      const oldest = await this.client.zRange(key, 0, 0, { withScores: true });
      const resetAt = new Date(oldest[0].score + windowMs);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add current request
    await this.client.zAdd(key, { score: now, value: `${now}` });
    await this.client.expire(key, Math.ceil(windowMs / 1000));

    return {
      allowed: true,
      remaining: maxRequests - count - 1,
      resetAt: new Date(now + windowMs),
    };
  }

  /**
   * Token bucket rate limiter (alternative approach)
   */
  async checkTokenBucket(
    userId: string,
    maxTokens: number,
    refillRate: number, // tokens per second
    cost: number = 1
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `bucket:${userId}`;
    const now = Date.now() / 1000;

    const bucket = await this.client.get(key);
    let tokens: number;
    let lastRefill: number;

    if (bucket) {
      const [tokensStr, lastRefillStr] = bucket.split(':');
      tokens = parseFloat(tokensStr);
      lastRefill = parseFloat(lastRefillStr);

      // Refill tokens based on time passed
      const timePassed = now - lastRefill;
      const tokensToAdd = timePassed * refillRate;
      tokens = Math.min(maxTokens, tokens + tokensToAdd);
    } else {
      tokens = maxTokens;
      lastRefill = now;
    }

    if (tokens >= cost) {
      tokens -= cost;
      await this.client.set(key, `${tokens}:${now}`, { EX: 3600 });
      return { allowed: true, remaining: Math.floor(tokens) };
    }

    return { allowed: false, remaining: 0 };
  }
}

export const rateLimiter = new RateLimiter();
```

### 6. Admin Interface for Tier Management

```typescript
// src/pages/admin/subscriptions.tsx
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  MenuItem,
  Select,
} from '@mui/material';
import { useApiGet, useApiPut } from '@/hooks/useApiQuery';
import { SubscriptionTier } from '@/types/subscription';

interface User {
  UserId: string;
  username: string;
  email: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: string;
}

export default function SubscriptionsPage() {
  const { data: users, refetch } = useApiGet<{ users: User[] }>({
    url: 'admin/Users',
    queryKey: 'adminUsers',
  });

  const updateMutation = useApiPut({
    relatedQueryKeys: ['adminUsers'],
  });

  const handleTierChange = async (userId: string, newTier: SubscriptionTier) => {
    await updateMutation.mutateAsync({
      url: `admin/Users/${userId}/Subscription`,
      data: { tier: newTier },
    });
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          User Subscriptions
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users?.users.map((user) => (
              <TableRow key={user.UserId}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.subscriptionTier}
                    onChange={(e) =>
                      handleTierChange(user.UserId, e.target.value as SubscriptionTier)
                    }
                    size="small"
                  >
                    <MenuItem value={SubscriptionTier.FREE}>Free</MenuItem>
                    <MenuItem value={SubscriptionTier.BASIC}>Basic</MenuItem>
                    <MenuItem value={SubscriptionTier.PRO}>Pro</MenuItem>
                    <MenuItem value={SubscriptionTier.ENTERPRISE}>Enterprise</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>{user.subscriptionStatus}</TableCell>
                <TableCell>
                  <Button size="small">View Usage</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Container>
  );
}
```

## Implementation Phases

### Phase 1: Database & Backend Foundation (Week 1-2)
1. Add subscription fields to Users table
2. Create SubscriptionHistory and ApiUsage tables
3. Set up Redis for rate limiting
4. Implement tier configuration
5. Create tier validation middleware

### Phase 2: Backend API Integration (Week 2-3)
1. Wrap all Azure Functions with tier validation
2. Implement rate limiting logic
3. Create usage tracking system
4. Add admin APIs for tier management
5. Add user APIs for usage retrieval

### Phase 3: Frontend Integration (Week 3-4)
1. Update user types to include subscription data
2. Implement tier-aware error handling
3. Create usage dashboard component
4. Add tier badges and UI indicators
5. Implement feature gating hooks

### Phase 4: Testing & Documentation (Week 4-5)
1. Unit tests for tier validation
2. Integration tests for rate limiting
3. Load testing for Redis performance
4. API documentation updates
5. User-facing documentation

### Phase 5: Monitoring & Analytics (Week 5-6)
1. Set up usage analytics dashboard
2. Implement alerting for rate limit violations
3. Create reports for tier upgrade opportunities
4. Monitor API performance impact
5. Gather user feedback

## Testing Strategy

### Unit Tests
```typescript
// backend/tests/tierValidation.test.ts
import { validateTierAccess } from '../middleware/tierValidation';
import { SubscriptionTier } from '../config/tiers';

describe('Tier Validation', () => {
  it('should allow access for free tier to public endpoints', async () => {
    const user = {
      UserId: '123',
      email: 'test@example.com',
      subscriptionTier: SubscriptionTier.FREE,
      subscriptionStatus: 'active',
    };

    const result = await validateTierAccess(user, 'public/Profile', 'GET');
    expect(result.allowed).toBe(true);
  });

  it('should deny access for free tier to pro endpoints', async () => {
    const user = {
      UserId: '123',
      email: 'test@example.com',
      subscriptionTier: SubscriptionTier.FREE,
      subscriptionStatus: 'active',
    };

    const result = await validateTierAccess(user, 'analytics/Advanced', 'GET');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not available');
  });

  it('should enforce rate limits', async () => {
    // Simulate exceeding rate limit
    const user = {
      UserId: '123',
      email: 'test@example.com',
      subscriptionTier: SubscriptionTier.FREE,
      subscriptionStatus: 'active',
    };

    // Make 101 requests (free tier limit is 100/hour)
    for (let i = 0; i < 101; i++) {
      const result = await validateTierAccess(user, 'user/Links', 'GET');
      if (i < 100) {
        expect(result.allowed).toBe(true);
      } else {
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('rate limit exceeded');
      }
    }
  });
});
```

### Integration Tests
```typescript
// backend/tests/integration/tierAccess.test.ts
import { testRequest } from './helpers';

describe('Tier Access Integration', () => {
  it('should return 403 for tier-restricted endpoint', async () => {
    const response = await testRequest
      .get('/api/analytics/Advanced')
      .auth('free-tier-token', { type: 'bearer' });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('not available');
    expect(response.body.tier).toBe('free');
  });

  it('should return 429 for rate limit exceeded', async () => {
    // Make 101 requests rapidly
    for (let i = 0; i < 101; i++) {
      const response = await testRequest
        .get('/api/user/Links')
        .auth('free-tier-token', { type: 'bearer' });

      if (i >= 100) {
        expect(response.status).toBe(429);
        expect(response.headers['x-ratelimit-remaining']).toBe('0');
      }
    }
  });
});
```

## Monitoring & Observability

### Metrics to Track
1. **API Usage by Tier**: Track request volume per tier
2. **Rate Limit Hits**: Monitor how often users hit limits
3. **Tier Upgrade Triggers**: Track which restrictions lead to upgrades
4. **Performance Impact**: Measure latency added by tier checks
5. **Redis Performance**: Monitor cache hit rates and latency

### Alerting Rules
1. Alert when rate limiter fails (fallback to allowing requests)
2. Alert on high rate of 403/429 responses
3. Alert when Redis connection fails
4. Alert on unusually high API usage patterns

### Logging
```typescript
// Log tier restrictions for analytics
logger.info('Tier access denied', {
  userId: user.UserId,
  tier: user.subscriptionTier,
  endpoint: endpoint,
  reason: validation.reason,
  timestamp: new Date(),
});

// Log rate limit hits
logger.warn('Rate limit exceeded', {
  userId: user.UserId,
  tier: user.subscriptionTier,
  currentUsage: validation.currentUsage,
  limit: validation.limit,
  window: 'hourly',
});
```

## Security Considerations

### 1. Token Security
- Never expose tier information in client-accessible tokens
- Validate tier server-side on every request
- Use signed JWTs to prevent tampering

### 2. Rate Limit Bypass Prevention
- Implement distributed rate limiting (Redis)
- Use user ID from authenticated token, not client input
- Monitor for suspicious patterns (rapid account creation)

### 3. API Key Management (Optional)
For programmatic access:
```typescript
interface ApiKey {
  keyId: string;
  userId: string;
  hashedKey: string;
  tier: SubscriptionTier;
  scopes: string[];
  rateLimit: number;
  createdAt: Date;
  expiresAt?: Date;
}
```

## Pricing Model Integration

### Stripe Integration Example
```typescript
// backend/services/stripeService.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createCheckoutSession(
  userId: string,
  tier: SubscriptionTier
): Promise<string> {
  const priceId = getTierPriceId(tier);
  
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.APP_URL}/subscription/success`,
    cancel_url: `${process.env.APP_URL}/subscription/cancel`,
    metadata: { userId, tier },
  });

  return session.url;
}

export async function handleWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCancel(event.data.object);
      break;
  }
}
```

## Conclusion

This architecture provides a comprehensive foundation for implementing API tier restrictions in the LinkToMe application. The design:

1. **Leverages existing RBAC**: Extends current permission system
2. **Scalable**: Redis-based rate limiting handles high traffic
3. **Flexible**: Easy to add new tiers and modify limits
4. **Observable**: Comprehensive logging and monitoring
5. **User-friendly**: Clear error messages and usage visibility

The implementation can be done incrementally, starting with backend foundation and progressively adding frontend features and monitoring capabilities.

## Next Steps

1. Review this document with stakeholders
2. Decide on specific tier limits and pricing
3. Choose payment processor (Stripe, PayPal, etc.)
4. Set up development environment (Redis, test database)
5. Begin Phase 1 implementation
6. Create detailed API documentation
7. Design upgrade flow UI/UX
