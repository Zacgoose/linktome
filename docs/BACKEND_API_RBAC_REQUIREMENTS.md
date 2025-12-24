# Backend API Requirements for RBAC Implementation

This document outlines all backend API changes required to support the Role-Based Access Control (RBAC) system implemented in the frontend.

## Overview

The RBAC system implements centralized route management with role and permission-based access control, similar to CIPP's architecture. The backend must:

1. **Store and manage user roles and permissions**
2. **Return role/permission data in authentication responses**
3. **Implement endpoint-level permission checking**
4. **Support token refresh for enhanced security**

---

## 1. Database Schema Changes

### User Table Extensions

Add the following fields to the User table:

```sql
-- User roles (can be multiple)
roles TEXT[] NOT NULL DEFAULT ARRAY['user'],

-- User permissions (can override default role permissions)
permissions TEXT[] NOT NULL DEFAULT ARRAY[],

-- Optional: Company association for company_owner role
companyId TEXT NULL,

-- Refresh token storage
refreshToken TEXT NULL,
refreshTokenExpiresAt TIMESTAMP NULL
```

### New Tables

#### Roles Table (Optional - for dynamic role management)
```sql
CREATE TABLE Roles (
    roleId TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    defaultPermissions TEXT[] NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO Roles (roleId, name, description, defaultPermissions) VALUES
('user', 'User', 'Standard user with access to their own profile and links', 
 ARRAY['read:dashboard', 'read:profile', 'write:profile', 'read:links', 'write:links', 'read:appearance', 'write:appearance', 'read:analytics']),
 
('admin', 'Administrator', 'Administrator with full system access',
 ARRAY['read:dashboard', 'read:profile', 'write:profile', 'read:links', 'write:links', 'manage:links', 'read:appearance', 'write:appearance', 'read:analytics', 'read:users', 'write:users', 'manage:users']),
 
('company_owner', 'Company Owner', 'Company owner who can manage multiple users',
 ARRAY['read:dashboard', 'read:profile', 'write:profile', 'read:links', 'write:links', 'read:appearance', 'write:appearance', 'read:analytics', 'read:users', 'write:users', 'manage:users', 'read:company', 'write:company', 'manage:company', 'read:company_members', 'manage:company_members', 'write:company_settings']);
```

---

## 2. JWT Token Changes

### Access Token Claims

Update JWT access tokens to include:

```typescript
{
  sub: string,              // User ID
  email: string,
  username: string,
  roles: string[],          // NEW: User roles
  permissions: string[],    // NEW: User permissions
  companyId?: string,       // NEW: Optional company ID
  iat: number,
  exp: number,              // SHORT EXPIRATION: 15 minutes recommended
  iss: string
}
```

### Refresh Token

Create refresh tokens with:
- **Expiration**: 7 days recommended
- **Storage**: Database (refreshToken field in User table)
- **Rotation**: Generate new refresh token on each refresh (optional but recommended for security)

---

## 3. Updated API Endpoints

### 3.1 Login Endpoint

**Endpoint**: `POST /api/public/Login`

**Request**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response** (Updated):
```json
{
  "accessToken": "string",     // Short-lived (15 min)
  "refreshToken": "string",    // NEW: Long-lived (7 days)
  "user": {
    "UserId": "string",
    "username": "string",
    "email": "string",
    "roles": ["user"],          // NEW
    "permissions": [            // NEW
      "read:dashboard",
      "read:profile",
      "write:profile",
      "read:links",
      "write:links",
      "read:appearance",
      "write:appearance",
      "read:analytics"
    ],
    "companyId": "string"       // NEW: Optional
  }
}
```

**Implementation Notes**:
1. Fetch user roles from database
2. Combine default role permissions with user-specific permissions
3. Generate both access and refresh tokens
4. Store refresh token in database with expiration
5. Return both tokens and full user info

---

### 3.2 NEW: Refresh Token Endpoint

**Endpoint**: `POST /api/public/RefreshToken`

**Request**:
```json
{
  "refreshToken": "string"
}
```

**Response**:
```json
{
  "accessToken": "string",      // New access token
  "refreshToken": "string"      // NEW refresh token (rotated for security)
}
```

**Implementation**:
1. Validate refresh token from database
2. Check if refresh token is expired
3. Generate new access token with updated user info (roles/permissions may have changed)
4. **Optionally**: Generate new refresh token and invalidate old one (rotation)
5. Update database with new refresh token
6. Return new tokens

**Error Responses**:
- `401 Unauthorized`: Invalid or expired refresh token
- `400 Bad Request`: Missing refresh token

---

### 3.3 NEW: Logout Endpoint

**Endpoint**: `POST /api/public/Logout`

**Request**:
```json
{
  "refreshToken": "string"
}
```

**Response**:
```json
{
  "success": true
}
```

**Implementation**:
1. Find and invalidate refresh token in database
2. Return success

---

### 3.4 Signup Endpoint

**Endpoint**: `POST /api/public/Signup`

**Request**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response** (Updated):
```json
{
  "accessToken": "string",     // NEW: Return token on signup
  "refreshToken": "string",    // NEW
  "user": {
    "UserId": "string",
    "username": "string",
    "email": "string",
    "roles": ["user"],          // NEW: Default to 'user' role
    "permissions": [            // NEW: Default user permissions
      "read:dashboard",
      "read:profile",
      "write:profile",
      "read:links",
      "write:links",
      "read:appearance",
      "write:appearance",
      "read:analytics"
    ]
  }
}
```

**Implementation Notes**:
1. Create user with default 'user' role
2. Assign default permissions based on role
3. Generate access and refresh tokens
4. Return tokens and user info

---

## 4. Endpoint-Level Permission Enforcement

### Middleware/Decorator for Permission Checking

Implement permission checking similar to CIPP's approach:

```powershell
# Example PowerShell implementation
function Invoke-AdminGetLinks {
    [RequiredPermissions("read:links")]
    param(
        $Request,
        $TriggerMetadata
    )
    
    # Validate JWT token
    $user = Get-UserFromToken -Token $Request.Headers.Authorization
    
    # Check permissions (middleware handles this via RequiredPermissions attribute)
    # If user doesn't have 'read:links' permission, return 403
    
    # Execute function logic
    $links = Get-UserLinks -UserId $user.sub
    return @{
        StatusCode = 200
        Body = @{
            success = $true
            links = $links
        } | ConvertTo-Json
    }
}
```

### Permission Mapping for Endpoints

Update each endpoint with required permissions:

#### Admin Endpoints

| Endpoint | Method | Required Permissions |
|----------|--------|---------------------|
| `/api/admin/GetProfile` | GET | `read:profile` |
| `/api/admin/UpdateProfile` | PUT | `write:profile` |
| `/api/admin/GetLinks` | GET | `read:links` |
| `/api/admin/CreateLink` | POST | `write:links` |
| `/api/admin/UpdateLink` | PUT | `write:links` |
| `/api/admin/DeleteLink` | DELETE | `write:links` |
| `/api/admin/GetAppearance` | GET | `read:appearance` |
| `/api/admin/UpdateAppearance` | PUT | `write:appearance` |
| `/api/admin/GetAnalytics` | GET | `read:analytics` |
| `/api/admin/GetDashboardStats` | GET | `read:dashboard` |
| `/api/admin/GetUsers` | GET | `read:users` |
| `/api/admin/CreateUser` | POST | `write:users` |
| `/api/admin/UpdateUser` | PUT | `write:users` |
| `/api/admin/DeleteUser` | DELETE | `manage:users` |
| `/api/admin/GetCompany` | GET | `read:company` |
| `/api/admin/UpdateCompany` | PUT | `write:company` |
| `/api/admin/GetCompanyMembers` | GET | `read:company_members` |
| `/api/admin/AddCompanyMember` | POST | `manage:company_members` |
| `/api/admin/RemoveCompanyMember` | DELETE | `manage:company_members` |

---

## 5. Permission Validation Helper Functions

### Helper: Extract User from JWT

```powershell
function Get-UserFromToken {
    param(
        [string]$Token
    )
    
    # Remove "Bearer " prefix if present
    if ($Token -match '^Bearer\s+(.+)$') {
        $Token = $Matches[1]
    }
    
    # Verify JWT signature and decode
    $jwt = ConvertFrom-JsonWebToken -Token $Token -SecureKey (Get-JwtSecret)
    
    return $jwt
}
```

### Helper: Check User Permissions

```powershell
function Test-UserPermission {
    param(
        [object]$User,
        [string[]]$RequiredPermissions
    )
    
    # Extract permissions from JWT claims
    $userPermissions = $User.permissions
    
    # Check if user has all required permissions
    foreach ($perm in $RequiredPermissions) {
        if ($userPermissions -notcontains $perm) {
            return $false
        }
    }
    
    return $true
}
```

### Helper: Check User Roles

```powershell
function Test-UserRole {
    param(
        [object]$User,
        [string[]]$RequiredRoles
    )
    
    # Extract roles from JWT claims
    $userRoles = $User.roles
    
    # Check if user has any of the required roles
    foreach ($role in $RequiredRoles) {
        if ($userRoles -contains $role) {
            return $true
        }
    }
    
    return $false
}
```

---

## 6. Error Responses

### 401 Unauthorized
Returned when token is missing, invalid, or expired:
```json
{
  "success": false,
  "error": "Unauthorized: Invalid or expired token"
}
```

### 403 Forbidden
Returned when user lacks required permissions:
```json
{
  "success": false,
  "error": "Forbidden: Insufficient permissions. Required: read:users"
}
```

---

## 7. Testing Requirements

### Test Cases

1. **Token Refresh Flow**:
   - Login → Get access + refresh tokens
   - Wait for access token to expire
   - Call RefreshToken endpoint
   - Verify new access token works

2. **Permission Enforcement**:
   - Create user with 'user' role
   - Attempt to access admin endpoint
   - Verify 403 response

3. **Role-Based Access**:
   - Create admin user
   - Verify access to admin endpoints
   - Create company_owner user
   - Verify access to company endpoints

4. **Token Rotation**:
   - Use refresh token
   - Verify old refresh token is invalidated
   - Attempt to use old refresh token
   - Verify 401 response

---

## 8. Migration Guide

### Step-by-Step Implementation

1. **Database Changes**:
   - Add roles, permissions, companyId fields to User table
   - Create Roles table (optional)
   - Add refresh token fields

2. **Update JWT Generation**:
   - Include roles and permissions in access token
   - Create refresh token generation function
   - Store refresh tokens in database

3. **Create New Endpoints**:
   - Implement RefreshToken endpoint
   - Implement Logout endpoint

4. **Update Existing Endpoints**:
   - Modify Login to return refresh token
   - Modify Signup to return tokens and roles
   - Add permission checking middleware to all admin endpoints

5. **Testing**:
   - Test token refresh flow
   - Test permission enforcement
   - Test role-based access
   - Test logout functionality

---

## 9. Security Considerations

1. **Short Access Token Lifespan**: 15 minutes recommended
2. **Refresh Token Rotation**: Generate new refresh token on each refresh
3. **Refresh Token Storage**: Store in database with expiration
4. **Permission Changes**: When user permissions change, they take effect on next token refresh
5. **Logout**: Invalidate refresh token in database
6. **Rate Limiting**: Implement rate limiting on RefreshToken endpoint

---

## 10. Example Implementation (PowerShell/Azure Functions)

### Refresh Token Function

```powershell
using namespace System.Net

function Invoke-PublicRefreshToken {
    param($Request, $TriggerMetadata)
    
    try {
        $body = $Request.Body | ConvertFrom-Json
        $refreshToken = $body.refreshToken
        
        if (-not $refreshToken) {
            return @{
                StatusCode = [HttpStatusCode]::BadRequest
                Body = @{ success = $false; error = "Missing refresh token" } | ConvertTo-Json
            }
        }
        
        # Validate refresh token from database
        $tokenRecord = Get-RefreshToken -Token $refreshToken
        
        if (-not $tokenRecord -or $tokenRecord.ExpiresAt -lt (Get-Date)) {
            return @{
                StatusCode = [HttpStatusCode]::Unauthorized
                Body = @{ success = $false; error = "Invalid or expired refresh token" } | ConvertTo-Json
            }
        }
        
        # Get user with latest roles and permissions
        $user = Get-User -UserId $tokenRecord.UserId
        
        # Generate new access token
        $newAccessToken = New-LinkToMeJWT -UserId $user.UserId -Email $user.Email -Username $user.Username -Roles $user.Roles -Permissions $user.Permissions -CompanyId $user.CompanyId
        
        # Generate new refresh token (rotation)
        $newRefreshToken = New-RefreshToken -UserId $user.UserId
        
        # Invalidate old refresh token and store new one
        Remove-RefreshToken -Token $refreshToken
        Save-RefreshToken -Token $newRefreshToken -UserId $user.UserId -ExpiresAt ((Get-Date).AddDays(7))
        
        return @{
            StatusCode = [HttpStatusCode]::OK
            Body = @{
                accessToken = $newAccessToken
                refreshToken = $newRefreshToken
            } | ConvertTo-Json
        }
    }
    catch {
        return @{
            StatusCode = [HttpStatusCode]::InternalServerError
            Body = @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json
        }
    }
}
```

---

## Summary

This RBAC implementation provides:
- ✅ Role-based access control
- ✅ Permission-based access control
- ✅ Token refresh for security
- ✅ Centralized permission enforcement
- ✅ Endpoint-level protection
- ✅ Company/multi-user support
- ✅ Audit trail via database

The frontend will automatically handle token refresh and permission checking based on the centralized route configuration.
