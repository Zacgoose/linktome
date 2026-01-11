# Agency/Multi-Account Profiles - Planning Document

## Overview

This document outlines the planning and design considerations for implementing agency/multi-account profiles in LinkToMe. This feature will allow parent accounts to create and manage sub-accounts (child profiles) where:

- Sub-accounts do NOT have independent login or authentication
- Sub-accounts do NOT have access to management features (API keys, MFA, user management, subscription management)
- Sub-accounts inherit their feature access from the parent account's subscription plan
- Parent accounts can manage all aspects of their sub-accounts

This is similar to:
- Social media management tools where agencies manage multiple client profiles
- Project management tools with client workspaces
- Multi-brand management systems

## Business Use Cases

### 1. Agency Use Case
An agency managing multiple client brands:
- Parent Account: "Creative Agency Pro" (Premium tier)
- Sub-accounts: "Client Brand A", "Client Brand B", "Client Brand C"
- Each client has their own LinkToMe page with unique branding
- Agency manages all pages from one dashboard
- Agency subscription covers all client accounts

### 2. Multi-Brand Business
A business with multiple brands:
- Parent Account: "Parent Company" (Enterprise tier)
- Sub-accounts: "Brand A", "Brand B", "Brand C"
- Each brand has independent public presence
- Centralized billing and management
- Shared feature access based on parent's plan

### 3. Influencer with Multiple Personas
An influencer with different content types:
- Parent Account: "Main Account" (Pro tier)
- Sub-accounts: "Gaming Channel", "Cooking Channel", "Travel Blog"
- Each persona has separate link pages
- All managed from one account

## Key Distinctions

### Existing Multi-Page System vs. Multi-Account Profiles

The application already has a **multi-page system** where users can create multiple pages with different slugs (e.g., `/username/main`, `/username/music`). The new **multi-account profiles** system is different:

| Feature | Multi-Page System | Multi-Account Profiles |
|---------|-------------------|------------------------|
| User Authentication | Single user account | Parent + multiple sub-accounts |
| Public URL | `/username/slug` | `/sub-account-username` |
| Username | Shared across pages | Each sub-account has unique username |
| Branding | Pages share user profile | Each sub-account can have different profile |
| Management | Parent manages their own pages | Parent manages sub-account pages |
| Feature Access | Based on user's tier | Based on parent's tier |
| Login | User logs in | Only parent can log in |
| Subscription | Per user | Parent pays for all sub-accounts |

### Example Comparison

**Multi-Page System (Current)**:
- User: `@creativestudio`
- Pages: `/creativestudio/main`, `/creativestudio/portfolio`, `/creativestudio/contact`
- All pages share same user context and profile

**Multi-Account Profiles (Proposed)**:
- Parent: `@creativestudio` (manages everything)
- Sub-accounts: `@clientbrand1`, `@clientbrand2`, `@clientbrand3`
- Each has independent URL: `/clientbrand1`, `/clientbrand2`, `/clientbrand3`
- Each can have different username, email, display name, avatar
- Parent manages all from their dashboard

## Terminology

To maintain clarity throughout the implementation:

- **Parent Account**: The primary account that owns and manages sub-accounts (has login, subscription, full management features)
- **Sub-Account / Child Account / Managed Profile**: A profile created and managed by a parent account (no login, inherits features from parent)
- **Account Relationship**: The link between parent and sub-account
- **Feature Inheritance**: Sub-accounts use parent's tier limits for features
- **Delegation**: Parent acts on behalf of sub-account (manages their links, appearance, etc.)

## Data Model Changes

### 1. New Database Tables

#### AccountRelationships Table

**Purpose**: Track parent-child relationships between accounts

**Schema**:
```
PartitionKey: ParentUserId (GUID)
RowKey: ChildUserId (GUID)
RelationshipType: "sub-account" | "managed-profile"
CreatedAt: DateTime
UpdatedAt: DateTime
Status: "active" | "suspended" | "deleted"
Notes: string (optional, for internal tracking)
```

**Indexes**:
- Primary: `PartitionKey` (ParentUserId) + `RowKey` (ChildUserId)
- Secondary: Filter by ChildUserId for reverse lookup

**Validation Rules**:
- ParentUserId must be a valid, active user
- ChildUserId must be a valid user
- A user cannot be both parent and child in the same relationship
- Prevent circular relationships (A manages B, B manages A)
- Relationship type must be valid enum value

#### SubAccountProfiles Table (Optional Enhancement)

**Purpose**: Store additional metadata specific to sub-accounts that differs from regular user profiles

**Schema**:
```
PartitionKey: UserId (GUID) - the sub-account's ID
RowKey: "profile"
ParentUserId: GUID - reference to parent
DisplayLabel: string - how parent sees this account in their dashboard
InternalNotes: string - parent's notes about this sub-account
CreatedBy: GUID - which parent account created it
IsSubAccount: boolean - flag for quick filtering
```

### 2. Updated Database Tables

#### Users Table - Add Fields

**New Columns**:
- `IsSubAccount` (boolean): Marks this user as a sub-account (cannot login independently)
- `ParentAccountId` (string, nullable): Reference to parent account if this is a sub-account
- `AccountType` (string): "standard" | "parent" | "sub-account"
- `AuthenticationDisabled` (boolean): Explicitly disable authentication for sub-accounts

**Migration Considerations**:
- Default all existing users to `IsSubAccount = false` and `AccountType = "standard"`
- `ParentAccountId` is NULL for existing users
- `AuthenticationDisabled = false` for existing users

#### Subscription Table - Updates

**New Columns**:
- `IncludedSubAccounts` (integer): Number of sub-accounts included in plan (tier-based)
- `UsedSubAccounts` (integer): Current number of active sub-accounts

**Note**: Sub-accounts do NOT have their own subscription records. They inherit from parent.

### 3. Feature Limits by Tier for Sub-Accounts

Update `src/types/tiers.ts` to include sub-account limits:

```typescript
export interface TierLimits {
  // ... existing fields ...
  
  // Sub-account features
  maxSubAccounts: number;
  subAccountsIncluded: boolean;
}

export const TIER_CONFIG: Record<UserTier, TierLimits> = {
  [UserTier.FREE]: {
    // ... existing limits ...
    maxSubAccounts: 0,
    subAccountsIncluded: false,
  },
  [UserTier.PRO]: {
    // ... existing limits ...
    maxSubAccounts: 0,
    subAccountsIncluded: false,
  },
  [UserTier.PREMIUM]: {
    // ... existing limits ...
    maxSubAccounts: 3,
    subAccountsIncluded: true,
  },
  [UserTier.ENTERPRISE]: {
    // ... existing limits ...
    maxSubAccounts: -1, // unlimited
    subAccountsIncluded: true,
  },
};
```

**Tier Access**:
- FREE: Cannot create sub-accounts
- PRO: Cannot create sub-accounts (could be changed based on business model)
- PREMIUM: Up to 3 sub-accounts
- ENTERPRISE: Unlimited sub-accounts

## API Changes Needed

### 1. New Sub-Account Management Endpoints

#### Create Sub-Account
```
POST /admin/CreateSubAccount
Authentication: Required (parent account token)
Tier: PREMIUM+ required

Request Body:
{
  "username": "clientbrand1",
  "email": "client@example.com", // optional, for notifications
  "displayName": "Client Brand Name",
  "internalLabel": "Client A - Fashion", // optional, for parent's dashboard
  "bio": "Brief description",
  "notes": "Internal notes about this client" // optional
}

Response (200 OK):
{
  "message": "Sub-account created successfully",
  "subAccount": {
    "id": "sub-account-guid",
    "username": "clientbrand1",
    "email": "client@example.com",
    "displayName": "Client Brand Name",
    "parentAccountId": "parent-guid",
    "isSubAccount": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}

Validation:
- Parent account must have PREMIUM+ tier
- Check maxSubAccounts limit for parent's tier
- Username must be unique across ALL users (not just sub-accounts)
- Username follows same validation as regular users
- Parent cannot exceed their sub-account limit
- Validate email format if provided

Errors:
400 - Tier insufficient (upgrade required)
400 - Sub-account limit reached
400 - Username already taken
400 - Invalid username format
```

#### Get Sub-Accounts
```
GET /admin/GetSubAccounts
Authentication: Required (parent account token)
Tier: PREMIUM+ (only returns data if user has sub-accounts)

Response (200 OK):
{
  "subAccounts": [
    {
      "id": "sub-account-guid-1",
      "username": "clientbrand1",
      "email": "client1@example.com",
      "displayName": "Client Brand 1",
      "internalLabel": "Client A",
      "parentAccountId": "parent-guid",
      "isSubAccount": true,
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z",
      "pageCount": 2,
      "linkCount": 15
    }
  ],
  "limits": {
    "maxSubAccounts": 3,
    "usedSubAccounts": 1,
    "remainingSubAccounts": 2
  }
}
```

#### Update Sub-Account
```
PUT /admin/UpdateSubAccount
Authentication: Required (parent account token)
Tier: PREMIUM+

Request Body:
{
  "subAccountId": "sub-account-guid",
  "displayName": "Updated Client Name", // optional
  "email": "newemail@example.com", // optional
  "bio": "Updated bio", // optional
  "internalLabel": "Updated Label", // optional
  "notes": "Updated notes" // optional
}

Response (200 OK):
{
  "message": "Sub-account updated successfully",
  "subAccount": { /* updated sub-account data */ }
}

Validation:
- Parent must own the sub-account
- Cannot change username (requires deletion and recreation)
- Email must be valid if provided
```

#### Delete Sub-Account
```
DELETE /admin/DeleteSubAccount
Authentication: Required (parent account token)
Tier: PREMIUM+

Request Body:
{
  "subAccountId": "sub-account-guid",
  "confirmDelete": true // safety check
}

Response (200 OK):
{
  "message": "Sub-account deleted successfully"
}

Validation:
- Parent must own the sub-account
- confirmDelete must be true
- Cascade delete or archive all related data:
  - Pages
  - Links
  - Appearance settings
  - Analytics data (or mark as archived)
  - Short links

Considerations:
- Soft delete vs hard delete?
- Archive analytics for historical reporting?
- Backup sub-account data before deletion?
```

#### Suspend/Reactivate Sub-Account
```
POST /admin/UpdateSubAccountStatus
Authentication: Required (parent account token)
Tier: PREMIUM+

Request Body:
{
  "subAccountId": "sub-account-guid",
  "status": "active" | "suspended"
}

Response (200 OK):
{
  "message": "Sub-account status updated",
  "subAccount": {
    "id": "sub-account-guid",
    "status": "suspended",
    "suspendedAt": "2024-01-15T00:00:00Z"
  }
}

Effect:
- Suspended sub-accounts:
  - Public profile returns 404 or "temporarily unavailable" message
  - Cannot be accessed by parent for editing (optional)
  - Analytics continue to accumulate (optional)
  - Count against sub-account limit
```

### 2. Context-Switching Endpoints

#### Switch Context to Sub-Account
```
POST /admin/SwitchToSubAccount
Authentication: Required (parent account token)
Tier: PREMIUM+

Request Body:
{
  "subAccountId": "sub-account-guid"
}

Response (200 OK):
{
  "message": "Switched to sub-account context",
  "activeContext": {
    "userId": "sub-account-guid",
    "username": "clientbrand1",
    "parentUserId": "parent-guid",
    "isSubAccountContext": true
  }
}

Notes:
- Sets a session/context flag for the parent's session
- All subsequent admin API calls operate on behalf of the sub-account
- Parent's token remains valid but operations target sub-account
- Must be explicitly cleared with SwitchToParentAccount
```

#### Switch Context Back to Parent
```
POST /admin/SwitchToParentAccount
Authentication: Required (parent account token, in sub-account context)

Response (200 OK):
{
  "message": "Switched back to parent account context",
  "activeContext": {
    "userId": "parent-guid",
    "username": "parentuser",
    "isSubAccountContext": false
  }
}
```

#### Get Active Context
```
GET /admin/GetActiveContext
Authentication: Required

Response (200 OK):
{
  "activeContext": {
    "userId": "active-user-guid",
    "username": "active-username",
    "isSubAccountContext": boolean,
    "parentUserId": "parent-guid" // if in sub-account context
  }
}
```

### 3. Updated Existing Endpoints

All existing admin endpoints need to support **context awareness**:

#### Links, Pages, Appearance, Analytics Endpoints

**Behavior Changes**:
- When parent is in sub-account context, operations target the sub-account
- Feature limits are checked against parent's tier, not sub-account
- Authentication validates parent's token, but operations use sub-account's userId

**Example**: `GET /admin/GetLinks`
```
// Parent in their own context
GET /admin/GetLinks
→ Returns parent's links

// Parent switched to sub-account context
POST /admin/SwitchToSubAccount { subAccountId: "sub-1" }
GET /admin/GetLinks
→ Returns sub-account's links

// Explicit parameter (alternative approach)
GET /admin/GetLinks?subAccountId=sub-1
→ Returns sub-account's links if parent owns it
```

**Implementation Approach Options**:

**Option A: Session-Based Context (Recommended)**
- Parent explicitly switches context via API
- Server maintains session state of active context
- All subsequent requests operate in that context
- Clearer separation, less error-prone
- Better for UI (single context at a time)

**Option B: Parameter-Based Context**
- Add optional `subAccountId` query parameter to all admin endpoints
- Each request specifies which account to operate on
- More flexible for API clients
- Stateless - no session management needed
- Could be error-prone in UI

**Recommended: Hybrid Approach**
- UI uses session-based context switching (Option A)
- API clients can use `subAccountId` parameter (Option B)
- Server prioritizes explicit parameter over session context

### 4. Feature Access Validation Updates

All admin endpoints must validate features against **parent's tier**, not sub-account:

```powershell
# Pseudo-code for validation logic
function Validate-FeatureAccess($requestUserId, $feature) {
    $user = Get-User $requestUserId
    
    if ($user.IsSubAccount) {
        # Get parent's tier for validation
        $parentUser = Get-User $user.ParentAccountId
        $effectiveTier = $parentUser.tier
    } else {
        $effectiveTier = $user.tier
    }
    
    $limits = Get-TierLimits $effectiveTier
    # Validate against limits...
}
```

## Frontend Changes Needed

### 1. New UI Components

#### Sub-Account Management Page
**Route**: `/admin/sub-accounts`

**Features**:
- List all sub-accounts in a table/card grid
- Show status, stats (pages, links, last updated)
- Create new sub-account button (with tier check)
- Edit sub-account details
- Suspend/delete actions
- Quick switch to sub-account context
- Display remaining sub-account slots

**Mockup Structure**:
```
+--------------------------------------------------+
| Sub-Accounts Management                     [+ Create] |
+--------------------------------------------------+
| 3 of 5 sub-accounts used (PREMIUM tier)              |
+--------------------------------------------------+
| [Search/Filter]                                       |
+--------------------------------------------------+
| Client Brand 1                        [Switch] [Edit] |
| @clientbrand1 | Active | 2 pages | 15 links          |
+--------------------------------------------------+
| Client Brand 2                        [Switch] [Edit] |
| @clientbrand2 | Active | 1 page  | 8 links           |
+--------------------------------------------------+
| Client Brand 3                        [Switch] [Edit] |
| @clientbrand3 | Suspended | 1 page | 5 links         |
+--------------------------------------------------+
```

#### Context Switcher Component
**Location**: Top navigation bar (when parent has sub-accounts)

**Features**:
- Dropdown showing current context
- List of sub-accounts for quick switching
- Visual indicator when in sub-account context
- "Back to Parent" button when in sub-account context

**Mockup**:
```
+----------------------------------------+
| [☰ Menu] | 🔄 Managing: ClientBrand1 ▼ |
+----------------------------------------+
           | ✓ My Account (Parent)      |
           | -------------------------- |
           | → ClientBrand1 (Active)    |
           | → ClientBrand2 (Active)    |
           | → ClientBrand3 (Suspended) |
           | -------------------------- |
           | ⚙️ Manage Sub-Accounts     |
           +----------------------------+
```

#### Create Sub-Account Dialog
**Triggered from**: Sub-Accounts page

**Fields**:
- Username (required, unique validation)
- Display Name (required)
- Email (optional)
- Bio (optional)
- Internal Label (optional, for parent's reference)
- Notes (optional, private to parent)

**Validation**:
- Check parent's tier and sub-account limit
- Validate username format and uniqueness
- Show upgrade prompt if limit reached

### 2. Updated Components

#### Admin Layout
**Changes**:
- Add context awareness
- Show context switcher when managing sub-accounts
- Display banner/indicator when in sub-account context
- Ensure all child pages respect active context

#### Navigation Menu
**Changes**:
- Add "Sub-Accounts" menu item (visible to PREMIUM+ users)
- Conditionally show based on tier
- Badge showing sub-account count

#### Dashboard
**Changes**:
- Display stats for active context (parent or sub-account)
- Show context indicator at top
- Option to view aggregate stats across all sub-accounts (parent only)

#### Settings Page
**Changes**:
- Disable authentication-related settings when in sub-account context:
  - Password change
  - MFA setup
  - API keys
  - User management (invites)
  - Subscription management
- Show read-only message: "These settings are managed by parent account"

### 3. New Context Management

#### SubAccountContext Provider
**Purpose**: Manage active context state globally

**Location**: `src/context/SubAccountContext.tsx`

**State**:
```typescript
interface SubAccountContextType {
  activeContext: {
    userId: string;
    username: string;
    isSubAccountContext: boolean;
    parentUserId?: string;
  } | null;
  subAccounts: SubAccount[];
  switchToSubAccount: (subAccountId: string) => Promise<void>;
  switchToParent: () => Promise<void>;
  refreshSubAccounts: () => Promise<void>;
  loading: boolean;
}
```

**Integration**:
- Wrap `AdminLayout` with `SubAccountProvider`
- Automatically fetch sub-accounts if user has appropriate tier
- Provide context to all child components

### 4. Access Control in Frontend

Update all admin pages to respect context:

```typescript
// Example: Settings page
export default function SettingsPage() {
  const { activeContext } = useSubAccountContext();
  const isSubAccountContext = activeContext?.isSubAccountContext;
  
  return (
    <AdminLayout>
      {isSubAccountContext && (
        <Alert severity="info">
          You are managing a sub-account. Some settings are controlled by the parent account.
        </Alert>
      )}
      
      {/* Password Section - disabled in sub-account context */}
      <Card>
        <CardContent>
          <Typography variant="h6">Password</Typography>
          {isSubAccountContext ? (
            <Alert severity="warning">
              Sub-accounts do not have independent login. This is managed by the parent account.
            </Alert>
          ) : (
            <PasswordChangeForm />
          )}
        </CardContent>
      </Card>
      
      {/* Similar for MFA, API Keys, etc. */}
    </AdminLayout>
  );
}
```

## Security Considerations

### 1. Authentication & Authorization

#### Sub-Account Authentication Rules
- Sub-accounts CANNOT authenticate independently
- No password, no MFA, no API keys for sub-accounts
- Only parent can "assume" sub-account identity via context switch
- `AuthenticationDisabled` flag must be enforced at login

#### Context Switching Security
```powershell
# Validate parent owns sub-account before switching
function Switch-ToSubAccount($parentToken, $subAccountId) {
    $parentUserId = Get-UserIdFromToken $parentToken
    
    # Verify relationship exists
    $relationship = Get-AccountRelationship $parentUserId $subAccountId
    if (!$relationship -or $relationship.Status -ne "active") {
        throw "Unauthorized: You do not manage this sub-account"
    }
    
    # Verify sub-account exists and is active
    $subAccount = Get-User $subAccountId
    if (!$subAccount -or $subAccount.IsSubAccount -ne $true) {
        throw "Invalid sub-account"
    }
    
    # Set context in session
    Set-SessionContext $parentToken @{
        activeUserId = $subAccountId
        parentUserId = $parentUserId
        isSubAccountContext = $true
    }
}
```

#### Token Validation Updates
```powershell
# All admin endpoints must validate context
function Validate-AdminRequest($request) {
    $token = Get-TokenFromHeader $request.Headers.Authorization
    $userId = Get-UserIdFromToken $token
    
    # Check if user is in sub-account context
    $context = Get-SessionContext $token
    if ($context.isSubAccountContext) {
        $activeUserId = $context.activeUserId
        $parentUserId = $context.parentUserId
        
        # Verify relationship still valid
        Validate-SubAccountRelationship $parentUserId $activeUserId
        
        return @{
            authenticatedUserId = $parentUserId  # who is authenticated
            activeUserId = $activeUserId          # who we're operating as
            tier = (Get-User $parentUserId).tier  # use parent's tier
        }
    }
    
    return @{
        authenticatedUserId = $userId
        activeUserId = $userId
        tier = (Get-User $userId).tier
    }
}
```

### 2. Data Isolation

#### Queries Must Respect Context
```powershell
# Example: Get Links
function Get-UserLinks($requestContext) {
    $targetUserId = $requestContext.activeUserId
    
    # Verify parent has permission if in sub-account context
    if ($requestContext.isSubAccountContext) {
        Validate-ParentOwnsSubAccount `
            $requestContext.authenticatedUserId `
            $targetUserId
    }
    
    # Fetch data for active user
    $links = Get-AzTableRow -Table $linksTable -PartitionKey $targetUserId
    return $links
}
```

#### Cross-Account Access Prevention
- Parents cannot access other parents' sub-accounts
- Sub-accounts cannot access parent's data (they can't login)
- Prevent accidental data leaks through analytics, shared resources

### 3. Audit Logging

Track all sub-account operations:

```powershell
function Write-SubAccountAuditLog($action, $parentUserId, $subAccountId, $metadata) {
    $log = @{
        PartitionKey = $parentUserId
        RowKey = (New-Guid).ToString()
        Timestamp = (Get-Date).ToUniversalTime()
        Action = $action  # Created, Updated, Deleted, Switched, etc.
        SubAccountId = $subAccountId
        Metadata = ($metadata | ConvertTo-Json)
    }
    
    Add-AzTableRow -Table $auditLogTable -Entity $log
}

# Log key operations
Write-SubAccountAuditLog "SubAccountCreated" $parentUserId $subAccountId @{ username = $username }
Write-SubAccountAuditLog "ContextSwitched" $parentUserId $subAccountId @{}
Write-SubAccountAuditLog "LinksUpdated" $parentUserId $subAccountId @{ linkCount = 5 }
```

### 4. Rate Limiting

Apply rate limits to parent account, not individual sub-accounts:

```powershell
# API rate limiting
function Check-RateLimit($requestContext) {
    # Always check against parent's limits
    $rateLimitUserId = if ($requestContext.isSubAccountContext) {
        $requestContext.authenticatedUserId  # parent
    } else {
        $requestContext.activeUserId
    }
    
    # Check rate limit for parent
    $rateLimit = Get-RateLimit $rateLimitUserId
    if ($rateLimit.Exceeded) {
        throw "Rate limit exceeded"
    }
}
```

## Subscription & Billing Implications

### 1. Tier-Based Sub-Account Limits

| Tier | Max Sub-Accounts | Feature Access |
|------|------------------|----------------|
| FREE | 0 | N/A |
| PRO | 0 | N/A |
| PREMIUM | 3 | Full PREMIUM features |
| ENTERPRISE | Unlimited | Full ENTERPRISE features |

### 2. Billing Considerations

**Current State**:
- Payment processing not implemented
- Manual subscription management

**Future Considerations**:
- Should sub-accounts incur additional charges?
- Flat rate for X sub-accounts included in tier?
- Pay-per-sub-account after included limit?
- Different pricing for sub-account-heavy plans?

**Recommended Pricing Model** (for future):
- PREMIUM: Base price includes 3 sub-accounts
- ENTERPRISE: Base price includes unlimited sub-accounts
- Option to add more sub-accounts to PREMIUM: $X per additional account per month

### 3. Feature Quota Management

**Question**: How do feature limits apply with sub-accounts?

**Option A: Shared Quota** (Recommended for MVP)
- Parent and all sub-accounts share the parent's tier limits
- Example: PREMIUM has 100 links max total across parent + all sub-accounts
- Simpler to implement
- Encourages higher tier upgrades
- Example:
  - Parent uses 30 links
  - Sub-account 1 uses 20 links
  - Sub-account 2 uses 40 links
  - Total: 90/100 links used

**Option B: Per-Account Quota**
- Each sub-account gets the full tier limits independently
- Example: PREMIUM has 100 links per account (parent + each sub-account)
- More generous to customers
- More complex to implement and track
- Could enable abuse
- Example:
  - Parent: 100 links max
  - Sub-account 1: 100 links max
  - Sub-account 2: 100 links max
  - Total: 300 links possible

**Recommendation**: Start with Option A (Shared Quota) for MVP. Upgrade to Option B later if needed based on customer feedback.

### 4. Downgrade Scenarios

**What happens when parent downgrades tier?**

**Scenario 1**: ENTERPRISE → PREMIUM (unlimited → 3 sub-accounts)
- Parent has 5 active sub-accounts
- Options:
  - A: Suspend 2 sub-accounts until parent upgrades or deletes others
  - B: Grace period (30 days) to reduce to 3
  - C: Allow existing but prevent new sub-accounts (grandfather)

**Scenario 2**: PREMIUM → PRO (3 → 0 sub-accounts)
- Parent has 2 active sub-accounts
- Options:
  - A: Suspend all sub-accounts immediately
  - B: Grace period to upgrade or migrate data
  - C: Convert sub-accounts to independent accounts (requires email/password setup)

**Recommended Approach**:
- Grace period (30 days) with email warnings
- During grace period: sub-accounts continue working but in "read-only" mode
- Parent can delete sub-accounts or upgrade to restore access
- Automatic suspension after grace period

## Migration Strategy

### 1. Existing Users

**Impact**: None for existing users initially
- All existing users remain `AccountType = "standard"`
- Feature is opt-in for PREMIUM+ tiers
- No changes to existing workflows

### 2. Database Migration

**Step 1**: Add new columns to Users table
```sql
ALTER TABLE Users ADD COLUMN IsSubAccount BOOLEAN DEFAULT FALSE
ALTER TABLE Users ADD COLUMN ParentAccountId NVARCHAR(64) NULL
ALTER TABLE Users ADD COLUMN AccountType NVARCHAR(20) DEFAULT 'standard'
ALTER TABLE Users ADD COLUMN AuthenticationDisabled BOOLEAN DEFAULT FALSE
```

**Step 2**: Create AccountRelationships table
```sql
CREATE TABLE AccountRelationships (
    PartitionKey NVARCHAR(64) NOT NULL,  -- ParentUserId
    RowKey NVARCHAR(64) NOT NULL,        -- ChildUserId
    RelationshipType NVARCHAR(20) NOT NULL,
    CreatedAt DATETIME NOT NULL,
    UpdatedAt DATETIME NOT NULL,
    Status NVARCHAR(20) NOT NULL,
    Notes NVARCHAR(500) NULL,
    PRIMARY KEY (PartitionKey, RowKey)
)
```

**Step 3**: Update tier limits configuration
- Add maxSubAccounts to TIER_CONFIG
- Deploy updated tier validation logic

### 3. Rollout Plan

**Phase 1: Backend API (Week 1-2)**
- Implement database changes
- Create sub-account management endpoints
- Implement context switching logic
- Add security validations
- Update feature access checks

**Phase 2: Frontend UI (Week 3-4)**
- Create sub-account management page
- Implement context switcher component
- Update admin layout for context awareness
- Add access control to restricted features
- Create SubAccountContext provider

**Phase 3: Testing (Week 5)**
- Integration testing
- Security testing
- User acceptance testing with select customers
- Performance testing with multiple sub-accounts

**Phase 4: Beta Launch (Week 6)**
- Enable feature for ENTERPRISE tier only
- Monitor usage and gather feedback
- Fix bugs and refine UX

**Phase 5: General Availability (Week 7+)**
- Enable for PREMIUM tier
- Public announcement
- Documentation and support materials

## API Discussion Points for Team

### 1. Context Management Approach

**Question**: Session-based vs parameter-based context switching?

**Option A: Session-Based (Recommended)**
- POST /admin/SwitchToSubAccount sets session state
- All subsequent requests operate in that context
- Requires session management
- Better for UI (single active context)

**Option B: Parameter-Based**
- Add ?subAccountId=xxx to every endpoint
- Stateless, no session management
- More flexible for API clients
- Could be error-prone in UI (forgetting parameter)

**Option C: Hybrid (Recommended)**
- UI uses session-based switching
- API clients can use parameter override
- Best of both worlds

**Team Decision Needed**: Which approach to implement?

### 2. Feature Quota Model

**Question**: Shared quota vs per-account quota?

**Option A: Shared Quota (Recommended)**
- Parent + all sub-accounts share parent's tier limits
- Example: PREMIUM 100 links total
- Simpler to implement
- Encourages upgrades

**Option B: Per-Account Quota**
- Each account gets full limits
- Example: PREMIUM 100 links each
- More generous
- Complex tracking
- Potential abuse

**Team Decision Needed**: Which quota model aligns with business goals?

### 3. Sub-Account Limit Enforcement

**Question**: What happens when parent exceeds sub-account limit after downgrade?

**Options**:
- A: Immediate suspension of excess sub-accounts
- B: Grace period (30 days) with warnings
- C: Grandfather existing but prevent new
- D: Convert excess to paid add-ons

**Team Decision Needed**: Enforcement policy and timeline?

### 4. Public Profile Behavior

**Question**: How do sub-account profiles appear publicly?

**Option A: Identical to Regular Users (Recommended)**
- /subaccountusername shows profile exactly like regular user
- No indication it's a sub-account
- Better for white-label/agency use cases

**Option B: Show Parent Association**
- Display "Managed by @parentuser" on profile
- More transparent
- May not suit agency use cases

**Team Decision Needed**: Show parent association or keep it hidden?

### 5. Analytics Aggregation

**Question**: Should parent see aggregated analytics across sub-accounts?

**Features to Consider**:
- Aggregate dashboard showing total stats across all sub-accounts
- Individual sub-account analytics (already covered by context switching)
- Comparative view (sub-account A vs B vs C)
- Export combined analytics

**Team Decision Needed**: Which analytics features to prioritize?

### 6. Email & Notification Handling

**Question**: How to handle emails for sub-accounts?

**Scenarios**:
- Sub-account email is optional
- Who receives notifications about sub-account activity?
- Can sub-accounts have their own email for public contact?

**Options**:
- A: All emails go to parent account
- B: Sub-account emails are optional; if provided, they receive notifications
- C: Configurable per sub-account

**Team Decision Needed**: Email routing strategy?

### 7. API Key Management for Sub-Accounts

**Question**: Can sub-accounts have API keys?

**Option A: No API Keys (Recommended for MVP)**
- Sub-accounts inherit parent's API access
- Parent can use API on behalf of sub-accounts via context
- Simpler security model

**Option B: Limited API Keys**
- Sub-accounts can have API keys
- Keys are created/managed by parent
- Separate rate limits per sub-account

**Team Decision Needed**: Allow sub-account API keys?

### 8. Data Ownership & Export

**Question**: Who owns sub-account data?

**Considerations**:
- Parent creates and manages sub-account
- Sub-account may represent external client/brand
- What happens if relationship ends?

**Options**:
- A: Parent owns all data; sub-account cannot exist independently
- B: Allow converting sub-account to independent account (requires email/password setup)
- C: Export sub-account data for migration to new parent or independence

**Team Decision Needed**: Data ownership and portability policy?

## Open Questions & Risks

### Open Questions

1. **Business Model**:
   - What's the pricing structure for additional sub-accounts?
   - Should PRO tier get any sub-accounts?
   - Is there a market for this feature?

2. **Customer Research**:
   - Have we validated demand with existing users?
   - What use cases are most common?
   - What are competitors offering?

3. **Technical Debt**:
   - Does existing user management system support this easily?
   - Are there architectural limitations?
   - How does this affect existing multi-page system?

4. **Support & Documentation**:
   - How do we explain the difference between multi-page and multi-account?
   - What training materials are needed?
   - How do we handle support tickets for sub-accounts?

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Complexity confuses users | High | Medium | Clear documentation, in-app guidance |
| Performance with many sub-accounts | Medium | Low | Pagination, caching, query optimization |
| Security vulnerabilities in context switching | High | Medium | Thorough security review, audit logging |
| Quota abuse (shared vs per-account) | Medium | Medium | Rate limiting, monitoring, enforcement |
| Migration issues with existing users | Low | Low | Careful testing, rollback plan |
| Low adoption if pricing is wrong | High | Medium | Market research, flexible pricing |

## Success Metrics

### Key Performance Indicators (KPIs)

1. **Adoption Rate**:
   - % of PREMIUM/ENTERPRISE users who create sub-accounts
   - Target: 30% within 3 months of launch

2. **Sub-Account Usage**:
   - Average number of sub-accounts per parent
   - % of parents using max sub-account limit
   - Target: Average 2-3 sub-accounts for PREMIUM

3. **Revenue Impact**:
   - Upgrades to PREMIUM/ENTERPRISE for sub-account feature
   - Additional revenue from sub-account add-ons (if implemented)
   - Target: 10% increase in PREMIUM+ conversions

4. **User Satisfaction**:
   - NPS score for sub-account feature
   - Support ticket volume related to sub-accounts
   - Target: NPS > 40, <5% of support tickets

5. **Technical Performance**:
   - API response time with multiple sub-accounts
   - Context switching success rate
   - Error rate for sub-account operations
   - Target: <500ms response time, >99% success rate

## Timeline Estimate

### Detailed Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Planning & Design** | 2 weeks | - API design finalization<br>- UX mockups<br>- Security review<br>- Team alignment |
| **Backend Development** | 3 weeks | - Database migrations<br>- API endpoints<br>- Context switching logic<br>- Security implementation<br>- Unit tests |
| **Frontend Development** | 3 weeks | - Sub-account management UI<br>- Context switcher component<br>- Access control updates<br>- SubAccountContext provider<br>- Integration |
| **Testing** | 2 weeks | - Integration testing<br>- Security testing<br>- Performance testing<br>- UAT with beta users |
| **Beta Launch** | 2 weeks | - Deploy to ENTERPRISE tier<br>- Monitor and gather feedback<br>- Bug fixes |
| **Documentation** | 1 week | - API documentation<br>- User guides<br>- Support materials |
| **General Availability** | 1 week | - Enable for PREMIUM<br>- Marketing<br>- Support training |

**Total Estimated Time**: 14 weeks (3.5 months)

### Dependencies

- Database migration tools
- Session management infrastructure
- Feature flag system for gradual rollout
- Customer communication plan

## Next Steps

### Immediate Actions (This Week)

1. **Team Review**:
   - Schedule planning meeting with development team
   - Review this document section by section
   - Make decisions on open questions
   - Identify any missing considerations

2. **API Team Discussion**:
   - Review API design with backend team
   - Decide on context management approach
   - Finalize endpoint specifications
   - Plan database migration strategy

3. **UX/UI Review**:
   - Create detailed mockups for sub-account management
   - Design context switcher component
   - Plan user flow for creating/managing sub-accounts
   - Identify all areas affected by context awareness

4. **Security Review**:
   - Audit authentication and authorization logic
   - Review context switching security
   - Plan penetration testing
   - Document security requirements

### Following Week

5. **Customer Validation**:
   - Survey PREMIUM/ENTERPRISE customers about interest
   - Identify potential beta testers
   - Validate pricing assumptions
   - Gather use case examples

6. **Technical Spike**:
   - Prototype context switching mechanism
   - Test database performance with relationships
   - Validate session management approach
   - Estimate storage and compute costs

7. **Documentation Setup**:
   - Create API specification document
   - Draft user guide outline
   - Plan support documentation
   - Prepare training materials

### Before Development Starts

8. **Final Approval**:
   - Get stakeholder sign-off on plan
   - Confirm resource allocation
   - Set clear success metrics
   - Establish rollback criteria

9. **Development Kickoff**:
   - Break down into user stories
   - Create development tasks
   - Set up feature flags
   - Initialize tracking and monitoring

## Conclusion

The agency/multi-account profiles feature represents a significant enhancement to LinkToMe, enabling new use cases for agencies, multi-brand businesses, and power users. The feature is well-suited to the existing architecture with clear separation from the existing multi-page system.

**Key Takeaways**:
- Clear distinction between multi-page (same user, different URLs) and multi-account (different users, managed by parent)
- Security-first approach with context switching and parent-only authentication
- Tier-appropriate feature gating (PREMIUM+)
- Shared quota model for MVP (can be expanded later)
- Estimated 14 weeks for full implementation
- Multiple API design decisions need team discussion and agreement

**Recommended Next Step**: Schedule a planning meeting with the full team to review this document, make decisions on open questions, and begin breaking down the work into actionable tasks.
