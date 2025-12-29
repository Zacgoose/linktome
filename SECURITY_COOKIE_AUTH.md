# Cookie-Based Authentication Implementation

## Overview

This application has been updated to use HTTP-only cookies for storing authentication tokens instead of localStorage. This provides significant security improvements against XSS (Cross-Site Scripting) attacks.

## Security Benefits

### HTTP-Only Cookies vs localStorage

| Feature | localStorage | HTTP-Only Cookies |
|---------|-------------|-------------------|
| XSS Protection | ❌ Vulnerable | ✅ Protected |
| JavaScript Access | ✅ Full access | ❌ No access (secure) |
| Automatic Transmission | ❌ Manual | ✅ Automatic |
| CSRF Protection | N/A | ✅ With SameSite attribute |
| Secure Transmission | ❌ Not enforced | ✅ With Secure attribute |

### Why HTTP-Only Cookies Are More Secure

1. **XSS Protection**: Even if an attacker injects malicious JavaScript into your application, they cannot access HTTP-only cookies. This prevents token theft through XSS attacks.

2. **Automatic Management**: The browser handles cookie transmission automatically, reducing the risk of implementation errors.

3. **Additional Security Attributes**: Cookies support security attributes like:
   - `HttpOnly`: Prevents JavaScript access
   - `Secure`: Ensures transmission only over HTTPS
   - `SameSite`: Protects against CSRF attacks

## Frontend Changes (Completed)

### Files Modified

1. **`src/utils/api.ts`**
   - Removed `Authorization` header with Bearer token
   - Added `withCredentials: true` to all axios requests
   - Removed localStorage token operations

2. **`src/hooks/useApiQuery.ts`**
   - Removed token extraction from localStorage
   - Added `withCredentials: true` to axios configuration
   - Updated request logic to rely on cookies

3. **`src/providers/AuthProvider.tsx`**
   - Removed access token and refresh token from localStorage
   - Kept only user profile in localStorage (non-sensitive UI state)
   - Updated refresh token logic to work with cookies

4. **`src/pages/login.tsx`**
   - Removed token storage on login/signup
   - Backend now sets tokens as HTTP-only cookies

### What Still Uses localStorage

- **User Profile Data**: Non-sensitive user information (username, email, roles) is stored in localStorage for UI state management. This does not include any tokens or secrets.
- **UI Theme Preference**: User's theme selection
- **Selected Context**: RBAC context selection

## Backend Changes Required

The backend API must be updated to support cookie-based authentication. Below are the required changes:

### 1. Login Endpoint (`POST /api/public/Login`)

**Current Behavior:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... }
}
```

**Required Changes:**
- Set `accessToken` as HTTP-only cookie
- Set `refreshToken` as HTTP-only cookie
- Still return user profile in response body (not sensitive)

**Cookie Configuration:**
```
Set-Cookie: accessToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/public/RefreshToken; Max-Age=604800
```

**Response Body:**
```json
{
  "user": { ... }
}
```

### 2. Signup Endpoint (`POST /api/public/Signup`)

Same requirements as Login endpoint.

### 3. Refresh Token Endpoint (`POST /api/public/RefreshToken`)

**Current Behavior:**
- Receives refresh token in request body
- Returns new tokens in response body

**Required Changes:**
- Read `refreshToken` from cookie header
- Set new `accessToken` cookie
- Set new `refreshToken` cookie
- Return user profile in response body

**Request:**
```
Cookie: refreshToken=<token>
```

**Response:**
```
Set-Cookie: accessToken=<new-token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
Set-Cookie: refreshToken=<new-token>; HttpOnly; Secure; SameSite=Strict; Path=/api/public/RefreshToken; Max-Age=604800
```

**Response Body:**
```json
{
  "user": { ... }
}
```

### 4. Logout Endpoint (`POST /api/public/Logout`)

**Required Changes:**
- Clear both cookies by setting them with past expiration dates

**Response:**
```
Set-Cookie: accessToken=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/public/RefreshToken; Max-Age=0
```

### 5. Protected Endpoints (All authenticated routes)

**Current Behavior:**
- Read token from `Authorization` header: `Bearer <token>`

**Required Changes:**
- **Primary**: Read `accessToken` from cookie
- **Fallback**: Support `Authorization` header for backward compatibility during migration

**Example Implementation (Pseudocode):**
```javascript
function getAccessToken(request) {
  // Try cookie first (preferred)
  const cookieToken = request.cookies.accessToken;
  if (cookieToken) return cookieToken;
  
  // Fallback to Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}
```

### Cookie Attributes Explained

- **`HttpOnly`**: Prevents JavaScript access (critical for security)
- **`Secure`**: Only transmitted over HTTPS (use in production)
- **`SameSite=Strict`**: Prevents CSRF attacks by not sending cookie with cross-site requests
- **`Path`**: Limits which endpoints receive the cookie
  - `accessToken`: `/` (all API endpoints)
  - `refreshToken`: `/api/public/RefreshToken` (only refresh endpoint)
- **`Max-Age`**: Cookie lifetime in seconds
  - `accessToken`: 900 seconds (15 minutes)
  - `refreshToken`: 604800 seconds (7 days)
- **`Domain`**: Optional - set to your domain for subdomain sharing

### Development vs Production

**Development (HTTP):**
```
Set-Cookie: accessToken=<token>; HttpOnly; SameSite=Strict; Path=/; Max-Age=900
```

**Production (HTTPS):**
```
Set-Cookie: accessToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
```

The `Secure` attribute should only be used in production with HTTPS.

## CORS Configuration

Since the frontend now sends cookies with requests (`withCredentials: true`), the backend must properly configure CORS:

```javascript
// Example CORS configuration
Access-Control-Allow-Origin: https://your-frontend-domain.com  // Must be specific, not *
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

**Important:** When using `withCredentials: true`, `Access-Control-Allow-Origin` cannot be `*`. It must be a specific origin.

## Testing the Implementation

### 1. Verify Cookies Are Set

After login, open browser DevTools → Application → Cookies and verify:
- `accessToken` cookie exists
- `refreshToken` cookie exists
- Both have `HttpOnly` flag
- Both have `Secure` flag (in production)

### 2. Verify JavaScript Cannot Access Tokens

Open browser console and try:
```javascript
document.cookie  // Should not show HttpOnly cookies
localStorage.getItem('accessToken')  // Should return null
```

### 3. Verify Authenticated Requests Work

Make API calls to protected endpoints and verify:
- Requests succeed with valid cookies
- Requests fail with 401 when cookies are missing/expired

### 4. Verify Token Refresh Works

Wait for access token to expire and verify:
- Application automatically refreshes token
- New cookies are set
- User session continues seamlessly

### 5. Verify Logout Clears Cookies

After logout, verify:
- Both cookies are removed from browser
- Subsequent requests to protected endpoints fail with 401

## Migration Strategy

### Phase 1: Backend Preparation
1. Update backend to support both cookie and header-based authentication
2. Update login/signup to set cookies in addition to returning tokens
3. Deploy backend changes

### Phase 2: Frontend Deployment
1. Deploy frontend changes (this PR)
2. Frontend now uses cookies exclusively
3. Monitor for any issues

### Phase 3: Backend Cleanup
1. Remove token fields from login/signup response bodies (keep only user profile)
2. Remove support for Authorization header (cookies only)
3. Deploy final backend changes

## Troubleshooting

### Cookies Not Being Set

**Check:**
1. CORS headers include `Access-Control-Allow-Credentials: true`
2. `Access-Control-Allow-Origin` is specific, not `*`
3. Cookie path is correct
4. Domain attribute (if set) matches your domain

### Cookies Not Being Sent

**Check:**
1. Frontend uses `withCredentials: true` on all requests
2. Cookie hasn't expired (check Max-Age)
3. Path matches the request URL
4. For cross-origin: origin matches CORS configuration

### Authentication Fails After Refresh

**Check:**
1. Refresh token endpoint reads from cookie, not body
2. Refresh token cookie path is correct
3. New cookies are being set with correct Max-Age

## Security Best Practices

1. **Always use HTTPS in production** - Required for `Secure` attribute
2. **Use `SameSite=Strict`** - Prevents CSRF attacks
3. **Keep token lifetimes short** - 15 minutes for access, 7 days for refresh
4. **Implement token rotation** - Issue new refresh token on each refresh
5. **Log refresh token usage** - Detect suspicious refresh patterns
6. **Implement rate limiting** - On login and refresh endpoints
7. **Monitor for anomalies** - Unusual refresh patterns, geographic anomalies

## Additional Resources

- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [SameSite Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
