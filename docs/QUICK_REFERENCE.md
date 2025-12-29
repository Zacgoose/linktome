# Quick Reference: UI vs API Access

## The Key Distinction

### ✅ UI Access (Web Application)
**Authentication**: JWT Token in HTTP-only cookie  
**Rate Limits**: NONE - Completely unlimited  
**Use Case**: Users browsing the web application  
**How it works**: Automatic with user login  

### 🔑 Direct API Access (Programmatic)
**Authentication**: API Key in `X-API-Key` header  
**Rate Limits**: YES - Based on subscription tier  
**Use Case**: Integrations, automation, external apps  
**How it works**: User creates API key in settings  

## Authentication Flow

```
┌─────────────────────────────────────────────────────┐
│              Request Arrives at Backend             │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │ Check Headers    │
              └────────┬────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────┐            ┌────────────────┐
│ X-API-Key     │            │ JWT Cookie     │
│ Present?      │            │ Present?       │
└───────┬───────┘            └────────┬───────┘
        │                             │
        ▼                             ▼
┌───────────────┐            ┌────────────────┐
│ Validate      │            │ Validate JWT   │
│ API Key       │            │ Token          │
└───────┬───────┘            └────────┬───────┘
        │                             │
        ▼                             ▼
┌───────────────┐            ┌────────────────┐
│ APPLY RATE    │            │ NO RATE        │
│ LIMITS        │            │ LIMITS         │
│               │            │                │
│ Track usage   │            │ UI Access      │
│ per API key   │            │ unlimited      │
└───────┬───────┘            └────────┬───────┘
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Execute        │
              │ Business Logic │
              └────────────────┘
```

## Example Requests

### UI Request (Unlimited)
```javascript
// From Next.js web app - automatically includes JWT cookie
fetch('/api/user/Links', {
  method: 'GET',
  credentials: 'include', // Sends JWT cookie
});

// Response: Always succeeds (if authenticated)
// No rate limit headers
```

### API Request (Rate Limited)
```bash
# Direct API call with API key
curl https://api.linktome.com/user/Links \
  -H "X-API-Key: ltm_live_abc123def456ghi789"

# Response includes rate limit info:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 87
# X-RateLimit-Reset: 2024-01-15T15:00:00Z
```

## Database Tables

### For API Keys
```sql
ApiKeys
├── keyId (PK)
├── UserId (FK)
├── hashedKey
├── name
├── tier
├── rateLimit (JSON)
├── status
└── lastUsed

ApiKeyUsage
├── id (PK)
├── keyId (FK)
├── UserId (FK)
├── endpoint
├── timestamp
└── statusCode
```

### Rate Limiting Keys in Redis
```
# API Key Rate Limits (checked)
ratelimit:apikey:{keyId}:hourly
ratelimit:apikey:{keyId}:daily

# JWT/UI Access (NOT checked)
# No Redis keys needed for UI access
```

## Tier Limits (API Keys Only)

| Tier | API Calls/Hour | API Calls/Day | UI Access |
|------|----------------|---------------|-----------|
| Free | 100 | 1,000 | Unlimited |
| Basic | 500 | 5,000 | Unlimited |
| Pro | 2,000 | 20,000 | Unlimited |
| Enterprise | Unlimited | Unlimited | Unlimited |

## Middleware Logic

```typescript
async function authenticateRequest(req) {
  // Check for API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey?.startsWith('ltm_')) {
    const validation = await validateApiKey(apiKey);
    return {
      accessType: 'api_key',
      user: await getUserById(validation.apiKey.userId),
      apiKey: validation.apiKey,
      shouldApplyRateLimit: true, // ← RATE LIMIT THIS
    };
  }

  // Check for JWT cookie
  const jwtToken = req.cookies?.access_token;
  if (jwtToken) {
    const user = await verifyToken(jwtToken);
    return {
      accessType: 'ui',
      user: user,
      shouldApplyRateLimit: false, // ← NO RATE LIMIT
    };
  }

  return null; // Unauthorized
}
```

## User Experience

### Creating an API Key (Web UI)

1. User logs into web app (unlimited access)
2. Goes to Settings → API Keys
3. Clicks "Create API Key"
4. Names the key (e.g., "Production Integration")
5. Key is generated: `ltm_live_abc123...`
6. User copies key (shown only once)
7. Key is ready to use in external applications

### Using the API Key

```python
# Python example
import requests

API_KEY = "ltm_live_abc123def456ghi789"

response = requests.get(
    "https://api.linktome.com/user/Links",
    headers={"X-API-Key": API_KEY}
)

# Check rate limit status
print(f"Remaining: {response.headers['X-RateLimit-Remaining']}")
print(f"Limit: {response.headers['X-RateLimit-Limit']}")
print(f"Resets: {response.headers['X-RateLimit-Reset']}")
```

## Error Responses

### Rate Limit Exceeded (API Key)
```json
{
  "error": "API key hourly rate limit exceeded",
  "tier": "free",
  "accessType": "api_key",
  "currentUsage": 101,
  "limit": 100,
  "resetAt": "2024-01-15T15:00:00Z",
  "upgradeUrl": "/subscription/upgrade"
}
```

### Invalid API Key
```json
{
  "error": "Invalid API key",
  "accessType": "api_key"
}
```

## Security Notes

### What This Prevents
✅ API abuse from external integrations  
✅ Scraping via direct API calls  
✅ Excessive automated requests  
✅ Unauthorized programmatic access  

### What This Allows
✅ Unlimited browsing of web application  
✅ Normal user interactions  
✅ Multiple sessions per user  
✅ Admin operations without limits  

## Monetization Strategy

### Free Users
- Can use web app normally (unlimited)
- Get 100 API calls/hour if they create an API key
- Upgrade prompt when hitting API limits

### Paid Users
- Still unlimited web app access
- Higher API limits for integrations
- Perfect for:
  - Automation scripts
  - Mobile apps
  - Third-party integrations
  - Zapier/IFTTT connections

## Implementation Checklist

- [ ] Create ApiKeys table
- [ ] Create ApiKeyUsage table
- [ ] Implement API key generation
- [ ] Implement API key validation middleware
- [ ] Update authentication middleware to detect access type
- [ ] Implement rate limiting for API keys only
- [ ] Create API key management UI
- [ ] Add API key CRUD endpoints
- [ ] Update API documentation
- [ ] Add rate limit headers to API responses
- [ ] Test UI access (should be unlimited)
- [ ] Test API key access (should be limited)
- [ ] Monitor API key usage separately

## Key Takeaways

1. **Two Authentication Methods**: JWT cookies (UI) and API keys (programmatic)
2. **Rate Limits Apply To**: API keys only
3. **UI is Always Free**: No matter what tier
4. **Clear Monetization**: Charge for API integrations, not web usage
5. **Industry Standard**: Common pattern (GitHub, Stripe, etc.)
6. **User Friendly**: Easy to understand and manage

---

**For detailed implementation, see**: [UI_VS_API_ACCESS.md](./UI_VS_API_ACCESS.md)  
**For complete architecture, see**: [API_TIER_RESTRICTIONS.md](./API_TIER_RESTRICTIONS.md)
