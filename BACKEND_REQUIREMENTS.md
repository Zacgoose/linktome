# Backend API Changes Required for Secure Cookie-Based Authentication

## Executive Summary for Backend Engineer

The frontend has been updated to use HTTP-only cookies for authentication tokens instead of localStorage. This provides protection against XSS attacks by making tokens inaccessible to JavaScript.

**Your task**: Update the backend API to set tokens as HTTP-only cookies instead of returning them in the response body.

## Why This Change Is Important

**Current Security Issue**: Tokens in localStorage can be stolen by any XSS attack
```javascript
// Attacker's malicious script
const token = localStorage.getItem('accessToken');
sendToAttacker(token); // ← User account compromised!
```

**After This Change**: Tokens in HTTP-only cookies cannot be accessed by JavaScript
```javascript
// Attacker tries but FAILS
document.cookie; // HTTP-only cookies are NOT included here!
```

## Required Changes Overview

You need to update **4 endpoints** and **1 configuration**:

1. ✏️ **Login Endpoint** - Set cookies, return only user profile
2. ✏️ **Signup Endpoint** - Set cookies, return only user profile  
3. ✏️ **Refresh Token Endpoint** - Read from cookie, set new cookies
4. ✏️ **Logout Endpoint** - Clear cookies
5. ⚙️ **CORS Configuration** - Enable credentials

---

## 1. Login Endpoint Changes

### Current Implementation
```javascript
// POST /api/public/Login
app.post('/api/public/Login', async (req, res) => {
  const { email, password } = req.body;
  
  // Authenticate user...
  const user = await authenticateUser(email, password);
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  // ❌ CURRENT: Return tokens in response body
  res.json({
    accessToken: accessToken,
    refreshToken: refreshToken,
    user: user
  });
});
```

### Required Changes
```javascript
// POST /api/public/Login
app.post('/api/public/Login', async (req, res) => {
  const { email, password } = req.body;
  
  // Authenticate user...
  const user = await authenticateUser(email, password);
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  // ✅ NEW: Set tokens as HTTP-only cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,           // ← Cannot be accessed by JavaScript
    secure: true,             // ← Only sent over HTTPS (use false in dev)
    sameSite: 'strict',       // ← CSRF protection
    maxAge: 15 * 60 * 1000,  // ← 15 minutes in milliseconds
    path: '/'                 // ← Available to all routes
  });
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,  // ← 7 days in milliseconds
    path: '/api/public/RefreshToken'   // ← Only sent to refresh endpoint
  });
  
  // ✅ Return only user profile (no tokens)
  res.json({
    user: user
  });
});
```

### Cookie Attributes Explained

| Attribute | Value | Why It's Important |
|-----------|-------|-------------------|
| `httpOnly` | `true` | **CRITICAL**: Prevents JavaScript access. This is the main security benefit! |
| `secure` | `true` | Ensures cookie only sent over HTTPS. Use `false` in local development, `true` in production. |
| `sameSite` | `'strict'` | Prevents CSRF attacks. Cookie only sent with requests from your domain. |
| `maxAge` | milliseconds | How long cookie lasts. accessToken: 15 min, refreshToken: 7 days. |
| `path` | `/` or specific path | Which endpoints receive this cookie. |

### Development vs Production

**Local Development** (HTTP):
```javascript
res.cookie('accessToken', accessToken, {
  httpOnly: true,
  secure: false,    // ← false for HTTP
  sameSite: 'lax',  // ← lax for local testing (strict may cause issues)
  maxAge: 15 * 60 * 1000,
  path: '/'
});
```

**Production** (HTTPS):
```javascript
res.cookie('accessToken', accessToken, {
  httpOnly: true,
  secure: true,     // ← true for HTTPS
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000,
  path: '/'
});
```

**Recommended**: Use environment variable to switch:
```javascript
const isProduction = process.env.NODE_ENV === 'production';

res.cookie('accessToken', accessToken, {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  maxAge: 15 * 60 * 1000,
  path: '/'
});
```

---

## 2. Signup Endpoint Changes

### Required Changes
Same as Login endpoint - set cookies instead of returning tokens:

```javascript
// POST /api/public/Signup
app.post('/api/public/Signup', async (req, res) => {
  const { email, username, password } = req.body;
  
  // Create user...
  const user = await createUser(email, username, password);
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  // ✅ Set tokens as HTTP-only cookies
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/'
  });
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/public/RefreshToken'
  });
  
  // ✅ Return only user profile
  res.json({
    user: user
  });
});
```

---

## 3. Refresh Token Endpoint Changes

This is the most important change - the endpoint must read the refresh token from cookies, not the request body.

### Current Implementation
```javascript
// POST /api/public/RefreshToken
app.post('/api/public/RefreshToken', async (req, res) => {
  // ❌ CURRENT: Read from request body
  const { refreshToken } = req.body;
  
  // Verify and generate new tokens...
  const decoded = verifyRefreshToken(refreshToken);
  const newAccessToken = generateAccessToken(decoded);
  const newRefreshToken = generateRefreshToken(decoded);
  
  // ❌ CURRENT: Return in response body
  res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: decoded.user
  });
});
```

### Required Changes
```javascript
// POST /api/public/RefreshToken
app.post('/api/public/RefreshToken', async (req, res) => {
  // ✅ NEW: Read from cookie
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token provided' });
  }
  
  try {
    // Verify and generate new tokens...
    const decoded = verifyRefreshToken(refreshToken);
    const newAccessToken = generateAccessToken(decoded);
    const newRefreshToken = generateRefreshToken(decoded);
    
    // ✅ NEW: Set new tokens as cookies
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });
    
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/public/RefreshToken'
    });
    
    // ✅ Return only user profile
    res.json({
      user: decoded.user
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

**Important**: Make sure your framework has cookie-parser middleware enabled:
```javascript
// Express.js example
const cookieParser = require('cookie-parser');
app.use(cookieParser());
```

---

## 4. Logout Endpoint Changes

### Required Changes
Clear both cookies by setting them with maxAge: 0:

```javascript
// POST /api/public/Logout
app.post('/api/public/Logout', async (req, res) => {
  // ✅ Clear accessToken cookie
  res.cookie('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 0,
    path: '/'
  });
  
  // ✅ Clear refreshToken cookie
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 0,
    path: '/api/public/RefreshToken'
  });
  
  res.json({ message: 'Logged out successfully' });
});
```

---

## 5. Protected Endpoints - Reading Tokens

All your protected endpoints need to read the access token from cookies instead of the Authorization header.

### Current Implementation
```javascript
// Example protected endpoint
app.get('/api/protected/data', authenticateToken, async (req, res) => {
  // Your route logic...
});

// ❌ CURRENT: Middleware reads from Authorization header
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // Verify token...
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}
```

### Required Changes
```javascript
// ✅ NEW: Middleware reads from cookie (with Authorization header fallback)
function authenticateToken(req, res, next) {
  // Try cookie first (preferred)
  let token = req.cookies.accessToken;
  
  // Fallback to Authorization header (for backward compatibility)
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // Verify token...
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}
```

**Note**: The fallback to Authorization header is optional but recommended during migration. Once all clients are using cookies, you can remove the fallback.

---

## 6. CORS Configuration (CRITICAL!)

When using cookies with `withCredentials: true`, CORS must be configured correctly or requests will fail.

### Current Configuration (Won't Work)
```javascript
// ❌ This will NOT work with cookies
app.use(cors({
  origin: '*',  // ← Wildcards don't work with credentials!
  credentials: false
}));
```

### Required Configuration
```javascript
// ✅ Correct CORS configuration for cookies
app.use(cors({
  origin: 'https://your-frontend-domain.com',  // ← Must be specific!
  credentials: true  // ← REQUIRED for cookies
}));
```

### Multiple Origins (if needed)
```javascript
const allowedOrigins = [
  'https://your-frontend-domain.com',
  'https://www.your-frontend-domain.com',
  'http://localhost:3000'  // For local development
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('Not allowed by CORS'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
```

### Why This Is Required

| Setting | Value | Why |
|---------|-------|-----|
| `origin` | Specific URL | Cannot use `*` with `credentials: true`. Browser security requirement. |
| `credentials` | `true` | Tells browser to include cookies in cross-origin requests. |

**Common Error**: If you see this error in browser console, CORS is misconfigured:
```
Access to XMLHttpRequest at 'http://api.example.com/api/public/Login' from origin 
'http://localhost:3000' has been blocked by CORS policy: The value of the 
'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' 
when the request's credentials mode is 'include'.
```

---

## Implementation Checklist

Use this checklist to track your progress:

### Login/Signup Endpoints
- [ ] Login endpoint sets `accessToken` cookie (httpOnly: true)
- [ ] Login endpoint sets `refreshToken` cookie (httpOnly: true)
- [ ] Login returns only user profile (no tokens in body)
- [ ] Signup endpoint sets `accessToken` cookie (httpOnly: true)
- [ ] Signup endpoint sets `refreshToken` cookie (httpOnly: true)
- [ ] Signup returns only user profile (no tokens in body)
- [ ] Cookie `secure` attribute based on environment (dev/prod)
- [ ] Cookie `sameSite` attribute set to 'strict' (or 'lax' in dev)
- [ ] Cookie `maxAge` set correctly (15 min for access, 7 days for refresh)
- [ ] Cookie `path` set correctly ('/' for access, '/api/public/RefreshToken' for refresh)

### Refresh Token Endpoint
- [ ] Reads `refreshToken` from `req.cookies.refreshToken`
- [ ] Returns 401 if no refresh token in cookie
- [ ] Sets new `accessToken` cookie
- [ ] Sets new `refreshToken` cookie
- [ ] Returns only user profile (no tokens in body)

### Logout Endpoint
- [ ] Clears `accessToken` cookie (maxAge: 0)
- [ ] Clears `refreshToken` cookie (maxAge: 0)

### Protected Endpoints
- [ ] Authentication middleware reads token from cookie first
- [ ] Falls back to Authorization header (optional, for backward compatibility)
- [ ] All protected routes use updated middleware

### CORS Configuration
- [ ] `origin` set to specific domain (not '*')
- [ ] `credentials` set to `true`
- [ ] Handles multiple origins if needed (dev + prod)
- [ ] Tested OPTIONS preflight requests work

### Cookie Parser Middleware
- [ ] Cookie parser middleware installed and enabled
- [ ] Placed before route handlers

---

## Testing Your Changes

### 1. Test Login Sets Cookies
```bash
curl -X POST http://localhost:YOUR_PORT/api/public/Login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt \
  -v
```

**Expected**: Look for `Set-Cookie` headers in response:
```
< Set-Cookie: accessToken=eyJhbG...; Path=/; HttpOnly; SameSite=Lax
< Set-Cookie: refreshToken=eyJhbG...; Path=/api/public/RefreshToken; HttpOnly; SameSite=Lax
```

### 2. Test Protected Endpoint with Cookie
```bash
curl -X GET http://localhost:YOUR_PORT/api/protected/data \
  -b cookies.txt \
  -v
```

**Expected**: Request succeeds with user data

### 3. Test Refresh Token
```bash
curl -X POST http://localhost:YOUR_PORT/api/public/RefreshToken \
  -b cookies.txt \
  -c cookies_new.txt \
  -v
```

**Expected**: New cookies are set

### 4. Test Logout
```bash
curl -X POST http://localhost:YOUR_PORT/api/public/Logout \
  -b cookies.txt \
  -c cookies_after_logout.txt \
  -v
```

**Expected**: Cookie values are empty or maxAge=0

### 5. Test CORS with Frontend
Open browser DevTools → Network tab and verify:
- Response includes `Access-Control-Allow-Origin: https://your-domain.com`
- Response includes `Access-Control-Allow-Credentials: true`
- Cookies are visible in Application → Cookies
- `HttpOnly` checkbox is checked

---

## Common Issues & Solutions

### Issue 1: Cookies Not Being Set
**Symptoms**: Login succeeds but no cookies in browser

**Possible Causes**:
1. Cookie parser middleware not installed/configured
2. CORS `credentials` not set to `true`
3. Frontend not sending `withCredentials: true` (already done)

**Solution**:
```javascript
// Install cookie-parser
npm install cookie-parser

// Add to your app
const cookieParser = require('cookie-parser');
app.use(cookieParser());
```

### Issue 2: CORS Error
**Symptoms**: Browser console shows CORS error, requests fail

**Solution**:
```javascript
// Make sure origin is specific, not '*'
app.use(cors({
  origin: 'http://localhost:3000',  // Your frontend URL
  credentials: true
}));
```

### Issue 3: Cookies Not Sent with Requests
**Symptoms**: Protected endpoints return 401 even after login

**Possible Causes**:
1. Domain mismatch (cookie domain doesn't match request domain)
2. Path mismatch (cookie path doesn't include request path)
3. `secure: true` on HTTP connection (use `false` in dev)

**Solution**:
```javascript
// Development configuration
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: false,  // ← Must be false for HTTP
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000,
  path: '/'
});
```

### Issue 4: Refresh Token Cookie Not Received
**Symptoms**: Refresh endpoint says "No refresh token provided"

**Solution**: Check the `path` attribute matches:
```javascript
// When setting cookie
res.cookie('refreshToken', token, {
  // ...
  path: '/api/public/RefreshToken'  // ← Must match endpoint path
});

// Endpoint path must match
app.post('/api/public/RefreshToken', ...)  // ← Same path
```

---

## Questions for You (Backend Engineer)

Please answer these to help with implementation:

1. **What backend framework/language are you using?**
   - Express.js (Node.js)
   - ASP.NET Core (C#)
   - Django/Flask (Python)
   - Spring Boot (Java)
   - Other: _________

2. **What's your current token generation method?**
   - JWT (jsonwebtoken)
   - Custom token system
   - Third-party auth service

3. **Where is your API hosted?**
   - Same domain as frontend (e.g., example.com/api)
   - Subdomain (e.g., api.example.com)
   - Different domain (e.g., api-service.com)

4. **Do you have HTTPS in production?**
   - Yes (set `secure: true`)
   - No (set `secure: false`, but recommend adding HTTPS)

5. **Any questions or concerns about these changes?**

---

## Need Help?

If you have questions while implementing:

1. Check `SECURITY_COOKIE_AUTH.md` for more details
2. Check `COOKIE_VS_LOCALSTORAGE.md` for security background
3. Ask me any questions - I can provide framework-specific examples

---

## Summary

**What you need to do:**
1. ✏️ Update Login to set cookies
2. ✏️ Update Signup to set cookies
3. ✏️ Update Refresh to read and set cookies
4. ✏️ Update Logout to clear cookies
5. ✏️ Update protected endpoints to read from cookies
6. ⚙️ Update CORS to enable credentials

**Security benefit**: Tokens cannot be stolen by XSS attacks

**Frontend status**: ✅ Already updated and ready

**Your turn**: Implement the 6 changes above and test!
