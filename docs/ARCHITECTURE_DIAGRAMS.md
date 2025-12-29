# API Tier Restrictions - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                            │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   React Pages    │  │  API Hooks       │  │  Tier Context    │  │
│  │  - Dashboard     │  │  - useApiGet     │  │  - Current Tier  │  │
│  │  - Profile       │  │  - useApiPost    │  │  - Usage Info    │  │
│  │  - Usage Stats   │  │  - useApiPut     │  │  - Limits        │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                 │                                     │
└─────────────────────────────────┼─────────────────────────────────────┘
                                  │
                                  │ HTTPS + JWT Cookie
                                  │
┌─────────────────────────────────▼─────────────────────────────────────┐
│                      NEXT.JS API PROXY (/api/*)                       │
│                                                                        │
│  Routes requests to Azure Functions backend                          │
└─────────────────────────────────┬─────────────────────────────────────┘
                                  │
                                  │ Internal Network
                                  │
┌─────────────────────────────────▼─────────────────────────────────────┐
│                       AZURE FUNCTIONS API                             │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              TIER VALIDATION MIDDLEWARE                       │   │
│  │                                                               │   │
│  │  1. Extract user from JWT ───────────┐                      │   │
│  │  2. Check subscription status        │                      │   │
│  │  3. Validate endpoint access         │                      │   │
│  │  4. Check rate limits ──────────────►│ Redis Cache         │   │
│  │  5. Record usage                     │ (Rate Limiting)     │   │
│  │                                      └─────────────────────┘   │
│  └──────────────────┬──────────────────────────────────────────────┘   │
│                     │                                                  │
│  ┌──────────────────▼──────────────────────────────────────────────┐  │
│  │                  BUSINESS LOGIC HANDLERS                        │  │
│  │                                                                 │  │
│  │  - GetLinks          - GetProfile        - GetAnalytics       │  │
│  │  - CreateLink        - UpdateProfile     - GetUsage           │  │
│  │  - UpdateLink        - GetAppearance     - UpdateSubscription │  │
│  └──────────────────┬──────────────────────────────────────────────┘  │
└────────────────────┼────────────────────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
            ▼                 ▼
    ┌───────────────┐  ┌──────────────┐
    │   SQL DB      │  │    Redis     │
    │               │  │              │
    │ - Users       │  │ - Rate Limit │
    │ - Links       │  │   Counters   │
    │ - ApiUsage    │  │ - Tier Cache │
    │ - Subs        │  │              │
    └───────────────┘  └──────────────┘
```

## Request Flow

### Successful Request (Within Limits)

```
User Request
    │
    ├─► 1. JWT Cookie Sent
    │
    ├─► 2. Middleware: Extract User from JWT
    │       └─► User: { UserId: "123", tier: "free", status: "active" }
    │
    ├─► 3. Middleware: Get Tier Limits
    │       └─► Redis Cache Check: user:123:tier
    │           ├─► Cache Hit: Return cached limits
    │           └─► Cache Miss: Query DB → Cache result
    │
    ├─► 4. Middleware: Check Endpoint Access
    │       └─► Endpoint: "user/Links" ✓ Allowed for free tier
    │
    ├─► 5. Middleware: Check Rate Limit
    │       └─► Redis: ZCOUNT ratelimit:123:hourly
    │           └─► Current: 45/100 ✓ Within limit
    │
    ├─► 6. Middleware: Increment Counter
    │       └─► Redis: ZADD ratelimit:123:hourly {timestamp}
    │
    ├─► 7. Execute Business Logic
    │       └─► Query Links from DB
    │
    ├─► 8. Record Usage (Async)
    │       └─► Insert into ApiUsage table
    │
    └─► 9. Return Response
        └─► Status: 200
            Headers: X-RateLimit-Remaining: 54
            Body: { links: [...] }
```

### Rate Limit Exceeded

```
User Request
    │
    ├─► 1-4. Same as above
    │
    ├─► 5. Middleware: Check Rate Limit
    │       └─► Redis: ZCOUNT ratelimit:123:hourly
    │           └─► Current: 101/100 ✗ EXCEEDED
    │
    ├─► 6. Log Violation
    │       └─► Insert into RateLimitViolations table
    │
    └─► 7. Return Error Response
        └─► Status: 429 Too Many Requests
            Headers: 
              X-RateLimit-Limit: 100
              X-RateLimit-Remaining: 0
              X-RateLimit-Reset: 2024-01-15T15:00:00Z
            Body: {
              error: "Hourly API rate limit exceeded",
              tier: "free",
              limit: 100,
              current: 101,
              upgradeUrl: "/subscription/upgrade"
            }
```

### Tier Restriction (Endpoint Not Allowed)

```
User Request: GET /api/analytics/Advanced
    │
    ├─► 1-3. Same as above
    │
    ├─► 4. Middleware: Check Endpoint Access
    │       └─► Endpoint: "analytics/Advanced"
    │           └─► Allowed Endpoints for free tier:
    │               - public/*
    │               - auth/*
    │               - user/Profile
    │               - user/Links
    │           └─► Match: ✗ NOT FOUND
    │
    ├─► 5. Log Attempt
    │       └─► Log tier restriction event
    │
    └─► 6. Return Error Response
        └─► Status: 403 Forbidden
            Body: {
              error: "Endpoint not available in your plan",
              tier: "free",
              requiredTier: "pro",
              endpoint: "analytics/Advanced",
              upgradeUrl: "/subscription/upgrade"
            }
```

## Tier Configuration Structure

```
┌────────────────────────────────────────────────────────────┐
│                    TIER CONFIGURATION                       │
└────────────────────────────────────────────────────────────┘

FREE TIER
├── Rate Limits
│   ├── 100 calls/hour
│   └── 1,000 calls/day
├── Feature Limits
│   ├── 5 links max
│   ├── 0 custom domains
│   └── 7 days analytics retention
├── Allowed Endpoints
│   ├── public/*
│   ├── auth/*
│   ├── user/Profile
│   └── user/Links
└── Features
    ├── Basic Analytics ✓
    └── Basic Customization ✓

BASIC TIER ($9/month)
├── Rate Limits
│   ├── 500 calls/hour
│   └── 5,000 calls/day
├── Feature Limits
│   ├── 25 links max
│   ├── 1 custom domain
│   └── 30 days analytics retention
├── Allowed Endpoints
│   ├── All FREE tier endpoints
│   ├── user/*
│   └── analytics/Basic
└── Features
    ├── Basic Analytics ✓
    ├── Advanced Customization ✓
    └── QR Codes ✓

PRO TIER ($29/month)
├── Rate Limits
│   ├── 2,000 calls/hour
│   └── 20,000 calls/day
├── Feature Limits
│   ├── 100 links max
│   ├── 5 custom domains
│   └── 365 days analytics retention
├── Allowed Endpoints
│   └── * (all endpoints)
└── Features
    ├── All BASIC features
    ├── Bulk Operations ✓
    ├── Data Export ✓
    └── Advanced Analytics ✓

ENTERPRISE TIER (Custom)
├── Rate Limits
│   ├── Unlimited calls/hour
│   └── Unlimited calls/day
├── Feature Limits
│   ├── Unlimited links
│   ├── Unlimited custom domains
│   └── Unlimited analytics retention
├── Allowed Endpoints
│   └── * (all endpoints)
└── Features
    ├── All PRO features
    ├── Priority Support
    ├── Custom Integration
    └── SLA Guarantee
```

## Database Schema

```
┌─────────────────────────────────────────────────────────┐
│                         Users                            │
├─────────────────────────────────────────────────────────┤
│ UserId (PK)                                             │
│ username                                                 │
│ email                                                    │
│ passwordHash                                             │
│ userRole                                                 │
│ subscriptionTier          ◄──┐ NEW                      │
│ subscriptionStatus        ◄──┤ COLUMNS                  │
│ subscriptionStartDate     ◄──┤                          │
│ subscriptionEndDate       ◄──┤                          │
│ trialEndDate              ◄──┘                          │
│ created                                                  │
│ updated                                                  │
└─────────────────────────────────────────────────────────┘
                │
                │ 1:N
                ▼
┌─────────────────────────────────────────────────────────┐
│                  SubscriptionHistory                     │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ UserId (FK) ───► Users.UserId                          │
│ previousTier                                            │
│ newTier                                                 │
│ previousStatus                                          │
│ newStatus                                               │
│ changeReason                                            │
│ changedBy                                               │
│ startDate                                               │
│ endDate                                                 │
│ created                                                 │
└─────────────────────────────────────────────────────────┘

                │
                │ 1:N
                ▼
┌─────────────────────────────────────────────────────────┐
│                      ApiUsage                            │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ UserId (FK) ───► Users.UserId                          │
│ endpoint                                                │
│ httpMethod                                              │
│ statusCode                                              │
│ responseTime                                            │
│ ipAddress                                               │
│ userAgent                                               │
│ timestamp                                               │
│                                                         │
│ Indexes:                                                │
│ - idx_usage_user_time (UserId, timestamp)              │
│ - idx_usage_timestamp (timestamp)                      │
└─────────────────────────────────────────────────────────┘
                │
                │ Aggregated to
                ▼
┌─────────────────────────────────────────────────────────┐
│                   ApiUsageHourly                         │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ UserId (FK) ───► Users.UserId                          │
│ hourTimestamp                                           │
│ endpoint                                                │
│ callCount                                               │
│ errorCount                                              │
│ avgResponseTime                                         │
│ maxResponseTime                                         │
│                                                         │
│ Indexes:                                                │
│ - unique_user_hour_endpoint (UserId, hour, endpoint)   │
│ - idx_hourly_user_time (UserId, hourTimestamp)         │
└─────────────────────────────────────────────────────────┘
                │
                │ Aggregated to
                ▼
┌─────────────────────────────────────────────────────────┐
│                    ApiUsageDaily                         │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ UserId (FK) ───► Users.UserId                          │
│ date                                                    │
│ totalCalls                                              │
│ totalErrors                                             │
│ avgResponseTime                                         │
│ uniqueEndpoints                                         │
│                                                         │
│ Indexes:                                                │
│ - unique_user_date (UserId, date)                      │
│ - idx_daily_user_date (UserId, date)                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               RateLimitViolations                        │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ UserId (FK) ───► Users.UserId                          │
│ tier                                                    │
│ limitType (hourly/daily)                               │
│ limitValue                                              │
│ actualValue                                             │
│ endpoint                                                │
│ timestamp                                               │
│                                                         │
│ Indexes:                                                │
│ - idx_violations_user (UserId)                         │
│ - idx_violations_time (timestamp)                      │
└─────────────────────────────────────────────────────────┘
```

## Redis Data Structures

```
┌─────────────────────────────────────────────────────────┐
│              RATE LIMITING (Sorted Sets)                 │
└─────────────────────────────────────────────────────────┘

Key: ratelimit:{userId}:hourly
Type: ZSET (Sorted Set)
TTL: 3600 seconds (1 hour)

┌──────────────┬──────────────────────────┐
│   Score      │         Member           │
│ (timestamp)  │      (timestamp)         │
├──────────────┼──────────────────────────┤
│ 1705329600000│ "1705329600000"         │
│ 1705329601234│ "1705329601234"         │
│ 1705329602456│ "1705329602456"         │
│ ...          │ ...                      │
└──────────────┴──────────────────────────┘

Commands:
ZADD ratelimit:123:hourly 1705329600000 "1705329600000"
ZCOUNT ratelimit:123:hourly 1705326000000 +inf
ZREMRANGEBYSCORE ratelimit:123:hourly -inf 1705326000000
EXPIRE ratelimit:123:hourly 3600

┌─────────────────────────────────────────────────────────┐
│              TIER CACHE (Strings)                        │
└─────────────────────────────────────────────────────────┘

Key: user:{userId}:tier
Type: String (JSON)
TTL: 300 seconds (5 minutes)

Value:
{
  "tier": "free",
  "status": "active",
  "startDate": "2024-01-15T00:00:00Z",
  "endDate": null,
  "limits": {
    "apiCallsPerHour": 100,
    "apiCallsPerDay": 1000,
    "maxLinks": 5,
    "allowedEndpoints": ["public/*", "auth/*", "user/Profile", "user/Links"]
  }
}

Commands:
GET user:123:tier
SET user:123:tier "{...json...}" EX 300
DEL user:123:tier
```

## Monitoring Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│                    ADMIN MONITORING DASHBOARD                   │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐  ┌─────────────────────────┐
│   Total API Calls       │  │   Active Users          │
│   1,234,567 (24h)       │  │   5,432 (now)           │
│   ▲ 12% from yesterday  │  │   ▼ 3% from yesterday   │
└─────────────────────────┘  └─────────────────────────┘

┌─────────────────────────┐  ┌─────────────────────────┐
│ Rate Limit Hits (24h)   │  │  Tier Distribution      │
│   1,245 violations      │  │  Free: 85%              │
│   Top violator: user123 │  │  Basic: 10%             │
└─────────────────────────┘  │  Pro: 4%                │
                              │  Enterprise: 1%         │
                              └─────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              Usage by Tier (Last 7 Days)                      │
│                                                               │
│  Calls    ┌─────────────────────────────────────┐           │
│  (1000s)  │                            ╱╲       │           │
│      50   │                       ╱╲  ╱  ╲      │  Pro      │
│      40   │                  ╱╲  ╱  ╲╱    ╲     │           │
│      30   │             ╱╲  ╱  ╲╱          ╲    │  Basic    │
│      20   │        ╱╲  ╱  ╲╱               ╲   │           │
│      10   │   ╱╲  ╱  ╲╱                     ╲  │  Free     │
│       0   └─────────────────────────────────────┘           │
│           Mon Tue Wed Thu Fri Sat Sun                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              Top Endpoints by Calls                           │
│                                                               │
│  1. user/Links           ████████████████████ 234,567       │
│  2. user/Profile         ████████████ 123,456               │
│  3. analytics/Basic      ████████ 89,123                    │
│  4. public/Profile       ████ 45,678                        │
│  5. appearance/Theme     ██ 23,456                          │
└──────────────────────────────────────────────────────────────┘
```

## User Usage Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│                    USER USAGE DASHBOARD                         │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Your Plan: FREE                              [Upgrade ►]    │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Hourly Usage                                                 │
│  ████████████████████████░░░░░░░░░░░░ 45 / 100 calls       │
│  Resets in 23 minutes                                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Daily Usage                                                  │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░ 234 / 1,000 calls    │
│  Resets at midnight                                          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Usage History (Last 7 Days)                                 │
│                                                               │
│  Calls    ┌─────────────────────────────────────┐           │
│   1000    │     limit ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │           │
│    800    │                                      │           │
│    600    │              ╱╲                      │           │
│    400    │         ╱╲  ╱  ╲    ╱╲              │           │
│    200    │    ╱╲  ╱  ╲╱    ╲  ╱  ╲    ╱╲       │           │
│      0    └─────────────────────────────────────┘           │
│           Mon Tue Wed Thu Fri Sat Sun                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  ⚠ You're using 76% of your daily limit                     │
│  Consider upgrading to BASIC for 5x more calls              │
│                                        [View Plans ►]         │
└──────────────────────────────────────────────────────────────┘
```

This architecture provides a comprehensive visual overview of how the tier-based API restrictions system works, from the request flow to data structures and monitoring dashboards.
