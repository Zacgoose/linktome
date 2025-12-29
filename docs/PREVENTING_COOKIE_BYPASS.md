# Preventing Cookie-Based API Access Bypass

## The Problem

**Question**: How can we stop a user from making curl requests with the access token cookie instead of using an API key?

**Scenario**: A user could potentially bypass API key rate limits by using curl with their JWT cookie:

```bash
# User might try this to bypass API key limits
curl https://api.linktome.com/user/Links \
  -H "Cookie: access_token=eyJhbGc..." \
  --cookie-jar cookies.txt
```

## The Solution: Multiple Defense Layers

### Layer 1: Same-Site Cookie Protection (Primary Defense)

#### Implementation

Set `SameSite=Strict` on your access token cookies. This is the **most effective** defense.

```typescript
// backend/auth/tokenService.ts

export function setAuthCookies(
  context: Context,
  accessToken: string,
  refreshToken: string
): void {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict' as const, // ← KEY: Prevents cross-site requests
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 minutes for access token
  };

  context.res.headers = {
    ...context.res.headers,
    'Set-Cookie': [
      `access_token=${accessToken}; ${formatCookieOptions(cookieOptions)}`,
      `refresh_token=${refreshToken}; ${formatCookieOptions({
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
      })}`,
    ],
  };
}
```

#### How It Works

With `SameSite=Strict`:
- ✅ Browser automatically sends cookie when user clicks links in your app
- ✅ Browser sends cookie for requests from your frontend (same origin)
- ❌ Browser **DOES NOT** send cookie for curl requests
- ❌ Browser **DOES NOT** send cookie from external sites
- ❌ Browser **DOES NOT** send cookie from Postman/Insomnia (unless manually configured)

**Result**: curl requests won't include the cookie automatically, forcing users to use API keys.

### Layer 2: Origin/Referer Validation (Secondary Defense)

Check that requests with JWT cookies come from your application domain.

```typescript
// backend/middleware/originValidation.ts

const ALLOWED_ORIGINS = [
  process.env.APP_URL, // e.g., https://linktome.com
  'https://www.linktome.com',
  'http://localhost:3000', // Development only
];

export function validateOrigin(req: HttpRequest): {
  isValid: boolean;
  origin?: string;
} {
  const origin = req.headers.origin || req.headers.referer;
  
  if (!origin) {
    // No origin/referer header - likely curl or API client
    return { isValid: false };
  }

  // Check if origin matches allowed domains
  const isValid = ALLOWED_ORIGINS.some(allowed => {
    try {
      const originUrl = new URL(origin);
      const allowedUrl = new URL(allowed);
      return originUrl.origin === allowedUrl.origin;
    } catch {
      return false;
    }
  });

  return { isValid, origin };
}
```

#### Enhanced Middleware

```typescript
// backend/middleware/apiHandler.ts

async function authenticateRequest(req: HttpRequest): Promise<RequestContext | null> {
  // Check for API key first (preferred method for programmatic access)
  const apiKeyHeader = req.headers['x-api-key'] || 
                       req.headers['authorization']?.replace('Bearer ', '');
  
  if (apiKeyHeader && apiKeyHeader.startsWith('ltm_')) {
    const validation = await validateApiKey(apiKeyHeader);
    if (!validation.valid || !validation.apiKey) {
      return null;
    }
    return {
      accessType: 'api_key',
      user: await getUserById(validation.apiKey.userId),
      apiKey: validation.apiKey,
      shouldApplyRateLimit: true,
    };
  }

  // Check for JWT cookie (UI access only)
  const jwtToken = req.cookies?.access_token;
  if (jwtToken) {
    // Validate origin for cookie-based access
    const originCheck = validateOrigin(req);
    
    if (!originCheck.isValid) {
      // Cookie present but no valid origin - likely curl/automation attempt
      logger.warn('JWT cookie used without valid origin', {
        headers: {
          origin: req.headers.origin,
          referer: req.headers.referer,
          userAgent: req.headers['user-agent'],
        },
      });
      
      // OPTION A: Reject the request
      return null;
      
      // OPTION B: Allow but apply rate limits (treat as API access)
      // const user = await verifyToken(jwtToken);
      // if (user) {
      //   return {
      //     accessType: 'api_key', // Treat as API access
      //     user: user,
      //     shouldApplyRateLimit: true, // Apply limits
      //   };
      // }
    }

    // Valid origin - this is UI access
    const user = await verifyToken(jwtToken);
    if (!user) {
      return null;
    }

    return {
      accessType: 'ui',
      user: user,
      shouldApplyRateLimit: false,
    };
  }

  return null;
}
```

### Layer 3: User Agent Analysis (Tertiary Defense)

Detect common API clients and automation tools.

```typescript
// backend/middleware/userAgentDetection.ts

const KNOWN_API_CLIENTS = [
  /curl/i,
  /wget/i,
  /python-requests/i,
  /python-urllib/i,
  /node-fetch/i,
  /axios/i,
  /postman/i,
  /insomnia/i,
  /httpie/i,
  /java\//i,
  /okhttp/i,
  /go-http-client/i,
  /apache-httpclient/i,
];

export function isLikelyApiClient(userAgent: string): boolean {
  if (!userAgent) {
    return true; // No user agent = likely API client
  }

  return KNOWN_API_CLIENTS.some(pattern => pattern.test(userAgent));
}

// Usage in middleware
async function authenticateRequest(req: HttpRequest): Promise<RequestContext | null> {
  const jwtToken = req.cookies?.access_token;
  
  if (jwtToken) {
    const userAgent = req.headers['user-agent'] || '';
    
    // If it looks like an API client, require API key instead
    if (isLikelyApiClient(userAgent)) {
      logger.info('API client detected with JWT cookie', {
        userAgent,
        ip: req.headers['x-forwarded-for'],
      });
      
      // Reject or treat as API access
      return null; // Force user to use API key
    }

    // Proceed with JWT validation
    const user = await verifyToken(jwtToken);
    // ...
  }
}
```

### Layer 4: CSRF Token Protection (Additional Security)

Add CSRF protection for state-changing operations.

```typescript
// backend/middleware/csrfProtection.ts

export async function validateCsrfToken(
  req: HttpRequest,
  sessionId: string
): Promise<boolean> {
  // For non-GET requests with JWT cookies, require CSRF token
  if (req.method !== 'GET' && req.cookies?.access_token) {
    const csrfToken = req.headers['x-csrf-token'];
    
    if (!csrfToken) {
      return false;
    }

    // Validate token against session
    const storedToken = await getSessionCsrfToken(sessionId);
    return csrfToken === storedToken;
  }

  return true; // GET requests or API key requests don't need CSRF
}
```

```typescript
// Frontend - Include CSRF token in requests
// src/utils/api.ts

const buildHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Get CSRF token from meta tag or localStorage
  const csrfToken = document.querySelector('meta[name="csrf-token"]')
                           ?.getAttribute('content');
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  return headers;
};
```

## Recommended Implementation Strategy

### Option A: Strict Enforcement (Recommended)

**Reject** any JWT cookie access without proper origin/user-agent:

```typescript
async function authenticateRequest(req: HttpRequest): Promise<RequestContext | null> {
  // API key access
  if (apiKeyHeader) {
    return handleApiKeyAuth(apiKeyHeader);
  }

  // JWT cookie access
  if (jwtToken) {
    const originCheck = validateOrigin(req);
    const userAgent = req.headers['user-agent'] || '';
    
    // Strict validation
    if (!originCheck.isValid || isLikelyApiClient(userAgent)) {
      logger.warn('Rejected JWT cookie access - use API key instead', {
        origin: req.headers.origin,
        userAgent: userAgent,
        ip: req.headers['x-forwarded-for'],
      });
      return null; // Reject - must use API key
    }

    // Allow UI access
    return {
      accessType: 'ui',
      user: await verifyToken(jwtToken),
      shouldApplyRateLimit: false,
    };
  }

  return null;
}
```

### Option B: Graceful Degradation (Alternative)

**Allow** but apply rate limits to suspicious requests:

```typescript
async function authenticateRequest(req: HttpRequest): Promise<RequestContext | null> {
  // API key access
  if (apiKeyHeader) {
    return handleApiKeyAuth(apiKeyHeader);
  }

  // JWT cookie access
  if (jwtToken) {
    const user = await verifyToken(jwtToken);
    if (!user) return null;

    const originCheck = validateOrigin(req);
    const userAgent = req.headers['user-agent'] || '';
    
    // Check if this looks like programmatic access
    if (!originCheck.isValid || isLikelyApiClient(userAgent)) {
      logger.info('JWT cookie used from likely API client - applying rate limits', {
        userId: user.UserId,
        userAgent: userAgent,
      });
      
      // Allow but treat as API access (apply limits)
      return {
        accessType: 'api_key', // Treat as API access
        user: user,
        shouldApplyRateLimit: true, // Apply rate limits!
      };
    }

    // Normal UI access
    return {
      accessType: 'ui',
      user: user,
      shouldApplyRateLimit: false,
    };
  }

  return null;
}
```

## Complete Implementation Example

### Backend Middleware

```typescript
// backend/middleware/enhancedApiHandler.ts

import { AzureFunction, Context, HttpRequest } from '@azure/functions';

const ALLOWED_ORIGINS = [
  process.env.APP_URL,
  'http://localhost:3000',
];

const API_CLIENT_PATTERNS = [
  /curl/i, /wget/i, /python-requests/i, /postman/i,
  /insomnia/i, /httpie/i, /axios/i,
];

function isValidOrigin(req: HttpRequest): boolean {
  const origin = req.headers.origin || req.headers.referer;
  if (!origin) return false;
  
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

function isApiClient(userAgent: string): boolean {
  return !userAgent || API_CLIENT_PATTERNS.some(p => p.test(userAgent));
}

export function withTierValidation(
  handler: AzureFunction,
  options: ApiHandlerOptions = {}
): AzureFunction {
  return async (context: Context, req: HttpRequest): Promise<void> => {
    try {
      // 1. Check for API key (preferred for programmatic access)
      const apiKeyHeader = req.headers['x-api-key'];
      
      if (apiKeyHeader?.startsWith('ltm_')) {
        const validation = await validateApiKey(apiKeyHeader);
        if (!validation.valid) {
          context.res = { status: 401, body: { error: 'Invalid API key' } };
          return;
        }
        
        const requestContext: RequestContext = {
          accessType: 'api_key',
          user: await getUserById(validation.apiKey.userId),
          apiKey: validation.apiKey,
          shouldApplyRateLimit: true,
        };
        
        (req as any).context = requestContext;
        
        // Apply rate limits for API key access
        if (!options.bypassTierCheck) {
          const rateLimitCheck = await checkApiKeyRateLimit(validation.apiKey);
          if (!rateLimitCheck.allowed) {
            context.res = {
              status: 429,
              headers: {
                'X-RateLimit-Limit': String(rateLimitCheck.limit),
                'X-RateLimit-Remaining': '0',
              },
              body: { error: rateLimitCheck.reason },
            };
            return;
          }
        }
        
        await handler(context, req);
        return;
      }

      // 2. Check for JWT cookie (UI access)
      const jwtToken = req.cookies?.access_token;
      
      if (jwtToken) {
        const user = await verifyToken(jwtToken);
        if (!user) {
          context.res = { status: 401, body: { error: 'Invalid token' } };
          return;
        }

        // Validate that this is legitimate UI access
        const hasValidOrigin = isValidOrigin(req);
        const userAgent = req.headers['user-agent'] || '';
        const looksLikeApiClient = isApiClient(userAgent);

        // STRICT MODE: Reject suspicious requests
        if (!hasValidOrigin || looksLikeApiClient) {
          logger.warn('Suspicious JWT cookie usage detected', {
            userId: user.UserId,
            origin: req.headers.origin,
            userAgent: userAgent,
            ip: req.headers['x-forwarded-for'],
          });

          context.res = {
            status: 403,
            body: {
              error: 'Direct API access requires an API key',
              message: 'Please create an API key in your account settings for programmatic access',
              docsUrl: 'https://docs.linktome.com/api/authentication',
            },
          };
          return;
        }

        // Valid UI access - no rate limits
        const requestContext: RequestContext = {
          accessType: 'ui',
          user: user,
          shouldApplyRateLimit: false,
        };
        
        (req as any).context = requestContext;
        await handler(context, req);
        return;
      }

      // 3. No authentication provided
      context.res = { status: 401, body: { error: 'Authentication required' } };
      
    } catch (error) {
      context.log.error('Authentication error:', error);
      context.res = { status: 500, body: { error: 'Internal server error' } };
    }
  };
}
```

### Frontend Configuration

```typescript
// next.config.ts
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

## Testing the Implementation

### Test 1: Verify SameSite Cookie Works

```bash
# This should FAIL - cookie won't be sent
curl https://api.linktome.com/user/Links \
  -H "Cookie: access_token=your_jwt_token"

# Expected: 401 Unauthorized
```

### Test 2: Verify API Key Works

```bash
# This should SUCCEED
curl https://api.linktome.com/user/Links \
  -H "X-API-Key: ltm_live_your_api_key"

# Expected: 200 OK (with rate limit headers)
```

### Test 3: Verify UI Access Works

```javascript
// From your Next.js app
fetch('/api/user/Links', {
  credentials: 'include', // Sends cookie
});

// Expected: 200 OK (no rate limits)
```

### Test 4: Simulate Bypass Attempt

```bash
# Try to bypass with cookie + fake origin
curl https://api.linktome.com/user/Links \
  -H "Cookie: access_token=your_jwt_token" \
  -H "Origin: https://linktome.com" \
  -H "Referer: https://linktome.com"

# Expected: 403 Forbidden (user-agent reveals it's curl)
```

## Monitoring & Detection

### Log Suspicious Activity

```typescript
// backend/services/securityMonitoring.ts

export async function logSuspiciousActivity(
  userId: string,
  reason: string,
  details: any
): Promise<void> {
  await db.execute(
    `INSERT INTO SecurityEvents (id, UserId, eventType, reason, details, timestamp)
     VALUES (@id, @userId, @eventType, @reason, @details, @timestamp)`,
    {
      id: generateUUID(),
      userId: userId,
      eventType: 'suspicious_jwt_usage',
      reason: reason,
      details: JSON.stringify(details),
      timestamp: new Date(),
    }
  );

  // Alert on repeated attempts
  const recentAttempts = await getRecentSecurityEvents(userId, '1 hour');
  if (recentAttempts.length > 10) {
    await sendSecurityAlert(userId, 'Multiple suspicious API access attempts');
  }
}
```

### Dashboard Metrics

Track in admin dashboard:
- Number of rejected JWT cookie attempts
- Users with suspicious patterns
- Most common user agents in rejected requests
- Geographic distribution of suspicious requests

## Summary

### Effectiveness of Each Layer

| Layer | Effectiveness | Bypassable? | Recommended |
|-------|--------------|-------------|-------------|
| **SameSite Cookie** | 🟢 Very High | No (by design) | ✅ Yes - Primary |
| **Origin Validation** | 🟡 Medium | Yes (spoofable) | ✅ Yes - Secondary |
| **User Agent Check** | 🟠 Low | Yes (spoofable) | ⚠️ Optional - Tertiary |
| **CSRF Token** | 🟢 High | Hard | ✅ Yes - For mutations |

### Final Recommendation

**Implement Layers 1, 2, and 4** (SameSite + Origin + CSRF):

1. ✅ Set `SameSite=Strict` on cookies (primary defense)
2. ✅ Validate origin/referer headers (secondary defense)
3. ✅ Add CSRF tokens for state-changing operations
4. ⚠️ Optionally check user agent (low priority)

This multi-layered approach makes it **extremely difficult** for users to bypass API key requirements while maintaining a smooth experience for legitimate UI users.

### User Experience

- **Legitimate UI users**: Seamless, no changes needed
- **Developers wanting API access**: Clear error message directing them to create API key
- **Attempted bypass**: Rejected with helpful error message

```json
{
  "error": "Direct API access requires an API key",
  "message": "For programmatic access, please create an API key in Settings → API Keys",
  "docsUrl": "https://docs.linktome.com/api/authentication"
}
```

This approach is **secure, user-friendly, and industry-standard**.
