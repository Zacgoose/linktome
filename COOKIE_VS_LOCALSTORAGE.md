# Authentication Token Storage: Cookie vs localStorage Analysis

## Question
"Can we look at moving the tokens and refresh token to using site cookies/session storage for better security? Does this provide any benefit over local browser storage?"

## Answer: YES - HTTP-Only Cookies Provide Significant Security Benefits

### Security Comparison

| Security Aspect | localStorage | sessionStorage | HTTP-Only Cookies |
|----------------|--------------|----------------|-------------------|
| **XSS Protection** | ❌ Vulnerable | ❌ Vulnerable | ✅ **Protected** |
| **JavaScript Access** | ✅ Full Access | ✅ Full Access | ❌ **No Access (Secure)** |
| **Session Persistence** | ✅ Persists | ⚠️ Tab-only | ✅ Configurable |
| **CSRF Protection** | N/A | N/A | ✅ **With SameSite** |
| **Automatic Transmission** | ❌ Manual | ❌ Manual | ✅ **Automatic** |
| **Secure HTTPS Enforcement** | ❌ No | ❌ No | ✅ **With Secure flag** |

### Key Security Benefits

#### 1. Protection Against XSS Attacks (Most Important!)
- **localStorage/sessionStorage**: If an attacker injects malicious JavaScript into your app (XSS attack), they can easily steal tokens:
  ```javascript
  // Attacker's malicious code
  const token = localStorage.getItem('accessToken');
  sendToAttacker(token); // Now they have your token!
  ```

- **HTTP-Only Cookies**: Tokens are completely inaccessible to JavaScript, even if XSS occurs:
  ```javascript
  // Attacker tries but FAILS
  document.cookie; // HTTP-only cookies are NOT included here!
  ```

#### 2. CSRF Protection
- Cookies with `SameSite=Strict` or `SameSite=Lax` prevent cross-site request forgery
- Browser automatically enforces that cookies are only sent with requests from the same site

#### 3. Secure Transmission
- `Secure` flag ensures tokens are only sent over HTTPS
- Prevents token interception over insecure connections

## What sessionStorage Provides (NOT RECOMMENDED)

sessionStorage offers **NO security benefit** over localStorage:
- ✅ **Only benefit**: Cleared when browser tab closes (inconvenient for users)
- ❌ **Same XSS vulnerability**: Still accessible via JavaScript
- ❌ **No additional protection**: Attacker can still steal tokens

**Verdict**: sessionStorage provides user inconvenience without security improvement.

## Implementation Completed

### What Was Changed

#### Frontend (This Repository) ✅
All token storage has been removed from localStorage:

1. **`src/utils/api.ts`**
   - Removed Authorization header with Bearer token
   - Added `withCredentials: true` to send cookies automatically

2. **`src/hooks/useApiQuery.ts`**
   - Removed token extraction from localStorage
   - Added `withCredentials: true` to axios configuration

3. **`src/providers/AuthProvider.tsx`**
   - Removed `accessToken` and `refreshToken` from localStorage
   - Tokens now managed by HTTP-only cookies (set by backend)
   - Kept user profile in localStorage (non-sensitive UI state)

4. **`src/pages/login.tsx`**
   - Removed token storage on login/signup
   - Backend sets tokens as HTTP-only cookies

### What Still Uses localStorage

Non-sensitive data that doesn't compromise security:
- **User profile** (username, email, roles) - For UI state, not authentication
- **UI theme preference** - User's dark/light mode choice
- **Selected RBAC context** - UI state for role switching

These are safe in localStorage because:
1. They don't grant access to the system (tokens do)
2. They're user-specific, not system secrets
3. XSS attacks stealing this data don't compromise security

## What Backend Needs to Do

The backend API must be updated to support cookie-based authentication:

### 1. Set Cookies on Login/Signup
```
Set-Cookie: accessToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/public/RefreshToken; Max-Age=604800
```

### 2. Read Cookies on Requests
Instead of reading from `Authorization` header, read from cookie header.

### 3. Clear Cookies on Logout
Set cookies with `Max-Age=0` to clear them.

**See `SECURITY_COOKIE_AUTH.md` for complete backend implementation guide.**

## Migration Path

### Current State (Before This Change)
```
┌─────────┐     Login     ┌─────────┐
│ Browser │────────────→  │   API   │
└─────────┘               └─────────┘
     ↓                         ↓
     ↓                    Returns tokens
     ↓                    in response body
     ↓
Stores tokens in
localStorage
(Vulnerable to XSS!)
```

### New State (After This Change)
```
┌─────────┐     Login     ┌─────────┐
│ Browser │────────────→  │   API   │
└─────────┘               └─────────┘
     ↑                         ↓
     └──────────────────────Sets tokens
         HTTP-only cookies  as cookies
         (Protected from XSS!)
```

## Real-World Impact

### Before (localStorage)
If your site has an XSS vulnerability:
1. Attacker injects `<script>` tag
2. Script reads `localStorage.getItem('accessToken')`
3. **Attacker now has full access to user's account**
4. Can perform any action as the user
5. Can steal sensitive data

### After (HTTP-only Cookies)
If your site has an XSS vulnerability:
1. Attacker injects `<script>` tag
2. Script tries to access cookies but **fails** (HTTP-only)
3. **Attacker cannot access user's account**
4. Tokens are safe
5. XSS attack is limited to what's visible on page

## Industry Best Practices

**OWASP (Open Web Application Security Project) Recommendations:**
- ✅ Use HTTP-only cookies for authentication tokens
- ✅ Use Secure flag for HTTPS-only transmission
- ✅ Use SameSite flag for CSRF protection
- ❌ Avoid storing sensitive data in localStorage/sessionStorage

**Major platforms using HTTP-only cookies:**
- GitHub
- Google
- Facebook
- Twitter
- AWS
- Microsoft Azure

## Conclusion

**Answer to your question: YES, moving to HTTP-only cookies provides SIGNIFICANT security benefits over localStorage.**

The implementation is complete on the frontend side. The backend API now needs to be updated to set HTTP-only cookies instead of returning tokens in the response body.

**Benefits:**
- ✅ Protection against XSS attacks (major security improvement)
- ✅ CSRF protection with SameSite attribute
- ✅ Secure HTTPS-only transmission
- ✅ Automatic cookie management by browser
- ✅ Follows industry best practices

**Recommendation:**
- ✅ **Use HTTP-only cookies** (what we implemented)
- ❌ **DO NOT use sessionStorage** (no security benefit, just inconvenience)
- ❌ **DO NOT use localStorage for tokens** (vulnerable to XSS)
