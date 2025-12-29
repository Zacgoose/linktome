# Distinguishing UI vs Direct API Access

## New Requirement Understanding

**Goal**: Restrict direct API access (programmatic/external calls) based on account tiers, while keeping UI access (web application) unrestricted for all users.

**Use Case**: 
- Users browse the web app freely (unlimited)
- Developers/integrations using the API directly are subject to tier limits
- Enables monetization of API access for automation/integration use cases

## Detection Strategies

### Strategy 1: API Keys for Direct Access (Recommended)

#### Overview
The most reliable way to distinguish direct API access from UI access is to require API keys for programmatic access.

#### Implementation

```typescript
// Request Types
1. UI Access: JWT Cookie (existing) → No rate limits
2. Direct API Access: API Key Header → Apply rate limits
```

#### API Key Authentication

```typescript
// backend/middleware/apiKeyAuth.ts

export interface ApiKey {
  keyId: string;
  userId: string;
  hashedKey: string;
  name: string; // e.g., "Production Integration", "Test Key"
  tier: SubscriptionTier;
  scopes: string[]; // Allowed endpoints
  rateLimit: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
  status: 'active' | 'revoked' | 'expired';
  lastUsed?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  error?: string;
}

/**
 * Validate API key from request header
 */
export async function validateApiKey(
  apiKeyHeader: string
): Promise<ApiKeyValidationResult> {
  // API keys should be in format: ltm_live_abc123... or ltm_test_xyz789...
  if (!apiKeyHeader || !apiKeyHeader.startsWith('ltm_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  // Extract key ID from the prefix (e.g., first 8 chars after prefix)
  const keyId = extractKeyId(apiKeyHeader);
  
  // Look up key in database
  const apiKey = await db.query(
    'SELECT * FROM ApiKeys WHERE keyId = @keyId AND status = @status',
    { keyId, status: 'active' }
  );

  if (!apiKey) {
    return { valid: false, error: 'API key not found or inactive' };
  }

  // Verify the hashed key matches
  const hashedKey = hashApiKey(apiKeyHeader);
  if (hashedKey !== apiKey.hashedKey) {
    return { valid: false, error: 'Invalid API key' };
  }

  // Check expiration
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return { valid: false, error: 'API key expired' };
  }

  // Update last used timestamp (async, don't block)
  updateApiKeyLastUsed(keyId).catch(err => {
    logger.warn('Failed to update API key last used', err);
  });

  return { valid: true, apiKey };
}
```

#### Database Schema for API Keys

```sql
-- API Keys table
CREATE TABLE ApiKeys (
  keyId VARCHAR(36) PRIMARY KEY,
  UserId VARCHAR(36) NOT NULL,
  hashedKey VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500),
  tier VARCHAR(50) NOT NULL,
  scopes TEXT, -- JSON array of allowed scopes
  rateLimit TEXT, -- JSON object with rate limits
  status VARCHAR(50) DEFAULT 'active',
  lastUsed DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  expiresAt DATETIME,
  FOREIGN KEY (UserId) REFERENCES Users(UserId),
  INDEX idx_apikeys_user (UserId),
  INDEX idx_apikeys_status (status)
);

-- API Key Usage tracking (separate from general ApiUsage)
CREATE TABLE ApiKeyUsage (
  id VARCHAR(36) PRIMARY KEY,
  keyId VARCHAR(36) NOT NULL,
  UserId VARCHAR(36) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  httpMethod VARCHAR(10) NOT NULL,
  statusCode INT NOT NULL,
  responseTime INT,
  ipAddress VARCHAR(45),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyId) REFERENCES ApiKeys(keyId),
  FOREIGN KEY (UserId) REFERENCES Users(UserId),
  INDEX idx_keyusage_key_time (keyId, timestamp),
  INDEX idx_keyusage_user_time (UserId, timestamp)
);
```

#### Enhanced Middleware with API Key Support

```typescript
// backend/middleware/apiHandler.ts

export interface RequestContext {
  accessType: 'ui' | 'api_key';
  user: UserFromToken;
  apiKey?: ApiKey;
  shouldApplyRateLimit: boolean;
}

/**
 * Enhanced wrapper that distinguishes UI vs API Key access
 */
export function withTierValidation(
  handler: AzureFunction,
  options: ApiHandlerOptions = {}
): AzureFunction {
  return async (context: Context, req: HttpRequest): Promise<void> => {
    const startTime = Date.now();
    const { requireAuth = true, bypassTierCheck = false } = options;

    try {
      // 1. Determine access type and authenticate
      const requestContext = await authenticateRequest(req);
      
      if (!requestContext) {
        context.res = {
          status: 401,
          body: { error: 'Authentication required' },
        };
        return;
      }

      // Attach context to request for handler access
      (req as any).context = requestContext;

      // 2. Apply tier validation ONLY for API key access
      if (requestContext.shouldApplyRateLimit && !bypassTierCheck) {
        const endpoint = context.bindingData.endpoint || req.url;
        
        // Use API key's tier and rate limits if present
        const tierInfo = requestContext.apiKey 
          ? {
              tier: requestContext.apiKey.tier,
              limits: requestContext.apiKey.rateLimit,
              scopes: requestContext.apiKey.scopes
            }
          : await getUserTierInfo(requestContext.user.UserId);

        // Check endpoint scope (for API keys)
        if (requestContext.apiKey) {
          if (!isEndpointInScope(endpoint, requestContext.apiKey.scopes)) {
            context.res = {
              status: 403,
              body: {
                error: 'API key does not have permission for this endpoint',
                allowedScopes: requestContext.apiKey.scopes
              },
            };
            return;
          }
        }

        // Validate tier access and rate limits
        const validation = await validateTierAccess(
          requestContext.user,
          endpoint,
          req.method,
          tierInfo
        );
        
        if (!validation.allowed) {
          context.res = {
            status: validation.statusCode || 403,
            headers: validation.headers || {},
            body: {
              error: validation.reason || 'Access denied',
              tier: tierInfo.tier,
              accessType: requestContext.accessType,
              ...(validation.currentUsage && { currentUsage: validation.currentUsage }),
              ...(validation.limit && { limit: validation.limit }),
            },
          };
          return;
        }
      }

      // 3. Execute the actual handler
      await handler(context, req);

      // 4. Record usage (different tables for UI vs API Key access)
      const responseTime = Date.now() - startTime;
      if (requestContext.shouldApplyRateLimit) {
        await recordApiKeyUsage(
          requestContext.apiKey?.keyId || 'jwt',
          requestContext.user.UserId,
          context.bindingData.endpoint || req.url,
          req.method,
          context.res?.status || 200,
          responseTime,
          req.headers['x-forwarded-for'] || req.headers['x-real-ip']
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

/**
 * Determine request type and authenticate
 */
async function authenticateRequest(req: HttpRequest): Promise<RequestContext | null> {
  // Check for API key in header
  const apiKeyHeader = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (apiKeyHeader && apiKeyHeader.startsWith('ltm_')) {
    // This is an API key request
    const validation = await validateApiKey(apiKeyHeader);
    
    if (!validation.valid || !validation.apiKey) {
      return null;
    }

    // Get user info from API key
    const user = await getUserById(validation.apiKey.userId);
    
    return {
      accessType: 'api_key',
      user: user,
      apiKey: validation.apiKey,
      shouldApplyRateLimit: true, // Always apply limits for API key access
    };
  }

  // Check for JWT cookie (UI access)
  const jwtToken = req.cookies?.access_token;
  
  if (jwtToken) {
    // This is a UI request
    const user = await verifyToken(jwtToken);
    
    if (!user) {
      return null;
    }

    return {
      accessType: 'ui',
      user: user,
      shouldApplyRateLimit: false, // No rate limits for UI access
    };
  }

  return null;
}
```

### Strategy 2: Origin/Referer Header Detection (Supplementary)

As a secondary measure, you can check request origins:

```typescript
// backend/middleware/originDetection.ts

export function detectAccessType(req: HttpRequest): 'ui' | 'external' {
  // Check Origin header
  const origin = req.headers.origin || req.headers.referer;
  
  // List of your UI domains
  const uiDomains = [
    process.env.APP_URL,
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    'http://localhost:3000', // Development
  ];

  if (origin && uiDomains.some(domain => origin.startsWith(domain))) {
    return 'ui';
  }

  return 'external';
}
```

**Note**: This method alone is NOT secure as headers can be spoofed. Use it only as a supplementary indicator, never as the primary authentication method.

### Strategy 3: User Agent Analysis (Supplementary)

```typescript
// backend/middleware/userAgentAnalysis.ts

export function analyzeUserAgent(userAgent: string): {
  type: 'browser' | 'api_client' | 'unknown';
  client?: string;
} {
  // Browser indicators
  const browserPatterns = [
    /Mozilla/i,
    /Chrome/i,
    /Safari/i,
    /Firefox/i,
    /Edge/i,
  ];

  // API client indicators
  const apiClientPatterns = [
    /curl/i,
    /axios/i,
    /fetch/i,
    /python-requests/i,
    /PostmanRuntime/i,
    /Insomnia/i,
  ];

  if (browserPatterns.some(pattern => pattern.test(userAgent))) {
    return { type: 'browser' };
  }

  if (apiClientPatterns.some(pattern => pattern.test(userAgent))) {
    const match = apiClientPatterns.find(pattern => pattern.test(userAgent));
    return { type: 'api_client', client: match?.toString() };
  }

  return { type: 'unknown' };
}
```

**Note**: User agents can also be spoofed. Use only for analytics, not security.

## Recommended Approach: API Keys

### Why API Keys are Best

1. **Clear Separation**: Explicit distinction between UI and API access
2. **Granular Control**: Different keys for different purposes (dev, prod, staging)
3. **Revocable**: Can be revoked without affecting UI access
4. **Auditable**: Track exactly what API key was used for each request
5. **Scoped**: Limit API keys to specific endpoints
6. **User-Friendly**: Users understand "create API key for integration"

### Frontend Changes

#### API Key Management UI

```typescript
// src/pages/admin/api-keys.tsx
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import { Delete, ContentCopy, Add } from '@mui/icons-material';
import { useApiGet, useApiPost, useApiDelete } from '@/hooks/useApiQuery';

interface ApiKey {
  keyId: string;
  name: string;
  maskedKey: string; // Only show last 4 chars: ltm_live_****abc123
  tier: string;
  status: string;
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
}

export default function ApiKeysPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const { data: keys, refetch } = useApiGet<{ apiKeys: ApiKey[] }>({
    url: 'user/ApiKeys',
    queryKey: 'userApiKeys',
  });

  const createMutation = useApiPost({
    relatedQueryKeys: ['userApiKeys'],
  });

  const deleteMutation = useApiDelete({
    relatedQueryKeys: ['userApiKeys'],
  });

  const handleCreateKey = async () => {
    const result = await createMutation.mutateAsync({
      url: 'user/ApiKeys',
      data: { name: newKeyName },
    });

    // Show the full key ONCE (never stored or shown again)
    setGeneratedKey(result.apiKey);
    setNewKeyName('');
    setShowCreateDialog(false);
  };

  const handleDeleteKey = async (keyId: string) => {
    if (confirm('Are you sure? This will revoke the API key immediately.')) {
      await deleteMutation.mutateAsync({
        url: `user/ApiKeys/${keyId}`,
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show toast notification
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">API Keys</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowCreateDialog(true)}
          >
            Create API Key
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          API keys allow programmatic access to your account. They are subject to your 
          subscription tier's rate limits. Your web app usage is NOT affected by these limits.
        </Alert>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Key</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Used</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {keys?.apiKeys.map((key) => (
              <TableRow key={key.keyId}>
                <TableCell>{key.name}</TableCell>
                <TableCell>
                  <code>{key.maskedKey}</code>
                </TableCell>
                <TableCell>
                  <Chip label={key.tier} size="small" />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={key.status} 
                    size="small" 
                    color={key.status === 'active' ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {key.lastUsed ? new Date(key.lastUsed).toLocaleString() : 'Never'}
                </TableCell>
                <TableCell>
                  {new Date(key.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDeleteKey(key.keyId)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)}>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Key Name"
              fullWidth
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Production Integration"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateKey} variant="contained">
              Create
            </Button>
          </DialogActions>
        </Dialog>

        {/* Generated Key Dialog */}
        <Dialog 
          open={!!generatedKey} 
          onClose={() => setGeneratedKey(null)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>API Key Created</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Copy this key now. You won't be able to see it again!
            </Alert>
            <Box sx={{ 
              bgcolor: 'grey.100', 
              p: 2, 
              borderRadius: 1,
              fontFamily: 'monospace',
              wordBreak: 'break-all'
            }}>
              {generatedKey}
            </Box>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={() => copyToClipboard(generatedKey!)}
              sx={{ mt: 2 }}
            >
              Copy to Clipboard
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGeneratedKey(null)} variant="contained">
              I've Saved My Key
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}
```

### Backend API Endpoints for API Keys

```typescript
// backend/functions/ApiKeys/Create.ts
export const createApiKey: AzureFunction = async (
  context: Context,
  req: HttpRequest
): Promise<void> => {
  const user = (req as any).context.user;
  const { name, scopes, expiresAt } = req.body;

  // Generate API key
  const keyId = generateUUID();
  const apiKey = generateSecureApiKey('live'); // ltm_live_abc123...
  const hashedKey = hashApiKey(apiKey);

  // Get user's subscription tier
  const tierInfo = await getUserTierInfo(user.UserId);

  // Insert into database
  await db.execute(
    `INSERT INTO ApiKeys 
     (keyId, UserId, hashedKey, name, tier, scopes, rateLimit, status, createdAt, expiresAt)
     VALUES (@keyId, @userId, @hashedKey, @name, @tier, @scopes, @rateLimit, @status, @created, @expiresAt)`,
    {
      keyId,
      userId: user.UserId,
      hashedKey,
      name: name || 'Unnamed Key',
      tier: tierInfo.tier,
      scopes: JSON.stringify(scopes || ['*']),
      rateLimit: JSON.stringify(tierInfo.limits),
      status: 'active',
      created: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }
  );

  // Return the full key ONCE (never stored in plain text)
  context.res = {
    status: 201,
    body: {
      apiKey: apiKey, // Full key, shown once
      keyId: keyId,
      name: name,
      tier: tierInfo.tier,
    },
  };
};

// Export with tier validation, but bypass rate limits for key management
export default withTierValidation(createApiKey, {
  requireAuth: true,
  bypassTierCheck: true, // Creating keys is not rate limited
});
```

### Rate Limiting Logic for API Keys

```typescript
// backend/services/rateLimitService.ts

export async function checkApiKeyRateLimit(
  apiKey: ApiKey
): Promise<RateLimitCheckResult> {
  const userId = apiKey.userId;
  const limits = apiKey.rateLimit;
  
  // Use separate Redis keys for API key access
  const hourlyKey = `ratelimit:apikey:${apiKey.keyId}:hourly`;
  const dailyKey = `ratelimit:apikey:${apiKey.keyId}:daily`;

  const [hourlyUsage, dailyUsage] = await Promise.all([
    redis.zcount(hourlyKey, Date.now() - HOUR_MS, '+inf'),
    redis.zcount(dailyKey, Date.now() - DAY_MS, '+inf'),
  ]);

  // Check hourly limit
  if (limits.requestsPerHour !== -1 && hourlyUsage >= limits.requestsPerHour) {
    return {
      allowed: false,
      reason: 'API key hourly rate limit exceeded',
      currentUsage: hourlyUsage,
      limit: limits.requestsPerHour,
      resetAt: new Date(Date.now() + HOUR_MS),
    };
  }

  // Check daily limit
  if (limits.requestsPerDay !== -1 && dailyUsage >= limits.requestsPerDay) {
    return {
      allowed: false,
      reason: 'API key daily rate limit exceeded',
      currentUsage: dailyUsage,
      limit: limits.requestsPerDay,
      resetAt: getNextMidnight(),
    };
  }

  return { allowed: true };
}
```

## Documentation for API Users

### API Documentation Example

```markdown
# LinkToMe API Documentation

## Authentication

### UI Access (No Rate Limits)
When using the LinkToMe web application, you're automatically authenticated via your session. 
No additional authentication is required, and there are no rate limits on UI usage.

### API Access (Rate Limited)
For programmatic access to the API, you need an API key:

1. Log into your LinkToMe account
2. Go to Settings → API Keys
3. Click "Create API Key"
4. Copy the key immediately (it won't be shown again)
5. Include the key in your requests:

```bash
curl https://api.linktome.com/user/Links \
  -H "X-API-Key: ltm_live_your_api_key_here"
```

### Rate Limits by Tier

| Tier | Hourly Limit | Daily Limit | Price |
|------|--------------|-------------|-------|
| Free | 100 requests | 1,000 requests | $0 |
| Basic | 500 requests | 5,000 requests | $9/mo |
| Pro | 2,000 requests | 20,000 requests | $29/mo |
| Enterprise | Unlimited | Unlimited | Custom |

**Note**: Rate limits apply ONLY to API key access. Your web application usage is unlimited.

### Rate Limit Headers

All API responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 2024-01-15T15:00:00Z
```

### Error Response (Rate Limit Exceeded)

```json
{
  "error": "API key hourly rate limit exceeded",
  "tier": "free",
  "limit": 100,
  "current": 101,
  "resetAt": "2024-01-15T15:00:00Z",
  "upgradeUrl": "https://linktome.com/subscription/upgrade"
}
```
```

## Summary

### Implementation Approach

1. **Primary Method: API Keys**
   - Create API key management system
   - Require API keys for programmatic access
   - Apply rate limits ONLY to API key requests
   - Keep JWT cookie access unlimited (UI)

2. **Key Benefits**
   - Clear separation between UI and API access
   - User-friendly: "Create API key for integrations"
   - Granular control per key
   - Revocable without affecting UI
   - Standard industry practice

3. **Database Changes**
   - Add `ApiKeys` table
   - Add `ApiKeyUsage` table (separate from general usage)
   - Track API key usage separately

4. **Middleware Changes**
   - Detect API key vs JWT authentication
   - Apply rate limits only for API key requests
   - Skip tier validation for UI requests

This approach gives you:
- ✅ Unlimited UI access for all users
- ✅ Tiered API access for programmatic use
- ✅ Clear monetization path
- ✅ Standard industry practice
- ✅ User-friendly key management
