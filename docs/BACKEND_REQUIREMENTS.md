# Backend Requirements for API Tier Restrictions

## Overview
This document outlines the specific backend requirements for implementing API access restrictions based on account tiers in the LinkToMe application. It complements the main architecture document with detailed backend implementation requirements.

## Backend Technology Stack
- **Platform**: Azure Functions (Serverless)
- **Runtime**: Node.js / TypeScript
- **Database**: SQL Database (Azure SQL or similar)
- **Cache/Rate Limiting**: Redis (Azure Cache for Redis)
- **Authentication**: JWT tokens in HTTP-only cookies

## Database Changes Required

### 1. User Table Modifications
```sql
-- Add subscription-related columns to existing Users table
ALTER TABLE Users 
ADD subscriptionTier VARCHAR(50) DEFAULT 'free' NOT NULL,
ADD subscriptionStatus VARCHAR(50) DEFAULT 'active' NOT NULL,
ADD subscriptionStartDate DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD subscriptionEndDate DATETIME NULL,
ADD trialEndDate DATETIME NULL;

-- Add index for subscription queries
CREATE INDEX idx_users_subscription ON Users(subscriptionTier, subscriptionStatus);
```

### 2. New Tables to Create

#### Subscription History Table
Track all subscription changes for audit and analytics:
```sql
CREATE TABLE SubscriptionHistory (
  id VARCHAR(36) PRIMARY KEY DEFAULT (NEWID()),
  UserId VARCHAR(36) NOT NULL,
  previousTier VARCHAR(50),
  newTier VARCHAR(50) NOT NULL,
  previousStatus VARCHAR(50),
  newStatus VARCHAR(50) NOT NULL,
  changeReason VARCHAR(255),
  changedBy VARCHAR(36), -- Admin UserId if manual change
  startDate DATETIME NOT NULL,
  endDate DATETIME NULL,
  created DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (UserId) REFERENCES Users(UserId),
  INDEX idx_history_user (UserId),
  INDEX idx_history_date (created)
);
```

#### API Usage Tracking Table
Track all API calls for rate limiting and analytics:
```sql
CREATE TABLE ApiUsage (
  id VARCHAR(36) PRIMARY KEY DEFAULT (NEWID()),
  UserId VARCHAR(36) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  httpMethod VARCHAR(10) NOT NULL,
  statusCode INT NOT NULL,
  responseTime INT, -- milliseconds
  ipAddress VARCHAR(45),
  userAgent VARCHAR(500),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (UserId) REFERENCES Users(UserId),
  INDEX idx_usage_user_time (UserId, timestamp),
  INDEX idx_usage_timestamp (timestamp)
);

-- Optional: Partition this table by month for better performance
-- CREATE PARTITION FUNCTION PF_ApiUsage_Monthly (DATETIME)
-- AS RANGE RIGHT FOR VALUES (...monthly boundaries...);
```

#### API Usage Aggregates (for performance)
Pre-aggregated data to avoid scanning the entire ApiUsage table:
```sql
CREATE TABLE ApiUsageHourly (
  id VARCHAR(36) PRIMARY KEY DEFAULT (NEWID()),
  UserId VARCHAR(36) NOT NULL,
  hourTimestamp DATETIME NOT NULL, -- Rounded to hour
  endpoint VARCHAR(255),
  callCount INT DEFAULT 0,
  errorCount INT DEFAULT 0,
  avgResponseTime INT,
  maxResponseTime INT,
  FOREIGN KEY (UserId) REFERENCES Users(UserId),
  UNIQUE KEY unique_user_hour_endpoint (UserId, hourTimestamp, endpoint),
  INDEX idx_hourly_user_time (UserId, hourTimestamp)
);

-- Daily aggregates for dashboard
CREATE TABLE ApiUsageDaily (
  id VARCHAR(36) PRIMARY KEY DEFAULT (NEWID()),
  UserId VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  totalCalls INT DEFAULT 0,
  totalErrors INT DEFAULT 0,
  avgResponseTime INT,
  uniqueEndpoints INT,
  FOREIGN KEY (UserId) REFERENCES Users(UserId),
  UNIQUE KEY unique_user_date (UserId, date),
  INDEX idx_daily_user_date (UserId, date)
);
```

#### Rate Limit Violations Log
Track when users hit rate limits for analysis:
```sql
CREATE TABLE RateLimitViolations (
  id VARCHAR(36) PRIMARY KEY DEFAULT (NEWID()),
  UserId VARCHAR(36) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  limitType VARCHAR(50) NOT NULL, -- 'hourly' or 'daily'
  limitValue INT NOT NULL,
  actualValue INT NOT NULL,
  endpoint VARCHAR(255),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (UserId) REFERENCES Users(UserId),
  INDEX idx_violations_user (UserId),
  INDEX idx_violations_time (timestamp)
);
```

## Redis Schema Design

### Rate Limiting Keys

#### Sliding Window Counter (Recommended)
```
Key Pattern: ratelimit:{userId}:hourly
Type: Sorted Set (ZSET)
Value: timestamp as both score and member
TTL: 1 hour (3600 seconds)

Key Pattern: ratelimit:{userId}:daily  
Type: Sorted Set (ZSET)
Value: timestamp as both score and member
TTL: 24 hours (86400 seconds)

Commands:
- ZADD ratelimit:{userId}:hourly {timestamp} {timestamp}
- ZREMRANGEBYSCORE ratelimit:{userId}:hourly 0 {timestamp - 1 hour}
- ZCARD ratelimit:{userId}:hourly
- EXPIRE ratelimit:{userId}:hourly 3600
```

#### Token Bucket (Alternative)
```
Key Pattern: bucket:{userId}
Type: String
Value: "{tokens}:{lastRefill}"
TTL: 1 hour

Commands:
- GET bucket:{userId}
- SET bucket:{userId} "{newTokens}:{timestamp}" EX 3600
```

### User Tier Cache
```
Key Pattern: user:{userId}:tier
Type: String
Value: JSON encoded tier info
TTL: 5 minutes (300 seconds)

Example Value:
{
  "tier": "free",
  "status": "active",
  "limits": {
    "apiCallsPerHour": 100,
    "apiCallsPerDay": 1000
  }
}
```

## Backend API Endpoints to Create

### User-Facing Endpoints

#### Get Current Usage
```
GET /api/user/Usage
Response:
{
  "tier": "free",
  "status": "active",
  "usage": {
    "hourly": {
      "current": 45,
      "limit": 100,
      "remaining": 55,
      "resetAt": "2024-01-15T15:00:00Z"
    },
    "daily": {
      "current": 234,
      "limit": 1000,
      "remaining": 766,
      "resetAt": "2024-01-16T00:00:00Z"
    }
  },
  "features": {
    "maxLinks": 5,
    "maxCustomDomains": 0,
    "analyticsRetentionDays": 7
  }
}
```

#### Get Usage History
```
GET /api/user/UsageHistory?days=30
Response:
{
  "history": [
    {
      "date": "2024-01-15",
      "calls": 523,
      "errors": 2,
      "avgResponseTime": 145
    },
    ...
  ]
}
```

#### Get Subscription Details
```
GET /api/user/Subscription
Response:
{
  "tier": "free",
  "status": "active",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": null,
  "trialEndDate": null,
  "limits": {
    "apiCallsPerHour": 100,
    "apiCallsPerDay": 1000,
    "maxLinks": 5,
    "maxCustomDomains": 0
  }
}
```

#### Upgrade Subscription (Stripe Integration)
```
POST /api/user/Subscription/Upgrade
Body: {
  "tier": "basic"
}
Response:
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_..."
}
```

### Admin Endpoints

#### List All Users with Subscription Info
```
GET /api/admin/Subscriptions
Query Parameters:
  - tier: Filter by tier (optional)
  - status: Filter by status (optional)
  - page: Page number (optional)
  - pageSize: Items per page (optional)

Response:
{
  "users": [
    {
      "UserId": "123",
      "username": "john",
      "email": "john@example.com",
      "tier": "free",
      "status": "active",
      "startDate": "2024-01-01T00:00:00Z",
      "usage": {
        "dailyCalls": 234,
        "dailyLimit": 1000
      }
    },
    ...
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150
  }
}
```

#### Update User Subscription
```
PUT /api/admin/Users/{userId}/Subscription
Body: {
  "tier": "pro",
  "status": "active",
  "reason": "Manual upgrade by admin"
}
Response:
{
  "success": true,
  "subscription": {
    "tier": "pro",
    "status": "active",
    "startDate": "2024-01-15T10:30:00Z"
  }
}
```

#### Get User Usage Details
```
GET /api/admin/Users/{userId}/Usage?days=30
Response:
{
  "user": {
    "UserId": "123",
    "username": "john",
    "tier": "free"
  },
  "currentUsage": {
    "hourly": 45,
    "daily": 234
  },
  "history": [...],
  "topEndpoints": [
    { "endpoint": "user/Links", "count": 150 },
    { "endpoint": "user/Profile", "count": 84 }
  ],
  "violations": [
    {
      "timestamp": "2024-01-14T14:30:00Z",
      "limitType": "hourly",
      "limit": 100,
      "actual": 101
    }
  ]
}
```

#### Get System-Wide Usage Analytics
```
GET /api/admin/Analytics/Usage
Query Parameters:
  - startDate: Start date (ISO 8601)
  - endDate: End date (ISO 8601)
  - groupBy: 'tier' | 'day' | 'endpoint'

Response:
{
  "summary": {
    "totalCalls": 1500000,
    "totalUsers": 5000,
    "avgCallsPerUser": 300
  },
  "byTier": {
    "free": { "users": 4500, "calls": 450000 },
    "basic": { "users": 400, "calls": 200000 },
    "pro": { "users": 90, "calls": 720000 },
    "enterprise": { "users": 10, "calls": 130000 }
  },
  "topEndpoints": [...],
  "rateLimitViolations": 1250
}
```

## Core Backend Functions to Implement

### 1. Tier Validation Middleware
```typescript
// middleware/tierValidation.ts

export interface TierValidationOptions {
  bypassForEndpoints?: string[]; // e.g., ['auth/*', 'public/*']
  customLimitMultiplier?: number; // For special cases
}

export async function validateTierAccess(
  user: AuthenticatedUser,
  endpoint: string,
  method: string,
  options?: TierValidationOptions
): Promise<TierValidationResult> {
  // 1. Check if endpoint bypasses tier check
  if (shouldBypass(endpoint, options?.bypassForEndpoints)) {
    return { allowed: true };
  }

  // 2. Get user's tier limits (from cache or DB)
  const tierInfo = await getUserTierInfo(user.UserId);
  
  // 3. Check subscription status
  if (!isSubscriptionActive(tierInfo)) {
    return {
      allowed: false,
      statusCode: 403,
      reason: 'Subscription is not active'
    };
  }

  // 4. Check endpoint access
  if (!isEndpointAllowed(endpoint, tierInfo.allowedEndpoints)) {
    return {
      allowed: false,
      statusCode: 403,
      reason: `Endpoint not available in ${tierInfo.tier} plan`
    };
  }

  // 5. Check rate limits
  const rateLimitResult = await checkRateLimit(
    user.UserId,
    tierInfo,
    options?.customLimitMultiplier
  );
  
  if (!rateLimitResult.allowed) {
    // Log violation
    await logRateLimitViolation(user.UserId, tierInfo, endpoint);
    
    return {
      allowed: false,
      statusCode: 429,
      reason: rateLimitResult.reason,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit,
        'X-RateLimit-Remaining': rateLimitResult.remaining,
        'X-RateLimit-Reset': rateLimitResult.resetAt
      }
    };
  }

  return { allowed: true };
}
```

### 2. Rate Limiting Service
```typescript
// services/rateLimitService.ts

export class RateLimitService {
  private redis: RedisClient;

  /**
   * Check if user has exceeded rate limit using sliding window
   */
  async checkSlidingWindow(
    userId: string,
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitCheckResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const key = this.getWindowKey(userId, windowMs);

    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    
    // Count current entries
    pipeline.zcard(key);
    
    // Add current request timestamp
    pipeline.zadd(key, now, now);
    
    // Set expiration
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    const count = results[1][1] as number; // Count before adding

    if (count >= maxRequests) {
      // Get oldest entry to calculate reset time
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = new Date(parseInt(oldest[1]) + windowMs);
      
      return {
        allowed: false,
        remaining: 0,
        limit: maxRequests,
        resetAt
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - count - 1,
      limit: maxRequests,
      resetAt: new Date(now + windowMs)
    };
  }

  /**
   * Increment usage counter for a user
   */
  async incrementUsage(userId: string): Promise<void> {
    const now = Date.now();
    
    // Increment both hourly and daily counters
    await Promise.all([
      this.redis.zadd(this.getWindowKey(userId, HOUR_MS), now, now),
      this.redis.zadd(this.getWindowKey(userId, DAY_MS), now, now)
    ]);
  }

  /**
   * Get current usage for a user
   */
  async getCurrentUsage(
    userId: string
  ): Promise<{ hourly: number; daily: number }> {
    const now = Date.now();
    const hourAgo = now - HOUR_MS;
    const dayAgo = now - DAY_MS;

    const [hourly, daily] = await Promise.all([
      this.redis.zcount(
        this.getWindowKey(userId, HOUR_MS),
        hourAgo,
        '+inf'
      ),
      this.redis.zcount(
        this.getWindowKey(userId, DAY_MS),
        dayAgo,
        '+inf'
      )
    ]);

    return { hourly, daily };
  }

  private getWindowKey(userId: string, windowMs: number): string {
    const window = windowMs === HOUR_MS ? 'hourly' : 'daily';
    return `ratelimit:${userId}:${window}`;
  }
}
```

### 3. Usage Tracking Service
```typescript
// services/usageTrackingService.ts

export class UsageTrackingService {
  /**
   * Record API call for tracking and analytics
   */
  async recordApiCall(data: {
    userId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    // Insert into ApiUsage table (async, don't block response)
    this.insertUsageRecord(data).catch(err => {
      logger.error('Failed to record API usage', err);
    });

    // Update Redis counters
    await this.rateLimitService.incrementUsage(data.userId);

    // Update hourly aggregates (can be done async)
    this.updateHourlyAggregates(data).catch(err => {
      logger.error('Failed to update hourly aggregates', err);
    });
  }

  /**
   * Insert usage record into database
   */
  private async insertUsageRecord(data: any): Promise<void> {
    const query = `
      INSERT INTO ApiUsage 
      (id, UserId, endpoint, httpMethod, statusCode, responseTime, ipAddress, userAgent, timestamp)
      VALUES (@id, @userId, @endpoint, @method, @statusCode, @responseTime, @ipAddress, @userAgent, @timestamp)
    `;

    await this.db.execute(query, {
      id: generateUUID(),
      userId: data.userId,
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      responseTime: data.responseTime,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: new Date()
    });
  }

  /**
   * Update hourly aggregates for dashboard queries
   */
  private async updateHourlyAggregates(data: any): Promise<void> {
    const hourTimestamp = this.roundToHour(new Date());
    
    const query = `
      MERGE INTO ApiUsageHourly AS target
      USING (VALUES (@userId, @hourTimestamp, @endpoint)) AS source (UserId, hourTimestamp, endpoint)
      ON target.UserId = source.UserId 
         AND target.hourTimestamp = source.hourTimestamp 
         AND target.endpoint = source.endpoint
      WHEN MATCHED THEN
        UPDATE SET 
          callCount = target.callCount + 1,
          errorCount = target.errorCount + CASE WHEN @statusCode >= 400 THEN 1 ELSE 0 END,
          avgResponseTime = (target.avgResponseTime * target.callCount + @responseTime) / (target.callCount + 1),
          maxResponseTime = CASE WHEN @responseTime > target.maxResponseTime THEN @responseTime ELSE target.maxResponseTime END
      WHEN NOT MATCHED THEN
        INSERT (id, UserId, hourTimestamp, endpoint, callCount, errorCount, avgResponseTime, maxResponseTime)
        VALUES (NEWID(), @userId, @hourTimestamp, @endpoint, 1, CASE WHEN @statusCode >= 400 THEN 1 ELSE 0 END, @responseTime, @responseTime);
    `;

    await this.db.execute(query, {
      userId: data.userId,
      hourTimestamp: hourTimestamp,
      endpoint: data.endpoint,
      statusCode: data.statusCode,
      responseTime: data.responseTime
    });
  }

  /**
   * Get usage statistics for a user
   */
  async getUserUsageStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UsageStats> {
    // Query aggregated data for performance
    const query = `
      SELECT 
        CAST(hourTimestamp AS DATE) as date,
        SUM(callCount) as totalCalls,
        SUM(errorCount) as totalErrors,
        AVG(avgResponseTime) as avgResponseTime
      FROM ApiUsageHourly
      WHERE UserId = @userId
        AND hourTimestamp BETWEEN @startDate AND @endDate
      GROUP BY CAST(hourTimestamp AS DATE)
      ORDER BY date DESC
    `;

    const results = await this.db.query(query, { userId, startDate, endDate });
    
    return {
      history: results,
      summary: this.calculateSummary(results)
    };
  }
}
```

### 4. Subscription Management Service
```typescript
// services/subscriptionService.ts

export class SubscriptionService {
  /**
   * Update user's subscription tier
   */
  async updateUserTier(
    userId: string,
    newTier: SubscriptionTier,
    reason?: string,
    changedBy?: string
  ): Promise<void> {
    const user = await this.db.getUser(userId);
    const oldTier = user.subscriptionTier;

    // Update user record
    await this.db.execute(
      `UPDATE Users 
       SET subscriptionTier = @newTier,
           subscriptionStartDate = @now
       WHERE UserId = @userId`,
      { userId, newTier, now: new Date() }
    );

    // Log change in history
    await this.db.execute(
      `INSERT INTO SubscriptionHistory 
       (id, UserId, previousTier, newTier, previousStatus, newStatus, changeReason, changedBy, startDate, created)
       VALUES (@id, @userId, @previousTier, @newTier, @previousStatus, @newStatus, @reason, @changedBy, @startDate, @created)`,
      {
        id: generateUUID(),
        userId,
        previousTier: oldTier,
        newTier: newTier,
        previousStatus: user.subscriptionStatus,
        newStatus: 'active',
        reason: reason || 'Tier upgrade',
        changedBy: changedBy,
        startDate: new Date(),
        created: new Date()
      }
    );

    // Clear user tier cache
    await this.redis.del(`user:${userId}:tier`);

    // Emit event for analytics
    await this.eventBus.emit('subscription.tier_changed', {
      userId,
      oldTier,
      newTier,
      timestamp: new Date()
    });
  }

  /**
   * Get user's tier information (with caching)
   */
  async getUserTierInfo(userId: string): Promise<TierInfo> {
    // Try cache first
    const cacheKey = `user:${userId}:tier`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const user = await this.db.query(
      `SELECT subscriptionTier, subscriptionStatus, subscriptionStartDate, subscriptionEndDate
       FROM Users WHERE UserId = @userId`,
      { userId }
    );

    if (!user) {
      throw new Error('User not found');
    }

    const tierInfo: TierInfo = {
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      startDate: user.subscriptionStartDate,
      endDate: user.subscriptionEndDate,
      limits: TIER_LIMITS[user.subscriptionTier]
    };

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(tierInfo));

    return tierInfo;
  }

  /**
   * Check if subscription is active
   */
  isSubscriptionActive(tierInfo: TierInfo): boolean {
    if (tierInfo.status === 'suspended' || tierInfo.status === 'cancelled') {
      return false;
    }

    // Check if subscription has expired
    if (tierInfo.endDate && new Date(tierInfo.endDate) < new Date()) {
      return false;
    }

    return true;
  }
}
```

## Background Jobs/Scheduled Tasks

### 1. Aggregate Daily Usage (Run hourly)
```typescript
// jobs/aggregateDailyUsage.ts
export async function aggregateDailyUsage(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const query = `
    INSERT INTO ApiUsageDaily (id, UserId, date, totalCalls, totalErrors, avgResponseTime, uniqueEndpoints)
    SELECT 
      NEWID(),
      UserId,
      @date,
      SUM(callCount),
      SUM(errorCount),
      AVG(avgResponseTime),
      COUNT(DISTINCT endpoint)
    FROM ApiUsageHourly
    WHERE CAST(hourTimestamp AS DATE) = @date
    GROUP BY UserId
  `;

  await db.execute(query, { date: yesterday });
}
```

### 2. Clean Old Usage Data (Run daily)
```typescript
// jobs/cleanOldUsageData.ts
export async function cleanOldUsageData(): Promise<void> {
  const retentionDays = 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Delete old raw usage records
  await db.execute(
    'DELETE FROM ApiUsage WHERE timestamp < @cutoffDate',
    { cutoffDate }
  );

  // Keep aggregated data longer
  const aggregateRetentionDays = 365;
  const aggregateCutoffDate = new Date();
  aggregateCutoffDate.setDate(aggregateCutoffDate.getDate() - aggregateRetentionDays);

  await db.execute(
    'DELETE FROM ApiUsageHourly WHERE hourTimestamp < @cutoffDate',
    { cutoffDate: aggregateCutoffDate }
  );
}
```

### 3. Expire Trial Subscriptions (Run daily)
```typescript
// jobs/expireTrials.ts
export async function expireTrialSubscriptions(): Promise<void> {
  const query = `
    UPDATE Users 
    SET subscriptionStatus = 'expired',
        subscriptionTier = 'free'
    WHERE subscriptionStatus = 'trial'
      AND trialEndDate < @now
  `;

  await db.execute(query, { now: new Date() });

  // Clear cache for affected users
  // This requires tracking which users were updated
}
```

## Environment Variables Required

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS_ENABLED=true

# Database Configuration
DB_CONNECTION_STRING=your-database-connection-string
DB_MAX_POOL_SIZE=50

# Stripe Configuration (if using Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASIC=price_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_ENTERPRISE=price_...

# Rate Limiting Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_BYPASS_ADMIN=true

# Feature Flags
TIER_VALIDATION_ENABLED=true
USAGE_TRACKING_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_RATE_LIMIT_VIOLATIONS=true
```

## Performance Considerations

### 1. Caching Strategy
- **User Tier Info**: Cache for 5 minutes (Redis)
- **Rate Limit Counters**: Use Redis sorted sets with automatic expiration
- **Usage Aggregates**: Pre-calculate hourly/daily totals

### 2. Database Optimization
- Add indexes on frequently queried columns
- Partition ApiUsage table by month
- Use aggregated tables for dashboard queries
- Archive old data to separate storage

### 3. Async Operations
- Record usage asynchronously (don't block API response)
- Update aggregates in background
- Use message queue for heavy operations

### 4. Redis Performance
- Use pipelining for multiple commands
- Set appropriate TTLs to prevent memory bloat
- Monitor memory usage and eviction policies
- Consider Redis Cluster for scaling

## Error Handling

### Rate Limit Errors
```typescript
{
  "error": "Rate limit exceeded",
  "tier": "free",
  "limit": 100,
  "current": 101,
  "resetAt": "2024-01-15T15:00:00Z",
  "upgradeUrl": "/subscription/upgrade"
}
```

### Tier Restriction Errors
```typescript
{
  "error": "Endpoint not available in your plan",
  "tier": "free",
  "requiredTier": "pro",
  "endpoint": "/api/analytics/Advanced",
  "upgradeUrl": "/subscription/upgrade"
}
```

### Subscription Status Errors
```typescript
{
  "error": "Subscription is not active",
  "tier": "free",
  "status": "expired",
  "renewUrl": "/subscription/renew"
}
```

## Testing Requirements

### Unit Tests
- Tier validation logic
- Rate limiting algorithms
- Endpoint pattern matching
- Usage calculation

### Integration Tests
- End-to-end API flow with tier checks
- Redis rate limiting
- Database usage tracking
- Stripe webhook handling

### Load Tests
- Rate limiting under high concurrency
- Redis performance with many users
- Database query performance
- API response time with middleware

## Monitoring & Alerts

### Metrics to Track
- Rate limit hit rate by tier
- API response time (with tier validation overhead)
- Redis memory usage and hit rate
- Database query performance
- Tier upgrade conversion rate

### Alerts to Configure
- Redis connection failures
- High rate of 429 responses
- Tier validation errors
- Database connection pool exhaustion
- Unusual API usage patterns

## Summary

The backend implementation requires:
1. **Database changes**: 4 new tables + modifications to Users table
2. **Redis setup**: For rate limiting and caching
3. **New APIs**: 8+ new endpoints for usage and subscription management
4. **Core services**: Tier validation, rate limiting, usage tracking, subscription management
5. **Background jobs**: 3 scheduled tasks for data aggregation and cleanup
6. **Monitoring**: Comprehensive logging and metrics collection

This provides a solid foundation for tier-based API restrictions that is:
- **Performant**: Redis-based rate limiting, cached tier info, pre-aggregated data
- **Scalable**: Horizontal scaling with Redis, database partitioning
- **Observable**: Comprehensive logging and metrics
- **Maintainable**: Clear separation of concerns, well-tested components
