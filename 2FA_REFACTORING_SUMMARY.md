# 2FA Implementation - Change Summary

## Latest Update: URL Query Parameters

The 2FA endpoints now use URL query parameters instead of separate paths, as required. This allows the backend PowerShell function to use switch statements based on the action parameter.

### Endpoint Structure

**Before**: 
- `/api/public/2fatoken/verify`
- `/api/public/2fatoken/resend`

**After** (Current):
- `/api/public/2fatoken?action=verify`
- `/api/public/2fatoken?action=resend`

### Frontend Implementation

```typescript
// Verify 2FA code
const handle2FAVerify = (token: string, sessionId: string) => {
  verify2FAMutation.mutate({
    url: 'public/2fatoken?action=verify',
    data: { sessionId, token, method: twoFactorMethod },
  });
};

// Resend email code
const handle2FAResend = () => {
  resend2FAMutation.mutate({
    url: 'public/2fatoken?action=resend',
    data: { sessionId: twoFactorSessionId },
  });
};
```

### Backend PowerShell Implementation

The PowerShell Azure Function should parse the `action` query parameter:

```powershell
param($Request, $TriggerMetadata)

$action = $Request.Query.action

switch ($action) {
    "verify" {
        # Handle verification
    }
    "resend" {
        # Handle resend
    }
    default {
        # Return error for invalid action
    }
}
```

---

## Previous Update: Refactoring to Use API Hooks

In response to the requirement to only use API hooks and not direct API methods, the following changes were made:

### Changes Made

1. **Removed Direct Import**
   - Removed `import { apiPost } from '@/utils/api'` from login.tsx

2. **Added 2FA Mutations**
   - Created `verify2FAMutation` using `useApiPost<LoginResponse>()` hook
   - Created `resend2FAMutation` using `useApiPost()` hook
   - Both follow the same pattern as existing `loginMutation` and `signupMutation`

3. **Refactored Handler Functions**
   - `handle2FAVerify`: Now calls `verify2FAMutation.mutate()` instead of `await apiPost()`
   - `handle2FAResend`: Now calls `resend2FAMutation.mutate()` instead of `await apiPost()`
   - Removed try/catch blocks as error handling is now in mutation callbacks

4. **Updated State Management**
   - Removed local `twoFactorLoading` state
   - Now uses `verify2FAMutation.isPending` for loading state
   - Updated loading calculation: `loginMutation.isPending || signupMutation.isPending || verify2FAMutation.isPending`

5. **Callbacks in Mutations**
   - `onSuccess`: Handles successful verification and navigation
   - `onError`: Handles errors and displays them for 5 seconds
   - Consistent with existing mutation patterns in the codebase

### Benefits of This Approach

1. **Consistency**: All API calls now use the same hook-based pattern
2. **Better State Management**: Automatic loading/error states from React Query
3. **Better Error Handling**: Centralized error handling through mutation callbacks
4. **Type Safety**: Full TypeScript support with proper types
5. **Automatic Toasts**: The `useApiPost` hook automatically shows toast notifications for errors
6. **Following Codebase Standards**: Matches the pattern used throughout the application

### Code Pattern

```typescript
// Create mutation
const verify2FAMutation = useApiPost<LoginResponse>({
  onSuccess: (data) => {
    // Handle success
  },
  onError: (error) => {
    // Handle error
  },
});

// Use mutation
const handle2FAVerify = (token: string, sessionId: string) => {
  verify2FAMutation.mutate({
    url: 'public/2fatoken/verify',
    data: { sessionId, token, method: twoFactorMethod },
  });
};

// Check loading state
const loading = verify2FAMutation.isPending;
```

This pattern is now consistent with:
- `loginMutation` for login functionality
- `signupMutation` for signup functionality
- All other mutations throughout the codebase

### Files Modified

- `src/pages/login.tsx`: Refactored 2FA verification and resend to use hooks

### No Breaking Changes

The refactoring maintains the exact same functionality and user experience. The TwoFactorAuth component and all other files remain unchanged. Only the internal implementation of how API calls are made was updated.
