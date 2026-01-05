# Two-Factor Authentication (2FA) Backend API Requirements

This document outlines the backend API endpoints that need to be implemented in the PowerShell Azure Functions to support the 2FA frontend functionality.

## Overview

The 2FA implementation supports two methods:
- **Email OTP**: 6-digit code sent via email
- **TOTP**: Time-based One-Time Password using authenticator apps (Google Authenticator, Authy, etc.)

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
When a user attempts to login/signup and has 2FA enabled, instead of immediately returning the user object, return a 2FA challenge response.

**New Response Format** (when 2FA is required):
```json
{
  "requires2FA": true,
  "twoFactorMethod": "email",  // or "totp"
  "sessionId": "unique-session-id-for-verification"
}
```

**HTTP Status**: 200 OK

**Existing Response Format** (when 2FA is NOT required):
```json
{
  "user": {
    "UserId": "...",
    "email": "...",
    "username": "...",
    "userRole": "...",
    // ... other user fields
  }
}
```

**Implementation Notes**:
- Check if user has 2FA enabled in the database
- If 2FA enabled with email method: Generate and send 6-digit code via email, create temporary session
- If 2FA enabled with TOTP: Create temporary session for verification
- Store temporary session with user info for later verification (valid for 5-10 minutes)
- Session should be single-use to prevent replay attacks

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
- Rate limit verification attempts (e.g., max 5 attempts per session)
- Invalidate session after successful verification
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
- twoFactorMethod: string ('email' | 'totp' | null)
- totpSecret: string (encrypted, only for TOTP users)
- backupCodes: string[] (hashed)
```

### TwoFactorSessions Table (temporary storage)
```
- sessionId: string (primary key, unique)
- userId: string
- method: string ('email' | 'totp')
- emailCode: string (only for email method, hashed)
- attemptsRemaining: number (e.g., 5)
- createdAt: timestamp
- expiresAt: timestamp (e.g., 10 minutes from creation)
- lastResendAt: timestamp (for rate limiting)
```

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
