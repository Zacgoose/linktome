# Two-Factor Authentication (2FA) Backend API Requirements

This document outlines the backend API endpoints that need to be implemented in the PowerShell Azure Functions to support the 2FA frontend functionality.

## ⚠️ CRITICAL: Security Requirements

**Before implementing, READ**: `2FA_SECURITY_REQUIREMENTS.md`

Key security requirements:
- ✅ Encrypt TOTP secrets with AES-256 (use Azure Key Vault)
- ✅ Hash email 2FA codes before storage
- ✅ Implement backup codes for recovery
- ✅ Make 2FA optional (user opt-in)
- ✅ Never log sensitive data (secrets, codes)

## Overview

The 2FA implementation supports two methods:
- **Email OTP**: 6-digit code sent via email
- **TOTP**: Time-based One-Time Password using authenticator apps (Google Authenticator, Authy, etc.)

**Important**: 
- **2FA is OPTIONAL** - users must explicitly enable it
- Users can have **both methods enabled simultaneously** and choose which one to use during login
- The system should support:
  - Users with 2FA disabled (default)
  - Users with only email 2FA enabled
  - Users with only TOTP 2FA enabled
  - Users with both email and TOTP enabled (can use either method to verify)

## API Endpoint Structure

All 2FA operations use a **single endpoint** with URL query parameters:
- **Base endpoint**: `POST /api/public/2fatoken`
- **Action parameter**: `?action=verify` or `?action=resend`
- The PowerShell function should use switch statements based on the `action` parameter

## Required API Endpoints

### 1. Modify Existing Login/Signup Endpoints

**Endpoints**: 
- `POST /api/public/Login`
- `POST /api/public/Signup`

**Modified Behavior**:
**Check if user has 2FA enabled first** - if not, proceed with normal login. If 2FA is enabled, return a 2FA challenge response instead of immediately returning the user object.

**Response Format when 2FA is NOT enabled** (default for all users):
```json
{
  "user": {
    "UserId": "...",
    "email": "...",
    "username": "...",
    // ... other user fields
  }
}
```

**Response Format when 2FA IS enabled** (user opted in):
```json
{
  "requires2FA": true,
  "twoFactorMethod": "email",  // or "totp" or "both"
  "availableMethods": ["email", "totp"],  // Array of enabled methods (optional, for future UI)
  "sessionId": "unique-session-id-for-verification"
}
```

**Important Notes on Multi-Method Support**:
- **2FA is optional** - Only check if `user.twoFactorEnabled` is true
- If user has 2FA disabled (default): Return user object directly, skip 2FA
- If user has only email enabled: `twoFactorMethod: "email"` - Email code sent immediately
- If user has only TOTP enabled: `twoFactorMethod: "totp"` - No email sent
- If user has **both enabled**: `twoFactorMethod: "both"` and include `availableMethods: ["email", "totp"]`
- **When both are enabled**: 
  - Frontend will default to TOTP to avoid sending unnecessary emails
  - **DO NOT send email code automatically** when returning the 2FA challenge
  - Email code will only be sent when user explicitly clicks "Resend Code" (via the resend action)
  - This reduces email spam and gives users flexibility to choose their preferred method
- Session should store which method(s) are available for that user

**HTTP Status**: 200 OK

**Implementation Notes**:
- Check if user has 2FA enabled in the database
- If user has **both methods enabled**:
  - Set `twoFactorMethod: "both"` or default to preferred method
  - Include `availableMethods: ["email", "totp"]` in response
  - **DO NOT send email code automatically** (frontend will default to TOTP to avoid unnecessary emails)
  - Only send email code when user explicitly requests via resend action
  - Store both available methods in the session
- If 2FA enabled with email method only: Generate and send 6-digit code via email, create temporary session
- If 2FA enabled with TOTP only: Create temporary session for verification
- Store temporary session with user info and available methods for later verification (valid for 5-10 minutes)
- Session should be single-use to prevent replay attacks
- When verifying, accept either method if both are enabled

---

### 2. Verify 2FA Token

**Endpoint**: `POST /api/public/2fatoken?action=verify`

**Purpose**: Verify the 2FA code provided by the user and complete the authentication

**Request Body**:
```json
{
  "sessionId": "unique-session-id-from-login",
  "token": "123456",
  "method": "email"  // or "totp"
}
```

**Success Response** (HTTP 200):
```json
{
  "user": {
    "UserId": "...",
    "email": "...",
    "username": "...",
    "userRole": "...",
    "roles": ["..."],
    "permissions": ["..."],
    "userManagements": [],
    "tier": "free"
  }
}
```

**Error Responses**:
- **Invalid or expired session** (HTTP 401):
  ```json
  {
    "error": "Session expired or invalid"
  }
  ```

- **Invalid token** (HTTP 400):
  ```json
  {
    "error": "Invalid verification code"
  }
  ```

- **Too many attempts** (HTTP 429):
  ```json
  {
    "error": "Too many failed attempts. Please try again later."
  }
  ```

**Implementation Notes**:
- For email method: Compare provided token with stored token for the session
- For TOTP method: Verify token using TOTP algorithm with user's secret key
- **For backup codes**: Check if token matches any of the user's hashed backup codes (see `2FA_SECURITY_REQUIREMENTS.md`)
- **For users with both methods enabled**: 
  - Accept verification from either method OR backup code
  - Check if provided token matches email code OR TOTP code OR backup code
  - User can use whichever method they prefer
- Rate limit verification attempts (e.g., max 5 attempts per session)
- Invalidate session after successful verification
- If backup code used, remove it from user's list (single-use)
- Set authentication cookies on success (access token, refresh token)
- Store user session in database as usual

---

### 3. Resend Email 2FA Code

**Endpoint**: `POST /api/public/2fatoken?action=resend`

**Purpose**: Resend the 2FA code via email (only applicable for email method)

**Request Body**:
```json
{
  "sessionId": "unique-session-id-from-login"
}
```

**Success Response** (HTTP 200):
```json
{
  "message": "Code resent successfully"
}
```

**Error Responses**:
- **Invalid or expired session** (HTTP 401):
  ```json
  {
    "error": "Session expired or invalid"
  }
  ```

- **Rate limit exceeded** (HTTP 429):
  ```json
  {
    "error": "Please wait before requesting another code"
  }
  ```

- **Not an email 2FA session** (HTTP 400):
  ```json
  {
    "error": "Code resend is only available for email verification"
  }
  ```

**Implementation Notes**:
- Generate new 6-digit code
- Update stored code for the session
- Send email with new code
- Rate limit resend requests (e.g., max 1 request per 60 seconds)
- Keep same session ID
- **For users with both methods enabled**: 
  - This endpoint generates and sends the email code on demand
  - This is the ONLY time an email code is sent when both methods are enabled
  - User can then choose to use either the email code or continue with TOTP

---

## PowerShell Implementation Example

The PowerShell Azure Function should use a switch statement to handle different actions:

```powershell
param($Request, $TriggerMetadata)

# Get the action from query parameters
$action = $Request.Query.action

# Switch based on action
switch ($action) {
    "verify" {
        # Handle 2FA verification
        $sessionId = $Request.Body.sessionId
        $token = $Request.Body.token
        $method = $Request.Body.method
        
        # Verify the token and complete authentication
        # ... verification logic ...
        
        if ($verificationSuccessful) {
            $body = @{
                user = @{
                    UserId = "..."
                    email = "..."
                    # ... other user fields ...
                }
            }
            Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
                StatusCode = [HttpStatusCode]::OK
                Body = $body | ConvertTo-Json
            })
        } else {
            $body = @{ error = "Invalid verification code" }
            Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
                StatusCode = [HttpStatusCode]::BadRequest
                Body = $body | ConvertTo-Json
            })
        }
    }
    
    "resend" {
        # Handle resending email code
        $sessionId = $Request.Body.sessionId
        
        # Resend the email code
        # ... resend logic ...
        
        $body = @{ message = "Code resent successfully" }
        Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
            StatusCode = [HttpStatusCode]::OK
            Body = $body | ConvertTo-Json
        })
    }
    
    default {
        $body = @{ error = "Invalid action parameter" }
        Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
            StatusCode = [HttpStatusCode]::BadRequest
            Body = $body | ConvertTo-Json
        })
    }
}
```

---

## Future Endpoints (Optional - For TOTP Setup)

These endpoints would be needed for users to enable TOTP 2FA in their account settings:

### 4. Setup TOTP (Get QR Code)

**Endpoint**: `GET /api/protected/2fatoken?action=setup-totp`

**Purpose**: Generate TOTP secret and QR code for user to scan with authenticator app

**Response** (HTTP 200):
```json
{
  "secret": "BASE32_ENCODED_SECRET",
  "qrCode": "data:image/png;base64,...",
  "backupCodes": [
    "ABC123-DEF456",
    "GHI789-JKL012",
    // ... 8-10 backup codes
  ]
}
```

### 5. Enable TOTP

**Endpoint**: `POST /api/protected/2fatoken?action=enable-totp`

**Purpose**: Verify TOTP setup and enable 2FA for the user

**Request Body**:
```json
{
  "secret": "BASE32_ENCODED_SECRET",
  "token": "123456"
}
```

**Success Response** (HTTP 200):
```json
{
  "message": "Two-factor authentication enabled successfully"
}
```

---

## Database Schema Suggestions

### Users Table (Add columns)
```
- twoFactorEnabled: boolean (default: false)
- twoFactorEmailEnabled: boolean (default: false)  // NEW: Track email 2FA separately
- twoFactorTotpEnabled: boolean (default: false)   // NEW: Track TOTP 2FA separately
- twoFactorMethod: string ('email' | 'totp' | 'both' | null)  // For backward compatibility
- totpSecret: string (encrypted, only for TOTP users)
- backupCodes: string[] (hashed)
```

**Note**: Users can have both `twoFactorEmailEnabled` and `twoFactorTotpEnabled` set to `true`, allowing them to use either method for verification.

### TwoFactorSessions Table (temporary storage)
```
- sessionId: string (primary key, unique)
- userId: string
- method: string ('email' | 'totp' | 'both')  // Which method(s) are available
- availableMethods: string[] (['email'], ['totp'], or ['email', 'totp'])  // NEW: Track all available methods
- emailCode: string (only for email method, hashed)
- attemptsRemaining: number (e.g., 5)
- createdAt: timestamp
- expiresAt: timestamp (e.g., 10 minutes from creation)
- lastResendAt: timestamp (for rate limiting)
```

**Note**: When `method` is 'both' or `availableMethods` includes both methods, the verification should accept either a valid email code OR a valid TOTP code.

---

## Security Considerations

1. **Session Expiration**: 2FA sessions should expire after 10 minutes
2. **Rate Limiting**: 
   - Max 5 verification attempts per session
   - Max 1 resend request per 60 seconds
3. **Code Generation**: Use cryptographically secure random number generation
4. **Storage**: Hash email codes before storing, encrypt TOTP secrets
5. **Single Use**: Invalidate session after successful verification
6. **Cleanup**: Regularly clean up expired sessions from database

---

## Email Template Example

**Subject**: Your LinkToMe Verification Code

```
Hello,

Your verification code is: **123456**

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
LinkToMe Team
```

---

## Testing Recommendations

1. Test with valid/invalid codes
2. Test session expiration
3. Test rate limiting on verification attempts
4. Test rate limiting on resend requests
5. Test switching between login and signup
6. Test TOTP with different authenticator apps
7. Test with expired sessions
8. **Test with user who has only email 2FA enabled**
9. **Test with user who has only TOTP 2FA enabled**
10. **Test with user who has BOTH methods enabled:**
    - Verify with email code
    - Verify with TOTP code
    - Test that either method works independently
11. **Test resend with user who has both methods** (should only resend email)
12. **Test switching between methods during login** (future UI feature)

---

## Multi-Method Support Details

### User Experience for Dual 2FA

When a user has both email and TOTP enabled:

1. **Login Flow**:
   - User enters credentials
   - Backend responds with `twoFactorMethod: "both"` or `"email"` with `availableMethods: ["email", "totp"]`
   - Email code is sent automatically
   - Frontend shows 2FA verification screen (currently defaults to email)
   - User can enter either:
     - The 6-digit code from their email
     - The 6-digit code from their authenticator app
   - Backend accepts whichever code is valid

2. **Verification Logic**:
   ```
   if (emailCodeMatches(token) OR totpCodeMatches(token)) {
     // Authentication successful
   }
   ```

3. **Future Enhancement**:
   - Frontend could show a "Use authenticator app instead" link
   - Allow user to choose their preferred method before entering code
   - Remember user's preferred method for next login

### Backend Implementation Priority

**Phase 1 (MVP)**: Accept either method when both are enabled
- User has both methods enabled
- Email code sent automatically
- Backend accepts either email OR TOTP code
- Frontend defaults to showing email input (with option to use TOTP)

**Phase 2 (Enhanced)**: User choice
- Frontend shows method selection UI
- User explicitly chooses email or TOTP
- Only send email code if user chooses email method
- Better UX for power users

### Configuration Examples

```javascript
// User configurations in database:

// Configuration 1: Email only
{
  twoFactorEmailEnabled: true,
  twoFactorTotpEnabled: false,
  twoFactorMethod: "email"
}

// Configuration 2: TOTP only
{
  twoFactorEmailEnabled: false,
  twoFactorTotpEnabled: true,
  twoFactorMethod: "totp",
  totpSecret: "encrypted_secret_here"
}

// Configuration 3: Both methods (most secure)
{
  twoFactorEmailEnabled: true,
  twoFactorTotpEnabled: true,
  twoFactorMethod: "both",
  totpSecret: "encrypted_secret_here"
}
```

---

## Frontend Integration Status

✅ Frontend implementation complete
- TwoFactorAuth component created
- Login/Signup pages updated
- API types defined
- State management implemented
- **Uses URL query parameters**: `?action=verify` and `?action=resend`

⏳ Awaiting backend implementation at `/api/public/2fatoken?action=<action>`

### Frontend API Calls

The frontend makes these calls:
1. `POST /api/public/2fatoken?action=verify` with body: `{ sessionId, token, method }`
2. `POST /api/public/2fatoken?action=resend` with body: `{ sessionId }`

The PowerShell function should parse the `action` query parameter and use switch/case logic to handle different actions.
