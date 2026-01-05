# Backend Implementation Review & Security Requirements

This document provides critical security and feature requirements for the 2FA backend implementation.

## ⚠️ CRITICAL SECURITY REQUIREMENTS

### 1. Encryption of Sensitive 2FA Data

**TOTP Secrets MUST be encrypted at rest:**

```powershell
# ❌ NEVER store TOTP secrets in plain text
$user.totpSecret = $plainTextSecret  # WRONG!

# ✅ Always encrypt before storing
$encryptedSecret = Protect-Data -PlainText $totpSecret -Key $encryptionKey
$user.totpSecret = $encryptedSecret

# When reading:
$decryptedSecret = Unprotect-Data -EncryptedText $user.totpSecret -Key $encryptionKey
```

**Requirements:**
- Use AES-256 encryption for TOTP secrets
- Store encryption keys in Azure Key Vault (NOT in code or config files)
- Use per-user encryption keys or a master key with proper key management
- Never log or expose TOTP secrets in API responses
- Rotate encryption keys periodically

**Email 2FA Codes:**
- Hash codes before storing in temporary session (use bcrypt or similar)
- Never store plain text codes in database
- Codes should expire after 10 minutes

```powershell
# ✅ Hash email codes
$hashedCode = ConvertTo-SecureHash -PlainText $emailCode -Algorithm "SHA256"
$session.emailCodeHash = $hashedCode

# When verifying:
$isValid = Test-SecureHash -PlainText $userSubmittedCode -Hash $session.emailCodeHash
```

### 2. Backup Codes Implementation

**REQUIRED**: Implement backup codes as recovery method.

**Backup codes should:**
- Be generated when user enables 2FA (especially TOTP)
- Consist of 8-10 single-use codes
- Be hashed before storage (like passwords)
- Only be shown to user ONCE during generation
- Be usable when user loses access to primary 2FA method

**Database Schema:**
```sql
ALTER TABLE Users ADD COLUMN backupCodes TEXT;  -- JSON array of hashed codes
```

**PowerShell Implementation:**
```powershell
function New-BackupCodes {
    param([int]$Count = 10)
    
    $codes = @()
    for ($i = 0; $i -lt $Count; $i++) {
        # Generate 8-character alphanumeric code
        $code = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 8 | % {[char]$_})
        $codes += $code
    }
    
    return $codes
}

function Save-BackupCodes {
    param(
        [string]$UserId,
        [array]$PlainTextCodes
    )
    
    # Hash each code before storing
    $hashedCodes = $PlainTextCodes | ForEach-Object {
        ConvertTo-SecureHash -PlainText $_ -Algorithm "SHA256"
    }
    
    # Store as JSON array
    $user.backupCodes = $hashedCodes | ConvertTo-Json
}

function Test-BackupCode {
    param(
        [string]$UserId,
        [string]$SubmittedCode
    )
    
    $user = Get-User -UserId $UserId
    $storedCodes = $user.backupCodes | ConvertFrom-Json
    
    foreach ($hashedCode in $storedCodes) {
        if (Test-SecureHash -PlainText $SubmittedCode -Hash $hashedCode) {
            # Code is valid - remove it (single use)
            $storedCodes = $storedCodes | Where-Object { $_ -ne $hashedCode }
            $user.backupCodes = $storedCodes | ConvertTo-Json
            Update-User -User $user
            return $true
        }
    }
    
    return $false
}
```

**API Endpoint for Backup Codes:**
```powershell
# POST /api/public/2fatoken?action=verify
switch ($action) {
    "verify" {
        # ... existing email/TOTP verification ...
        
        # Also check if it's a backup code
        if (-not $isValid) {
            $isValid = Test-BackupCode -UserId $session.userId -SubmittedCode $token
            if ($isValid) {
                Write-Host "User authenticated with backup code"
            }
        }
    }
}
```

**Frontend Changes Needed:**
- Add note in verification UI: "Lost your device? Use a backup code"
- Backend should accept backup codes in the verify endpoint
- No changes needed to frontend code - just documentation

### 3. Make 2FA Optional (For Now)

**REQUIRED**: 2FA must be optional, not mandatory.

**Implementation:**
```powershell
function Test-Requires2FA {
    param([object]$User)
    
    # 2FA is optional - only enforce if user has enabled it
    $has2FA = $User.twoFactorEnabled -eq $true -and 
              ($User.twoFactorEmailEnabled -eq $true -or 
               $User.twoFactorTotpEnabled -eq $true)
    
    return $has2FA
}

# In Login endpoint:
$user = Get-UserByEmail -Email $email
if (Test-PasswordValid -User $user -Password $password) {
    if (Test-Requires2FA -User $user) {
        # User has 2FA enabled - require it
        return @{
            requires2FA = $true
            twoFactorMethod = Get-2FAMethod -User $user
            sessionId = New-2FASession -User $user
        }
    }
    else {
        # User doesn't have 2FA - log them in directly
        return @{
            user = Get-UserAuthObject -User $user
        }
    }
}
```

**Admin/Settings UI:**
- Users should be able to enable/disable 2FA in their profile settings
- Default: 2FA is disabled for all users
- Users opt-in to enable 2FA
- Once enabled, 2FA is required for that user's login

### 4. Additional Security Requirements

**Rate Limiting:**
```powershell
# Implement rate limiting for verification attempts
function Test-RateLimitExceeded {
    param([string]$SessionId)
    
    $session = Get-2FASession -SessionId $SessionId
    
    if ($session.attemptsRemaining -le 0) {
        return $true
    }
    
    return $false
}

# In verify endpoint:
if (Test-RateLimitExceeded -SessionId $sessionId) {
    return @{
        statusCode = 429
        body = @{ error = "Too many failed attempts. Please try again later." } | ConvertTo-Json
    }
}

# Decrement attempts
$session.attemptsRemaining -= 1
Update-2FASession -Session $session
```

**Session Security:**
- Sessions expire after 10 minutes
- Sessions are single-use (invalidate after successful verification)
- Use cryptographically secure random session IDs (at least 32 bytes)
- Store session creation time and enforce expiration

```powershell
function New-2FASession {
    param([object]$User)
    
    # Generate secure random session ID
    $sessionId = [System.Convert]::ToBase64String(
        [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
    )
    
    $session = @{
        sessionId = $sessionId
        userId = $User.UserId
        createdAt = Get-Date
        expiresAt = (Get-Date).AddMinutes(10)
        attemptsRemaining = 5
        method = Get-2FAMethod -User $User
        availableMethods = Get-Available2FAMethods -User $User
    }
    
    Save-2FASession -Session $session
    return $sessionId
}
```

## 📋 Implementation Checklist

For the backend team:

### Phase 1: Security Foundation
- [ ] Implement encryption for TOTP secrets using Azure Key Vault
- [ ] Implement hashing for email 2FA codes
- [ ] Implement backup codes generation and storage
- [ ] Add backup code verification to verify endpoint
- [ ] Ensure 2FA is optional (not mandatory)
- [ ] Add rate limiting for verification attempts
- [ ] Implement secure session management with expiration

### Phase 2: Core Features
- [ ] Implement Login/Signup endpoints with 2FA detection
- [ ] Implement verify endpoint (email, TOTP, and backup codes)
- [ ] Implement resend endpoint for email codes
- [ ] Add proper error handling and logging (NO sensitive data in logs)

### Phase 3: Testing
- [ ] Test encryption/decryption of TOTP secrets
- [ ] Test backup code generation and usage
- [ ] Test that 2FA is optional
- [ ] Test rate limiting
- [ ] Test session expiration
- [ ] Test with users who have only email, only TOTP, or both

## 🔐 Security Best Practices Summary

1. **Never store sensitive data in plain text**
   - TOTP secrets: Encrypted with AES-256
   - Email codes: Hashed with SHA-256 or bcrypt
   - Backup codes: Hashed like passwords

2. **Use proper key management**
   - Store encryption keys in Azure Key Vault
   - Never hard-code keys in source code
   - Rotate keys periodically

3. **Implement defense in depth**
   - Rate limiting on attempts
   - Session expiration
   - Single-use codes/sessions
   - Backup codes for recovery

4. **Follow principle of least privilege**
   - 2FA is optional by default
   - Users opt-in to enable it
   - Clear disable process if needed

5. **Never log sensitive data**
   - Don't log TOTP secrets
   - Don't log 2FA codes
   - Don't log backup codes
   - Log verification attempts (success/failure) but not the codes

## 📖 Additional Resources

- [OWASP 2FA Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
- [Azure Key Vault Best Practices](https://learn.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

## 🆘 Questions?

If you have questions about:
- Encryption implementation → Check Azure Key Vault documentation
- Hashing algorithms → Use bcrypt for codes, SHA-256 acceptable
- Backup codes → See implementation example above
- Making 2FA optional → User must explicitly enable it in settings

See `2FA_BACKEND_API_REQUIREMENTS.md` for full API specifications.
