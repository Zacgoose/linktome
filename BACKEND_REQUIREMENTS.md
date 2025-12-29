# Backend API Changes Required for Secure Cookie-Based Authentication

## Executive Summary for Backend Engineer

The frontend has been updated to use HTTP-only cookies for authentication tokens instead of localStorage. This provides protection against XSS attacks by making tokens inaccessible to JavaScript.

**Your task**: Update the backend API to set tokens as HTTP-only cookies instead of returning them in the response body.

## Your Backend Setup (Azure Functions - PowerShell)

✅ **Backend**: Azure Function App (PowerShell)  
✅ **CORS**: Handled by Azure infrastructure (no manual configuration needed)  
✅ **HTTPS**: Provided by Azure at `/api` subpath  
✅ **Cookie Support**: Available through Azure Functions HTTP response binding

**Note**: Since CORS is managed by Azure, you can skip the CORS configuration section. Focus on the endpoint changes to set and read cookies.

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

You need to update **4 endpoints** (~~and 1 configuration~~):

1. ✏️ **Login Endpoint** - Set cookies, return only user profile
2. ✏️ **Signup Endpoint** - Set cookies, return only user profile  
3. ✏️ **Refresh Token Endpoint** - Read from cookie, set new cookies
4. ✏️ **Logout Endpoint** - Clear cookies
5. ~~⚙️ **CORS Configuration**~~ - ✅ Already handled by Azure infrastructure

---

## 1. Login Endpoint Changes

### Current Implementation (PowerShell - Azure Functions)
```powershell
# POST /api/public/Login
# Input: $Request.Body.email, $Request.Body.password

# Authenticate user...
$user = Authenticate-User -Email $Request.Body.email -Password $Request.Body.password
$accessToken = New-AccessToken -User $user
$refreshToken = New-RefreshToken -User $user

# ❌ CURRENT: Return tokens in response body
Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Body = @{
        accessToken = $accessToken
        refreshToken = $refreshToken
        user = $user
    }
})
```

### Required Changes (PowerShell - Azure Functions)
```powershell
# POST /api/public/Login
# Input: $Request.Body.email, $Request.Body.password

# Authenticate user...
$user = Authenticate-User -Email $Request.Body.email -Password $Request.Body.password
$accessToken = New-AccessToken -User $user
$refreshToken = New-RefreshToken -User $user

# ✅ NEW: Set tokens as HTTP-only cookies
$cookies = @(
    @{
        Name = 'accessToken'
        Value = $accessToken
        HttpOnly = $true              # ← Cannot be accessed by JavaScript
        Secure = $true                # ← HTTPS only (Azure provides this)
        SameSite = 'Strict'           # ← CSRF protection
        MaxAge = 900                  # ← 15 minutes in seconds
        Path = '/'                    # ← Available to all routes
    },
    @{
        Name = 'refreshToken'
        Value = $refreshToken
        HttpOnly = $true
        Secure = $true
        SameSite = 'Strict'
        MaxAge = 604800               # ← 7 days in seconds
        Path = '/api/public/RefreshToken'  # ← Only sent to refresh endpoint
    }
)

# ✅ Return only user profile (no tokens)
Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Body = @{
        user = $user
    }
    Cookies = $cookies
})
```

### Alternative: Generic HTTP Response Format
If your Azure Function uses a different response format, the key is to include Set-Cookie headers:

```powershell
# Generic approach using headers
$response = @{
    StatusCode = 200
    Headers = @{
        'Set-Cookie' = @(
            "accessToken=$accessToken; HttpOnly; Secure; SameSite=Strict; Max-Age=900; Path=/"
            "refreshToken=$refreshToken; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/api/public/RefreshToken"
        )
        'Content-Type' = 'application/json'
    }
    Body = (@{ user = $user } | ConvertTo-Json)
}

Push-OutputBinding -Name Response -Value $response
```

### Cookie Attributes Explained

| Attribute | Value | Why It's Important |
|-----------|-------|-------------------|
| `httpOnly` | `true` | **CRITICAL**: Prevents JavaScript access. This is the main security benefit! |
| `secure` | `true` | Ensures cookie only sent over HTTPS. ✅ Azure provides HTTPS for `/api` |
| `sameSite` | `'strict'` | Prevents CSRF attacks. Cookie only sent with requests from your domain. |
| `maxAge` | seconds | How long cookie lasts. accessToken: 900s (15 min), refreshToken: 604800s (7 days). |
| `path` | `/` or specific | Which endpoints receive this cookie. |

### Azure Functions - PowerShell Notes

**MaxAge Format**: Azure Functions expects `MaxAge` in **seconds**, not milliseconds (unlike Node.js/Express).
- accessToken: `900` (15 minutes)
- refreshToken: `604800` (7 days)

**Secure Flag**: Since Azure provides HTTPS for all `/api` requests, always use `Secure = $true` in production.

---

## 2. Signup Endpoint Changes

### Required Changes (PowerShell - Azure Functions)
Same as Login endpoint - set cookies instead of returning tokens:

```powershell
# POST /api/public/Signup
# Input: $Request.Body.email, $Request.Body.username, $Request.Body.password

# Create user...
$user = New-User -Email $Request.Body.email -Username $Request.Body.username -Password $Request.Body.password
$accessToken = New-AccessToken -User $user
$refreshToken = New-RefreshToken -User $user

# ✅ Set tokens as HTTP-only cookies
$cookies = @(
    @{
        Name = 'accessToken'
        Value = $accessToken
        HttpOnly = $true
        Secure = $true
        SameSite = 'Strict'
        MaxAge = 900
        Path = '/'
    },
    @{
        Name = 'refreshToken'
        Value = $refreshToken
        HttpOnly = $true
        Secure = $true
        SameSite = 'Strict'
        MaxAge = 604800
        Path = '/api/public/RefreshToken'
    }
)

# ✅ Return only user profile
Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Body = @{
        user = $user
    }
    Cookies = $cookies
})
```

---

## 3. Refresh Token Endpoint Changes

This is the most important change - the endpoint must read the refresh token from cookies, not the request body.

### Current Implementation (PowerShell - Azure Functions)
```powershell
# POST /api/public/RefreshToken
# ❌ CURRENT: Read from request body
$refreshToken = $Request.Body.refreshToken

# Verify and generate new tokens...
$decoded = Test-RefreshToken -Token $refreshToken
$newAccessToken = New-AccessToken -User $decoded.user
$newRefreshToken = New-RefreshToken -User $decoded.user

# ❌ CURRENT: Return in response body
Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Body = @{
        accessToken = $newAccessToken
        refreshToken = $newRefreshToken
        user = $decoded.user
    }
})
```

### Required Changes (PowerShell - Azure Functions)
```powershell
# POST /api/public/RefreshToken
# ✅ NEW: Read from cookie
$refreshToken = $Request.Cookies.refreshToken

if (-not $refreshToken) {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::Unauthorized
        Body = @{ error = 'No refresh token provided' }
    })
    return
}

try {
    # Verify and generate new tokens...
    $decoded = Test-RefreshToken -Token $refreshToken
    $newAccessToken = New-AccessToken -User $decoded.user
    $newRefreshToken = New-RefreshToken -User $decoded.user
    
    # ✅ NEW: Set new tokens as cookies
    $cookies = @(
        @{
            Name = 'accessToken'
            Value = $newAccessToken
            HttpOnly = $true
            Secure = $true
            SameSite = 'Strict'
            MaxAge = 900
            Path = '/'
        },
        @{
            Name = 'refreshToken'
            Value = $newRefreshToken
            HttpOnly = $true
            Secure = $true
            SameSite = 'Strict'
            MaxAge = 604800
            Path = '/api/public/RefreshToken'
        }
    )
    
    # ✅ Return only user profile
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::OK
        Body = @{
            user = $decoded.user
        }
        Cookies = $cookies
    })
} catch {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::Unauthorized
        Body = @{ error = 'Invalid refresh token' }
    })
}
```

### Reading Cookies in Azure Functions (PowerShell)

Azure Functions provides cookies through `$Request.Cookies`:
```powershell
# Access cookie by name
$accessToken = $Request.Cookies.accessToken
$refreshToken = $Request.Cookies.refreshToken

# Check if cookie exists
if ($Request.Cookies.ContainsKey('accessToken')) {
    # Cookie exists
```

---

## 4. Logout Endpoint Changes

### Required Changes (PowerShell - Azure Functions)
Clear both cookies by setting them with MaxAge: 0:

```powershell
# POST /api/public/Logout

# ✅ Clear both cookies
$cookies = @(
    @{
        Name = 'accessToken'
        Value = ''
        HttpOnly = $true
        Secure = $true
        SameSite = 'Strict'
        MaxAge = 0
        Path = '/'
    },
    @{
        Name = 'refreshToken'
        Value = ''
        HttpOnly = $true
        Secure = $true
        SameSite = 'Strict'
        MaxAge = 0
        Path = '/api/public/RefreshToken'
    }
)

Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
    StatusCode = [HttpStatusCode]::OK
    Body = @{ message = 'Logged out successfully' }
    Cookies = $cookies
})
```

---

## 5. Protected Endpoints - Reading Tokens

All your protected endpoints need to read the access token from cookies.

### Previous Implementation (PowerShell - Azure Functions)
```powershell
# Example protected endpoint
# ❌ OLD: Read from Authorization header
$authHeader = $Request.Headers['Authorization']
if ($authHeader -match 'Bearer (.+)') {
    $token = $Matches[1]
} else {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::Unauthorized
        Body = @{ error = 'No token provided' }
    })
    return
}

# Verify token...
$user = Test-AccessToken -Token $token
if (-not $user) {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::Forbidden
        Body = @{ error = 'Invalid token' }
    })
    return
}

# Continue with protected logic...
```

### ✅ Implemented (PowerShell - Azure Functions)
```powershell
# ✅ CURRENT: Read from cookie only

# Read access token from cookie
$token = $Request.Cookies.accessToken

if (-not $token) {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::Unauthorized
        Body = @{ error = 'No token provided' }
    })
    return
}

# Verify token...
$user = Test-AccessToken -Token $token
if (-not $user) {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::Forbidden
        Body = @{ error = 'Invalid token' }
    })
    return
}

# Continue with protected logic...
```

**Note**: ✅ Backend implementation complete - cookies only, no fallback to Authorization header.

---

## 6. CORS Configuration

### ✅ CORS Handled by Azure

**Good news!** Since your API is running as an Azure Function App, CORS is managed by Azure infrastructure. You don't need to configure CORS manually in your code.

### Azure Functions CORS Settings

CORS is configured in the Azure Portal or via Azure CLI:

**Azure Portal:**
1. Go to your Function App
2. Navigate to **Settings** → **CORS**
3. Add allowed origins (your frontend URL)
4. Enable **Access-Control-Allow-Credentials**: This should be enabled by default for cookie support

**Example CORS configuration in Azure:**
- Allowed Origins: `https://your-frontend-domain.com`
- Access-Control-Allow-Credentials: ✅ Enabled
- Access-Control-Max-Age: 86400 (optional)

### Verify CORS is Working

After deploying your changes, test that cookies work:
```bash
# Test from your frontend domain
curl -X POST https://your-function-app.azurewebsites.net/api/public/Login \
  -H "Origin: https://your-frontend-domain.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -v
```

Look for these headers in the response:
- `Access-Control-Allow-Origin: https://your-frontend-domain.com`
- `Access-Control-Allow-Credentials: true`
- `Set-Cookie: accessToken=...`

### No Code Changes Needed

Since Azure handles CORS configuration, **you don't need to add any CORS code** to your PowerShell functions. Just ensure the Azure CORS settings are configured correctly in the portal.

---

## Implementation Checklist

Use this checklist to track your progress:

### Login/Signup Endpoints (PowerShell - Azure Functions)
- [ ] Login endpoint sets `accessToken` cookie (HttpOnly: true, Secure: true)
- [ ] Login endpoint sets `refreshToken` cookie (HttpOnly: true, Secure: true)
- [ ] Login returns only user profile (no tokens in body)
- [ ] Signup endpoint sets `accessToken` cookie (HttpOnly: true, Secure: true)
- [ ] Signup endpoint sets `refreshToken` cookie (HttpOnly: true, Secure: true)
- [ ] Signup returns only user profile (no tokens in body)
- [ ] Cookie `MaxAge` set correctly (900 seconds for access, 604800 for refresh)
- [ ] Cookie `Path` set correctly ('/' for access, '/api/public/RefreshToken' for refresh)
- [ ] Cookie `SameSite` set to 'Strict'

### Refresh Token Endpoint
- [ ] Reads `refreshToken` from `$Request.Cookies.refreshToken`
- [ ] Returns 401 if no refresh token in cookie
- [ ] Sets new `accessToken` cookie
- [ ] Sets new `refreshToken` cookie
- [ ] Returns only user profile (no tokens in body)

### Logout Endpoint
- [ ] Clears `accessToken` cookie (MaxAge: 0)
- [ ] Clears `refreshToken` cookie (MaxAge: 0)

### Protected Endpoints
- [ ] Authentication logic reads token from cookie
- [ ] All protected routes use updated authentication logic

### Azure Configuration
- [ ] ✅ CORS configured in Azure Portal (Allowed Origins + Credentials enabled)
- [ ] ✅ HTTPS provided by Azure for `/api` subpath (automatic)

---

## Testing Your Changes

### 1. Test Login Sets Cookies (Azure Functions)
```bash
# Replace with your Azure Function App URL
curl -X POST https://your-function-app.azurewebsites.net/api/public/Login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt \
  -v
```

**Expected**: Look for `Set-Cookie` headers in response:
```
< Set-Cookie: accessToken=eyJhbG...; Path=/; HttpOnly; Secure; SameSite=Strict
< Set-Cookie: refreshToken=eyJhbG...; Path=/api/public/RefreshToken; HttpOnly; Secure; SameSite=Strict
```

### 2. Test Protected Endpoint with Cookie
```bash
curl -X GET https://your-function-app.azurewebsites.net/api/protected/data \
  -b cookies.txt \
  -v
```

**Expected**: Request succeeds with user data

### 3. Test Refresh Token
```bash
curl -X POST https://your-function-app.azurewebsites.net/api/public/RefreshToken \
  -b cookies.txt \
  -c cookies_new.txt \
  -v
```

**Expected**: New cookies are set

### 4. Test Logout
```bash
curl -X POST https://your-function-app.azurewebsites.net/api/public/Logout \
  -b cookies.txt \
  -c cookies_after_logout.txt \
  -v
```

**Expected**: Cookie values are empty or MaxAge=0

### 5. Test with Frontend Browser
Open browser DevTools → Network tab and verify:
- Response includes `Access-Control-Allow-Origin: https://your-domain.com`
- Response includes `Access-Control-Allow-Credentials: true`
- Cookies are visible in Application → Cookies
- `HttpOnly` checkbox is checked
- `Secure` checkbox is checked

---

## Common Issues & Solutions (Azure Functions)

### Issue 1: Cookies Not Being Set
**Symptoms**: Login succeeds but no cookies in browser

**Possible Causes**:
1. Cookie response format incorrect in PowerShell
2. CORS credentials not enabled in Azure Portal
3. Frontend not sending `withCredentials: true` (already done on frontend)

**Solution**:
- Check cookie format matches Azure Functions requirements (see examples above)
- Verify CORS settings in Azure Portal have credentials enabled
- Ensure using `HttpResponseContext` with `Cookies` property

### Issue 2: CORS Error
**Symptoms**: Browser console shows CORS error, requests fail

**Solution**:
- Go to Azure Portal → Your Function App → Settings → CORS
- Add your frontend domain (e.g., `https://your-frontend.com`)
- Remove `*` if present (doesn't work with credentials)
- Ensure "Enable Access-Control-Allow-Credentials" is checked
  credentials: true
}));
```

### Issue 3: Cookies Not Sent with Requests
**Symptoms**: Protected endpoints return 401 even after login

**Possible Causes**:
1. Path mismatch (cookie path doesn't include request path)
2. Cookie not being read correctly from `$Request.Cookies`

**Solution**:
- Verify cookie `Path` is set correctly (`/` for accessToken, `/api/public/RefreshToken` for refreshToken)
- Check PowerShell is reading cookies: `$Request.Cookies.accessToken`
- Test with curl and `-v` flag to see cookies being sent

### Issue 4: Refresh Token Cookie Not Received
**Symptoms**: Refresh endpoint says "No refresh token provided"

**Solution**: Check the `Path` attribute matches:
```powershell
# When setting cookie in Login
Path = '/api/public/RefreshToken'  # ← Must match refresh endpoint path

# Refresh endpoint must be at this exact path
# POST /api/public/RefreshToken
```

---

## Questions Answered (Your Backend Setup)

Based on your comment, here's what we know:

1. **Backend framework/language**: ✅ Azure Function App (PowerShell)
2. **Token generation**: (Please confirm - JWT, custom, etc.)
3. **API hosting**: ✅ Azure Functions at `/api` subpath
4. **HTTPS**: ✅ Provided by Azure
5. **CORS**: ✅ Handled by Azure infrastructure

### Additional Questions

If you have any questions about the implementation:
- What token generation library are you using in PowerShell?
- Do you have existing helper functions for token verification?
- Any concerns about the PowerShell code examples provided?

---

## Need Help?

If you have questions while implementing:

1. Check `SECURITY_COOKIE_AUTH.md` for more technical details
2. Check `COOKIE_VS_LOCALSTORAGE.md` for security background
3. Ask if you need more PowerShell-specific examples
4. The Azure Functions PowerShell documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-powershell

---

## Summary (Azure Functions - PowerShell)

**What you need to do:**
1. ✏️ Update Login endpoint to set cookies (PowerShell)
2. ✏️ Update Signup endpoint to set cookies (PowerShell)
3. ✏️ Update Refresh endpoint to read and set cookies (PowerShell)
4. ✏️ Update Logout endpoint to clear cookies (PowerShell)
5. ✏️ Update protected endpoints to read from cookies (PowerShell)
6. ~~⚙️ Update CORS~~ → ✅ Already handled by Azure

**Security benefit**: Tokens cannot be stolen by XSS attacks

**Frontend status**: ✅ Already updated and ready

**Azure benefits**: CORS and HTTPS handled automatically

**Your turn**: Implement the 5 PowerShell changes above and test!
