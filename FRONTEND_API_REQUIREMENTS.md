# Frontend API Requirements for Agency/Multi-Account Profiles

## Overview

This document outlines the API endpoints and data structures required by the frontend to implement the agency/multi-account profiles feature. The frontend has been updated to support sub-account management using existing permission-based access control.

---

## New API Endpoints Required

### 1. GET /admin/GetSubAccounts

**Purpose**: Retrieve list of sub-accounts owned by the authenticated parent account.

**Authentication**: Required (JWT token)

**Authorization**: User must have `manage:subaccounts` permission

**Request**: No request body (GET request)

**Response** (200 OK):
```json
{
  "subAccounts": [
    {
      "userId": "user-abc123",
      "username": "clientbrand1",
      "displayName": "Brand One",
      "email": "brand1@parent.com",
      "type": "agency_client",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z",
      "pagesCount": 2,
      "linksCount": 15
    }
  ],
  "total": 1,
  "limits": {
    "maxSubAccounts": 10,
    "usedSubAccounts": 1,
    "remainingSubAccounts": 9,
    "userPackType": "business"
  }
}
```

**Response Fields**:
- `subAccounts` (array): List of sub-account objects
  - `userId` (string, required): Sub-account user ID
  - `username` (string, required): Sub-account username
  - `displayName` (string, optional): Display name
  - `email` (string, optional): Email (for display only)
  - `type` (string, optional): Sub-account type (e.g., 'agency_client', 'brand', 'project')
  - `status` (string, required): Status ('active', 'suspended', 'deleted')
  - `createdAt` (string, required): ISO 8601 timestamp
  - `pagesCount` (number, optional): Number of pages created
  - `linksCount` (number, optional): Number of links created
- `total` (number): Total count of sub-accounts
- `limits` (object, optional): Quota information
  - `maxSubAccounts` (number): Maximum allowed (-1 for unlimited)
  - `usedSubAccounts` (number): Currently used slots
  - `remainingSubAccounts` (number): Available slots
  - `userPackType` (string, optional): User pack type ('starter', 'business', 'enterprise', null)

**Error Responses**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Missing `manage:subaccounts` permission

---

### 2. POST /admin/CreateSubAccount

**Purpose**: Create a new sub-account under the authenticated parent account.

**Authentication**: Required (JWT token)

**Authorization**: User must have `manage:subaccounts` permission

**Request Body**:
```json
{
  "username": "clientbrand1",
  "email": "brand1@parent.com",
  "displayName": "Brand One",
  "bio": "Official Brand One page",
  "type": "agency_client"
}
```

**Request Fields**:
- `username` (string, required): Unique username for sub-account
- `displayName` (string, optional): Display name
- `email` (string, optional): Email (for display purposes only)
- `bio` (string, optional): Biography text
- `type` (string, optional): Sub-account type

**Response** (200 OK):
```json
{
  "message": "Sub-account created successfully",
  "subAccount": {
    "userId": "user-abc123",
    "username": "clientbrand1",
    "displayName": "Brand One",
    "email": "brand1@parent.com",
    "type": "agency_client",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Backend Implementation Requirements**:
1. Create user in Users table with:
   - `IsSubAccount = true`
   - `AuthDisabled = true`
   - Assign `sub_account_user` role (limited permissions)
2. Create relationship in SubAccounts table:
   - `ParentAccountId` = authenticated user's ID
   - `SubAccountId` = newly created user's ID
3. Validate:
   - Username is unique across ALL users
   - Parent has available sub-account slots (check user pack limit)
   - Parent has `manage:subaccounts` permission

**Error Responses**:
- `400 Bad Request`: Invalid data or username already taken
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Missing permission or sub-account limit reached

**Error Examples**:
```json
{
  "error": "Username already taken"
}
```
```json
{
  "error": "Sub-account limit reached. Upgrade your user pack to create more sub-accounts."
}
```

---

### 3. DELETE /admin/DeleteSubAccount

**Purpose**: Delete a sub-account and mark it as deleted.

**Authentication**: Required (JWT token)

**Authorization**: User must have `manage:subaccounts` permission and own the sub-account

**Request Body**:
```json
{
  "userId": "user-abc123"
}
```

**Request Fields**:
- `userId` (string, required): Sub-account user ID to delete

**Response** (200 OK):
```json
{
  "message": "Sub-account deleted successfully"
}
```

**Backend Implementation Requirements**:
1. Verify parent owns the sub-account (check SubAccounts table relationship)
2. Update SubAccounts table: Set `Status = 'deleted'`
3. Optionally: Soft delete or archive user data (pages, links, analytics)
4. Keep user record for potential restore (30-day grace period recommended)

**Error Responses**:
- `400 Bad Request`: Invalid user ID
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: User doesn't own this sub-account or missing permission
- `404 Not Found`: Sub-account not found

---

## Updated API Response: User Authentication

### UserAuth Object Updates

The existing `UserAuth` object returned by login/refresh endpoints should include the following **optional** fields for display purposes:

```typescript
{
  "UserId": "user-123",
  "email": "user@example.com",
  "username": "myusername",
  "userRole": "user",
  "roles": ["user"],
  "permissions": ["read:dashboard", "write:links", "manage:subaccounts"], // Backend assigns based on role
  "tier": "pro",
  // NEW OPTIONAL FIELDS:
  "IsSubAccount": false,      // Whether this is a sub-account
  "AuthDisabled": false       // Whether authentication is disabled
}
```

**Fields**:
- `IsSubAccount` (boolean, optional): Set to `true` for sub-accounts, `false` or omitted for regular users
- `AuthDisabled` (boolean, optional): Set to `true` if authentication is disabled (should match `IsSubAccount`)

**Usage**: These fields are for display/UI purposes only. The frontend primarily relies on the `permissions` array for access control.

---

## Permission System Requirements

### New Permission: `manage:subaccounts`

**Description**: Grants ability to create, view, and delete sub-accounts.

**Assigned To**: 
- Users with purchased user packs (starter, business, enterprise)
- NOT assigned to sub-accounts (they cannot create nested sub-accounts)

**Backend Implementation**:
- Add `manage:subaccounts` to `Get-DefaultRolePermissions.ps1` for users with user packs
- Check this permission before allowing access to `/admin/GetSubAccounts`, `/admin/CreateSubAccount`, `/admin/DeleteSubAccount`

### Role Assignment for Sub-Accounts

Sub-accounts should be assigned the `sub_account_user` role which has **limited permissions**:

**Include**:
- `read:dashboard`, `read:profile`, `write:profile`
- `read:links`, `write:links`
- `read:pages`, `write:pages`
- `read:appearance`, `write:appearance`
- `read:analytics`
- `read:shortlinks`, `write:shortlinks`

**Exclude**:
- `write:2fauth`, `read:apiauth`, `create:apiauth`, `update:apiauth`, `delete:apiauth`
- `write:password`, `write:email`, `write:phone`
- `read:subscription`, `write:subscription`
- `manage:users`, `invite:user_manager`, `list:user_manager`, `remove:user_manager`
- `manage:subaccounts`

The frontend will check these permissions using existing code patterns:
```typescript
if (user.permissions.includes('manage:auth')) {
  // Show password, MFA, API keys settings
}
```

---

## Authentication Updates Required

### Login/API Key Validation

Add check for `AuthDisabled` flag:

```powershell
# In login endpoint
if ($User.AuthDisabled -eq $true) {
    return @{
        StatusCode = 403
        Body = @{
            error = "Authentication is disabled for this account"
        }
    }
}
```

Apply the same check to:
- Password login endpoint
- API key validation
- Password reset endpoints
- 2FA setup endpoints

---

## Tier Inheritance Implementation

### Update Get-UserSubscription.ps1

Add logic to return parent's tier for sub-accounts:

```powershell
function Get-UserSubscription {
    param([Parameter(Mandatory)][object]$User)
    
    # Check if this is a sub-account
    if ($User.IsSubAccount -eq $true) {
        $ParentUserId = Get-SubAccountOwner -SubAccountId $User.RowKey
        
        if ($ParentUserId) {
            # Get parent user
            $UsersTable = Get-LinkToMeTable -TableName 'Users'
            $SafeParentId = Protect-TableQueryValue -Value $ParentUserId
            $ParentUser = Get-LinkToMeAzDataTableEntity @UsersTable -Filter "RowKey eq '$SafeParentId'" | Select-Object -First 1
            
            if ($ParentUser) {
                # Get parent's subscription
                $ParentSubscription = Get-UserSubscription -User $ParentUser
                
                # Mark as inherited
                $ParentSubscription.IsInherited = $true
                $ParentSubscription.InheritedFromUserId = $ParentUserId
                
                return $ParentSubscription
            }
        }
    }
    
    # Normal subscription logic for regular users...
}
```

This ensures sub-accounts get their parent's tier features automatically.

---

## Database Schema Requirements

### 1. Users Table Additions

Add the following fields to the existing `Users` table:

```
- IsSubAccount (boolean, default: false)
- AuthDisabled (boolean, default: false)
- UserPackType (string, nullable) - 'starter', 'business', 'enterprise', null
- UserPackLimit (integer, default: 0) - Max sub-accounts allowed
- UserPackExpiresAt (datetime, nullable) - User pack expiration date
```

### 2. New SubAccounts Table

Create a new table to track parent-child relationships:

```
Table: SubAccounts
PartitionKey: ParentAccountId (parent's UserId)
RowKey: SubAccountId (sub-account's UserId)

Fields:
- ParentAccountId (string) - Parent user ID
- SubAccountId (string) - Sub-account user ID
- SubAccountType (string) - 'agency_client', 'brand', 'project', 'other'
- Status (string) - 'active', 'suspended', 'deleted'
- CreatedAt (datetime) - ISO 8601 format
- CreatedByUserId (string) - Who created this (for audit)
```

---

## Frontend Implementation Summary

### Files Updated

1. **src/types/api.ts**
   - Added `IsSubAccount` and `AuthDisabled` optional fields to `UserAuth` interface
   - Added `SubAccount` interface
   - Added `SubAccountsResponse` interface
   - Added `CreateSubAccountRequest` interface
   - Added `CreateSubAccountResponse` interface

2. **src/pages/admin/users.tsx**
   - Added sub-accounts section (conditionally shown if user has `manage:subaccounts` permission)
   - Added sub-account list table with search/filter
   - Added create sub-account dialog
   - Added delete sub-account functionality
   - Integrated with existing user management UI

### Permission Checks

The frontend checks the `permissions` array returned by the backend:

```typescript
const canManageSubAccounts = user?.permissions?.includes('manage:subaccounts') || false;
```

If the user has this permission, the sub-accounts section is shown.

### No Special Sub-Account Logic

The frontend **does not** include special logic to block features for sub-accounts. Instead, it relies on the `permissions` array:
- Sub-accounts won't have `manage:auth` → Password/MFA/API settings hidden
- Sub-accounts won't have `manage:billing` → Subscription settings hidden
- Sub-accounts won't have `manage:users` → User management hidden

This follows existing code patterns throughout the application.

---

## Testing Checklist

### Backend Testing

- [ ] Create sub-account endpoint validates username uniqueness
- [ ] Create sub-account endpoint checks user pack limits
- [ ] Create sub-account sets `IsSubAccount = true` and `AuthDisabled = true`
- [ ] Create sub-account assigns `sub_account_user` role with limited permissions
- [ ] Get sub-accounts returns only parent's sub-accounts
- [ ] Delete sub-account verifies ownership
- [ ] Sub-account cannot login (password or API)
- [ ] Sub-account gets parent's tier via `Get-UserSubscription`
- [ ] Sub-account permissions exclude sensitive operations

### Frontend Testing

- [ ] Sub-accounts section only shows for users with `manage:subaccounts` permission
- [ ] Create dialog validates required fields
- [ ] Create dialog shows error messages from API
- [ ] Sub-accounts list displays all fields correctly
- [ ] Search/filter works for sub-accounts
- [ ] Delete confirmation dialog appears
- [ ] Quota limits displayed correctly
- [ ] Warning shown when limit reached

---

## Example User Flows

### 1. Creating a Sub-Account

1. Parent user logs in (has `manage:subaccounts` permission)
2. Navigate to `/admin/users`
3. See "Sub-Accounts" section
4. Click "Create Sub-Account"
5. Fill in:
   - Username: `clientbrand1`
   - Display Name: `Client Brand One`
   - Email: `client@example.com`
6. Click "Create"
7. Backend validates:
   - Username not taken
   - Parent has available slots
   - Parent has permission
8. Backend creates:
   - User with `IsSubAccount=true`, `AuthDisabled=true`, role=`sub_account_user`
   - Relationship in SubAccounts table
9. Frontend refreshes list, shows success message

### 2. Deleting a Sub-Account

1. Parent user navigates to `/admin/users`
2. See sub-account in list
3. Click "Delete" button
4. Confirm deletion in dialog
5. Backend validates ownership
6. Backend marks as deleted in SubAccounts table
7. Frontend refreshes list, shows success message

### 3. Sub-Account Attempting Login (Should Fail)

1. Sub-account user tries to login at `/login`
2. Enter username and password
3. Backend checks `AuthDisabled` flag
4. Backend returns 403 error: "Authentication is disabled for this account"
5. Frontend shows error message

---

## Notes for API Team

### Key Implementation Points

1. **Use existing role system**: Assign `sub_account_user` role to sub-accounts with limited permissions
2. **Frontend checks permissions**: No special sub-account logic needed in frontend
3. **Tier inheritance**: Update `Get-UserSubscription.ps1` to return parent's tier for sub-accounts
4. **Simple flags**: Just `IsSubAccount` and `AuthDisabled` flags in Users table
5. **Relationship tracking**: SubAccounts table only tracks parent-child relationships

### What Frontend Expects

- Permission-based access control (via `permissions` array)
- Sub-accounts have `IsSubAccount=true` and `AuthDisabled=true` (optional display fields)
- Sub-accounts have `sub_account_user` role (limited permissions)
- Parent's tier returned for sub-accounts via existing tier lookup
- Standard error responses with `{ "error": "message" }` format

### Integration with Existing Code

- Uses existing `useApiGet` and `useApiPost` hooks
- Uses existing permission check patterns
- Uses existing error handling
- Uses existing UI components (MUI)
- Minimal new code, maximum reuse

---

## Summary

The frontend is ready to support agency/multi-account profiles with:
- **3 new API endpoints**: GetSubAccounts, CreateSubAccount, DeleteSubAccount
- **Permission-based access**: Checks `manage:subaccounts` permission
- **Role-based blocking**: Sub-accounts get `sub_account_user` role
- **Tier inheritance**: Backend returns parent's tier for sub-accounts
- **Minimal changes**: Leverages existing infrastructure

The backend team should focus on:
1. Implementing the 3 new endpoints
2. Adding `manage:subaccounts` permission
3. Creating `sub_account_user` role with limited permissions
4. Updating `Get-UserSubscription.ps1` for tier inheritance
5. Adding `AuthDisabled` check to login/API validation
6. Creating SubAccounts table for relationship tracking
