# Frontend-Backend Cookie Authentication Compatibility

## Summary

✅ **The frontend implementation is fully compatible with the backend cookie authentication system.**

## Backend Implementation (from linktome-api)

The backend uses a **single HTTP-only cookie named `auth`** containing both tokens as JSON:

```json
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refreshToken": "ZpMRbrV36rZ_W3wYMTOy3y..."
}
```

**Cookie attributes:**
- Name: `auth`
- HttpOnly: `true`
- Secure: `true`
- SameSite: `Strict`
- Max-Age: `604800` (7 days)
- Path: `/`

## Frontend Implementation (this repository)

The frontend is **cookie-structure agnostic** and works with any HTTP-only cookie implementation:

### ✅ Key Compatibility Points

1. **Automatic Cookie Handling**
   - Frontend uses `axios.defaults.withCredentials = true`
   - This tells the browser to automatically send ALL cookies with every request
   - Works regardless of cookie name or structure

2. **No Cookie Name Dependencies**
   - Frontend code never references specific cookie names
   - HTTP-only cookies cannot be accessed by JavaScript anyway
   - Complete abstraction from cookie implementation details

3. **Correct API Endpoints**
   ```typescript
   // Login/Signup
   'public/Login'    → /api/PublicLogin
   'public/Signup'   → /api/PublicSignup
   'public/RefreshToken' → /api/PublicRefreshToken
   'public/Logout'   → /api/PublicLogout
   ```

4. **Response Handling**
   - All endpoints expect `{ user: UserAuth }` in response body ✅
   - User profile stored in localStorage (non-sensitive) ✅
   - No token storage attempted ✅

5. **Token Refresh**
   ```typescript
   // Sends empty body - backend reads token from cookie
   await apiPost('public/RefreshToken', {});
   ```
   - No token sent in request body ✅
   - Expects user profile in response ✅
   - Browser automatically updates cookie ✅

6. **Logout**
   ```typescript
   // Sends empty body - backend reads token from cookie and clears it
   await apiPost('public/Logout');
   ```
   - No token sent in request body ✅
   - Browser automatically deletes cookie ✅

7. **401 Handling**
   - Automatic token refresh on 401 responses ✅
   - Retry original request after refresh ✅
   - Redirect to login if refresh fails ✅

## Code References

### axios Configuration
```typescript
// src/utils/api.ts
axios.defaults.withCredentials = true;

// src/hooks/useApiQuery.ts
axios.defaults.withCredentials = true;
```

### Login Handler
```typescript
// src/pages/login.tsx
const loginMutation = useApiPost<LoginResponse>({
  onSuccess: (data: LoginResponse) => {
    if (data.user) {
      // Backend sets tokens as HTTP-only cookie (automatic)
      // We only store user profile for UI state
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      router.push('/admin/dashboard');
    }
  }
});
```

### Token Refresh
```typescript
// src/providers/AuthProvider.tsx
const refreshAuth = async () => {
  try {
    // Refresh token is in HTTP-only cookie, backend will read it
    // No need to send it in the request body
    const response = await apiPost('public/RefreshToken', {});
    if (response && response.user) {
      const newUser = normalizeUser(response.user);
      // Backend sets new cookies with refreshed tokens
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};
```

### 401 Auto-Retry Logic
```typescript
// src/hooks/useApiQuery.ts
try {
  return await executeRequest();
} catch (err: any) {
  if (axios.isAxiosError(err) && err.response?.status === 401 && authReady) {
    // Try to refresh the token (cookies will be updated by the backend)
    const refreshed = await refreshAuth();
    if (refreshed) {
      try {
        return await executeRequest(); // Retry with new cookie
      } catch (retryErr: any) {
        if (axios.isAxiosError(retryErr) && retryErr.response?.status === 401) {
          throw new Error('Session expired');
        }
        throw retryErr;
      }
    }
  }
  throw err;
}
```

## Testing Verification

The following behaviors confirm compatibility:

- [ ] Login sets cookie and returns user data
- [ ] Browser DevTools shows `auth` cookie with HttpOnly flag
- [ ] Subsequent API requests automatically include cookie
- [ ] Token refresh updates cookie without frontend intervention
- [ ] 401 responses trigger automatic refresh attempt
- [ ] Logout clears the cookie
- [ ] No tokens stored in localStorage
- [ ] Context switcher works with user.userManagements data

## Why This Works

The frontend implementation follows the **browser's native cookie handling model**:

1. **Server sets cookie** via `Set-Cookie` header
2. **Browser stores cookie** automatically
3. **Browser sends cookie** with every request to the same domain
4. **Frontend never touches tokens** - complete separation of concerns

This design is:
- ✅ Secure (tokens never exposed to JavaScript)
- ✅ Simple (no manual cookie management)
- ✅ Compatible (works with any HTTP-only cookie structure)
- ✅ Maintainable (backend can change cookie format without frontend changes)

## Conclusion

**No frontend changes are required.** The implementation is already fully compatible with the backend's single `auth` cookie approach. The frontend correctly:

1. Sends credentials with all requests
2. Handles user profile data from responses
3. Implements token refresh logic
4. Never attempts to access or store tokens directly

The cookie structure (single vs. multiple, JSON vs. separate) is completely transparent to the frontend code.
