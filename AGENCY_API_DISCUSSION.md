# Agency/Multi-Account Profiles - API Team Discussion Document

## Purpose

This document focuses specifically on the API design decisions that require team discussion and agreement before implementation begins. These decisions will significantly impact the architecture, user experience, and future scalability of the agency/multi-account feature.

## Critical API Design Decisions

### Decision 1: Context Management Strategy

**The Problem**: How should parents switch between managing their own account and their sub-accounts?

#### Option A: Session-Based Context Switching ⭐ RECOMMENDED

**How it works**:
```
1. Parent logs in normally → Gets auth token
2. Parent calls: POST /admin/SwitchToSubAccount { subAccountId: "sub-1" }
3. Server sets session state: activeContext = "sub-1"
4. All subsequent API calls operate on sub-account data
5. Parent calls: POST /admin/SwitchToParentAccount
6. Server clears session state, returns to parent context
```

**API Calls**:
```javascript
// Parent switches to sub-account
POST /admin/SwitchToSubAccount
Request: { subAccountId: "client-brand-1-id" }
Response: { 
  activeContext: {
    userId: "client-brand-1-id",
    username: "clientbrand1", 
    isSubAccountContext: true,
    parentUserId: "parent-id"
  }
}

// Now all normal API calls operate on sub-account
GET /admin/GetLinks
→ Returns sub-account's links

// Parent switches back
POST /admin/SwitchToParentAccount
Response: {
  activeContext: {
    userId: "parent-id",
    username: "parentuser",
    isSubAccountContext: false
  }
}

// Now all API calls operate on parent
GET /admin/GetLinks
→ Returns parent's links
```

**Pros**:
- ✅ Clean API - no extra parameters on every request
- ✅ Clear single context - less error-prone for UI
- ✅ Frontend state management is simpler
- ✅ Better UX - explicit context switching
- ✅ Matches how users think about "working on" a sub-account

**Cons**:
- ❌ Requires session management on server
- ❌ Session state needs to persist across requests
- ❌ Need to handle session expiry/cleanup
- ❌ Stateful - harder to debug

**Implementation Considerations**:
```powershell
# PowerShell backend with Azure Table Storage
$sessionTable = Get-AzTableTable -Name "UserSessions"

function Switch-ToSubAccount($token, $subAccountId) {
    # Validate parent owns sub-account
    $parentUserId = Get-UserIdFromToken $token
    Validate-SubAccountOwnership $parentUserId $subAccountId
    
    # Store context in session table
    $session = @{
        PartitionKey = $parentUserId
        RowKey = $token.Substring(0, 20)  # Token hash
        ActiveContext = $subAccountId
        IsSubAccountContext = $true
        UpdatedAt = (Get-Date).ToUniversalTime()
    }
    
    Add-AzTableRow -Table $sessionTable -Entity $session -UpdateExisting
    
    return @{ activeContext = @{...} }
}

function Get-ActiveContext($token) {
    $parentUserId = Get-UserIdFromToken $token
    $tokenHash = $token.Substring(0, 20)
    
    $session = Get-AzTableRow -Table $sessionTable `
        -PartitionKey $parentUserId `
        -RowKey $tokenHash
    
    if ($session -and $session.IsSubAccountContext) {
        return @{
            userId = $session.ActiveContext
            parentUserId = $parentUserId
            isSubAccountContext = $true
        }
    }
    
    return @{
        userId = $parentUserId
        isSubAccountContext = $false
    }
}
```

---

#### Option B: Parameter-Based Context

**How it works**:
```
1. Parent logs in normally → Gets auth token
2. All API calls include optional ?subAccountId parameter
3. Server validates parent owns sub-account on each request
4. No session state needed
```

**API Calls**:
```javascript
// Parent manages sub-account
GET /admin/GetLinks?subAccountId=client-brand-1-id
→ Returns sub-account's links

// Parent manages their own account
GET /admin/GetLinks
→ Returns parent's links

// Every single request needs the parameter
PUT /admin/UpdateLinks?subAccountId=client-brand-1-id
POST /admin/CreatePage?subAccountId=client-brand-1-id
GET /admin/GetAnalytics?subAccountId=client-brand-1-id
```

**Pros**:
- ✅ Stateless - easier to scale
- ✅ Explicit on every request - clear intent
- ✅ No session management complexity
- ✅ Better for API clients/automation
- ✅ Easier to debug (all info in request)

**Cons**:
- ❌ Parameter needed on EVERY request
- ❌ Easy to forget parameter → wrong account modified
- ❌ More verbose API calls
- ❌ UI code is more complex (must track and pass subAccountId everywhere)
- ❌ Risk of bugs (forgetting parameter)

**Implementation Considerations**:
```powershell
function Get-UserLinks($token, $subAccountId) {
    $parentUserId = Get-UserIdFromToken $token
    
    if ($subAccountId) {
        # Validate parent owns sub-account on EVERY request
        Validate-SubAccountOwnership $parentUserId $subAccountId
        $targetUserId = $subAccountId
    } else {
        $targetUserId = $parentUserId
    }
    
    $links = Get-AzTableRow -Table $linksTable -PartitionKey $targetUserId
    return $links
}
```

---

#### Option C: Hybrid Approach ⭐⭐ MOST RECOMMENDED

**How it works**:
```
1. Support both session-based AND parameter-based
2. Parameter overrides session if both present
3. UI uses session-based (simpler)
4. API clients can use parameter-based (flexible)
```

**API Behavior**:
```javascript
// Scenario 1: UI using session context
POST /admin/SwitchToSubAccount { subAccountId: "sub-1" }
GET /admin/GetLinks
→ Returns sub-1's links (from session)

// Scenario 2: API client using parameter
GET /admin/GetLinks?subAccountId=sub-2
→ Returns sub-2's links (parameter overrides session)

// Scenario 3: Parameter with active session
POST /admin/SwitchToSubAccount { subAccountId: "sub-1" }
GET /admin/GetLinks?subAccountId=sub-2
→ Returns sub-2's links (parameter takes precedence)
```

**Pros**:
- ✅ Best of both worlds
- ✅ UI gets clean session-based API
- ✅ API clients get flexible parameter-based API
- ✅ Explicit parameter overrides session (clear priority)
- ✅ Future-proof for different use cases

**Cons**:
- ❌ More complex implementation
- ❌ Two code paths to maintain
- ❌ Need clear documentation on precedence

**Implementation**:
```powershell
function Get-EffectiveContext($token, $subAccountIdParam) {
    $parentUserId = Get-UserIdFromToken $token
    
    # Parameter takes precedence
    if ($subAccountIdParam) {
        Validate-SubAccountOwnership $parentUserId $subAccountIdParam
        return @{
            activeUserId = $subAccountIdParam
            parentUserId = $parentUserId
            isSubAccountContext = $true
            source = "parameter"
        }
    }
    
    # Check session context
    $session = Get-SessionContext $token
    if ($session.IsSubAccountContext) {
        Validate-SubAccountOwnership $parentUserId $session.ActiveContext
        return @{
            activeUserId = $session.ActiveContext
            parentUserId = $parentUserId
            isSubAccountContext = $true
            source = "session"
        }
    }
    
    # Default to parent context
    return @{
        activeUserId = $parentUserId
        isSubAccountContext = $false
        source = "default"
    }
}
```

---

**TEAM DECISION REQUIRED**:
- [ ] Option A: Session-Based Only
- [ ] Option B: Parameter-Based Only  
- [ ] Option C: Hybrid Approach (Recommended)

**Questions to Consider**:
1. Do we have existing session management infrastructure?
2. Are there existing API clients that would benefit from parameters?
3. What's our scaling strategy (stateless vs stateful)?
4. How do other similar features in our app work?

---

### Decision 2: Feature Quota Model

**The Problem**: With a parent + multiple sub-accounts all using features, how do we count against tier limits?

#### Example Scenario:
- Parent: PREMIUM tier (100 links max, 10 pages max, 20 short links max)
- Sub-account 1: Created by parent
- Sub-account 2: Created by parent
- Sub-account 3: Created by parent

**Question**: How many links can be created in total?

---

#### Option A: Shared Quota ⭐ RECOMMENDED FOR MVP

**Model**: Parent + all sub-accounts share ONE pool of resources

**Example**:
```
PREMIUM Tier Limits:
- 100 links total (shared)
- 10 pages total (shared)
- 20 short links total (shared)

Usage:
- Parent: 30 links, 2 pages, 5 short links
- Sub-account 1: 25 links, 3 pages, 8 short links
- Sub-account 2: 20 links, 2 pages, 4 short links
- Sub-account 3: 15 links, 1 page, 2 short links
-----------------------------------------------------
Total: 90/100 links ✅ | 8/10 pages ✅ | 19/20 short links ✅
```

**API Implementation**:
```powershell
function Validate-LinkLimit($activeContext) {
    $parentUserId = $activeContext.parentUserId ?? $activeContext.userId
    
    # Count across parent + all sub-accounts
    $allUserIds = @($parentUserId)
    $subAccounts = Get-SubAccounts $parentUserId
    $allUserIds += $subAccounts.id
    
    $totalLinks = 0
    foreach ($userId in $allUserIds) {
        $links = Get-AzTableRow -Table $linksTable -PartitionKey $userId
        $totalLinks += $links.Count
    }
    
    $parentTier = (Get-User $parentUserId).tier
    $limits = Get-TierLimits $parentTier
    
    if ($totalLinks -ge $limits.maxLinks -and $limits.maxLinks -ne -1) {
        throw "Link limit reached. You have used $totalLinks of $($limits.maxLinks) links across all accounts."
    }
}
```

**Pros**:
- ✅ Simple to understand: "You get 100 links total"
- ✅ Encourages upgrading to higher tiers
- ✅ Prevents abuse (can't get unlimited by creating sub-accounts)
- ✅ Easier to implement
- ✅ Clear business model

**Cons**:
- ❌ Less generous to customers
- ❌ May feel limiting if parent has many sub-accounts
- ❌ Need to query all accounts to check limits (performance)

---

#### Option B: Per-Account Quota

**Model**: Each account (parent + each sub-account) gets the FULL tier limits independently

**Example**:
```
PREMIUM Tier Limits:
- 100 links per account
- 10 pages per account  
- 20 short links per account

Usage:
- Parent: 80/100 links, 5/10 pages, 15/20 short links
- Sub-account 1: 50/100 links, 3/10 pages, 10/20 short links
- Sub-account 2: 70/100 links, 4/10 pages, 12/20 short links
- Sub-account 3: 30/100 links, 2/10 pages, 5/20 short links
-----------------------------------------------------
Total: 230/400 possible links ✅ | Each account independent
```

**API Implementation**:
```powershell
function Validate-LinkLimit($activeContext) {
    $targetUserId = $activeContext.activeUserId
    
    # Count only for the active account
    $links = Get-AzTableRow -Table $linksTable -PartitionKey $targetUserId
    
    # Use parent's tier for limits
    $parentUserId = $activeContext.parentUserId ?? $activeContext.userId
    $parentTier = (Get-User $parentUserId).tier
    $limits = Get-TierLimits $parentTier
    
    if ($links.Count -ge $limits.maxLinks -and $limits.maxLinks -ne -1) {
        throw "Link limit reached for this account. You have used $($links.Count) of $($limits.maxLinks) links."
    }
}
```

**Pros**:
- ✅ More generous to customers
- ✅ Each sub-account feels like a full account
- ✅ Better for agencies with many clients
- ✅ Simpler validation (only check one account at a time)
- ✅ Better performance (no need to query all accounts)

**Cons**:
- ❌ Could enable abuse (create many sub-accounts to multiply limits)
- ❌ Less incentive to upgrade tiers
- ❌ Business model unclear (are we charging enough?)
- ❌ Example: PREMIUM with 3 sub-accounts = effectively 400 links (4x the tier limit)

---

#### Option C: Mixed Quota

**Model**: Some resources are shared, others are per-account

**Example**:
```
PREMIUM Tier Limits:
- Links: 100 per account (independent)
- Pages: 40 total (shared across all)
- Short links: 20 per account (independent)
- API calls: 50,000/day total (shared)
- Storage: 10GB total (shared)
```

**Rationale**:
- User-generated content (links, pages) → Per-account (generous)
- Infrastructure resources (API calls, storage) → Shared (cost-controlled)

**Pros**:
- ✅ Balance between generosity and cost control
- ✅ Flexible for different resource types
- ✅ Can optimize based on actual costs

**Cons**:
- ❌ Complex to explain to users
- ❌ Confusing ("Why is X shared but Y isn't?")
- ❌ Hard to communicate in UI
- ❌ More complex to implement and maintain

---

**TEAM DECISION REQUIRED**:
- [ ] Option A: Shared Quota (Simple, encourages upgrades)
- [ ] Option B: Per-Account Quota (Generous, potential abuse)
- [ ] Option C: Mixed Quota (Complex, flexible)

**Questions to Consider**:
1. What's our business goal - maximize revenue or maximize usage?
2. What are competitors doing?
3. What are the actual cost implications of each model?
4. Can we start with one and migrate to another later?

**Recommendation**: Start with **Option A (Shared Quota)** for MVP. Gather usage data and customer feedback. Can always make it more generous later, but hard to restrict after being generous.

---

### Decision 3: Sub-Account Deletion Behavior

**The Problem**: When a parent deletes a sub-account, what happens to the data?

#### Option A: Hard Delete ⚠️ RISKY

**Behavior**: Permanently delete all sub-account data immediately

```powershell
function Delete-SubAccount($parentUserId, $subAccountId) {
    Validate-SubAccountOwnership $parentUserId $subAccountId
    
    # Delete everything
    Remove-AzTableRow -Table $usersTable -PartitionKey $subAccountId
    Remove-AzTableRow -Table $linksTable -PartitionKey $subAccountId
    Remove-AzTableRow -Table $pagesTable -PartitionKey $subAccountId
    Remove-AzTableRow -Table $appearanceTable -PartitionKey $subAccountId
    Remove-AzTableRow -Table $analyticsTable -Filter "UserId eq '$subAccountId'"
    Remove-AzTableRow -Table $shortLinksTable -PartitionKey $subAccountId
    
    # Remove relationship
    Remove-AzTableRow -Table $relationshipsTable `
        -PartitionKey $parentUserId `
        -RowKey $subAccountId
}
```

**Pros**:
- ✅ Clean - no orphaned data
- ✅ Saves storage costs
- ✅ Simple implementation

**Cons**:
- ❌ No recovery possible
- ❌ Accidental deletion is catastrophic
- ❌ No historical analytics
- ❌ Could violate data retention policies

---

#### Option B: Soft Delete ⭐ RECOMMENDED

**Behavior**: Mark as deleted but retain data for recovery period

```powershell
function Delete-SubAccount($parentUserId, $subAccountId) {
    Validate-SubAccountOwnership $parentUserId $subAccountId
    
    $subAccount = Get-User $subAccountId
    $subAccount.Status = "deleted"
    $subAccount.DeletedAt = (Get-Date).ToUniversalTime()
    $subAccount.DeletedBy = $parentUserId
    Update-AzTableRow -Table $usersTable -Entity $subAccount
    
    # Update relationship
    $relationship = Get-AccountRelationship $parentUserId $subAccountId
    $relationship.Status = "deleted"
    Update-AzTableRow -Table $relationshipsTable -Entity $relationship
    
    # Public profile returns 404
    # Data remains in database for 30 days
    # After 30 days: scheduled job does hard delete
}

function Restore-SubAccount($parentUserId, $subAccountId) {
    # Allow restore within 30 days
    $subAccount = Get-User $subAccountId
    if ($subAccount.Status -eq "deleted") {
        $deletedDays = ((Get-Date) - $subAccount.DeletedAt).Days
        if ($deletedDays -le 30) {
            $subAccount.Status = "active"
            $subAccount.DeletedAt = $null
            Update-AzTableRow -Table $usersTable -Entity $subAccount
            return "Restored successfully"
        }
    }
    throw "Cannot restore - deleted more than 30 days ago"
}
```

**Pros**:
- ✅ Recovery possible within grace period
- ✅ Protects against accidental deletion
- ✅ Preserves analytics history
- ✅ Better customer experience
- ✅ Common industry practice

**Cons**:
- ❌ More storage used
- ❌ Need scheduled cleanup job
- ❌ More complex implementation

---

#### Option C: Archive

**Behavior**: Move to archive storage, keep indefinitely, charge for storage

```powershell
function Delete-SubAccount($parentUserId, $subAccountId) {
    Validate-SubAccountOwnership $parentUserId $subAccountId
    
    # Export all data to archive
    $archiveData = @{
        user = Get-User $subAccountId
        links = Get-AzTableRow -Table $linksTable -PartitionKey $subAccountId
        pages = Get-AzTableRow -Table $pagesTable -PartitionKey $subAccountId
        appearance = Get-Appearance $subAccountId
        analytics = Get-AnalyticsData $subAccountId
    }
    
    $archiveBlob = $archiveData | ConvertTo-Json -Depth 10
    
    # Store in blob storage (cheaper)
    Set-AzStorageBlobContent `
        -Container "archived-subaccounts" `
        -Blob "$parentUserId/$subAccountId-$(Get-Date -Format 'yyyyMMdd').json" `
        -BlobContent $archiveBlob
    
    # Hard delete from main tables
    # ... delete operations ...
}
```

**Pros**:
- ✅ Complete data retention
- ✅ Can restore anytime (with effort)
- ✅ Cheap storage in blob/archive tier
- ✅ Good for compliance

**Cons**:
- ❌ Complex to restore
- ❌ Additional storage costs
- ❌ May not be necessary

---

**TEAM DECISION REQUIRED**:
- [ ] Option A: Hard Delete (Risky, clean)
- [ ] Option B: Soft Delete with 30-day grace period (Recommended)
- [ ] Option C: Archive indefinitely (Overkill?)

**Questions to Consider**:
1. What are our data retention requirements?
2. How often do users accidentally delete things?
3. What's the storage cost impact?
4. Do we need audit trail for compliance?

---

### Decision 4: Public Profile Visibility

**The Problem**: Should sub-account public profiles indicate they're managed by a parent?

#### Option A: Hidden Relationship ⭐ RECOMMENDED FOR MVP

**Behavior**: Sub-account profiles look identical to regular user profiles

```
Public URL: linktome.app/clientbrand1

┌─────────────────────────────────┐
│         Client Brand 1          │
│    "Your trusted partner..."    │
│                                 │
│  [Link 1]  [Link 2]  [Link 3]  │
└─────────────────────────────────┘

No mention of parent account anywhere.
```

**Pros**:
- ✅ White-label friendly (agency use case)
- ✅ Clients can't see who manages them
- ✅ Professional appearance
- ✅ Simple implementation

**Cons**:
- ❌ Less transparent
- ❌ Could be confusing if support needed
- ❌ Parent cannot get credit/attribution

---

#### Option B: Show Parent Attribution

**Behavior**: Display "Managed by @parentuser" on sub-account profile

```
Public URL: linktome.app/clientbrand1

┌─────────────────────────────────┐
│         Client Brand 1          │
│    "Your trusted partner..."    │
│  Managed by @creativestudio     │
│                                 │
│  [Link 1]  [Link 2]  [Link 3]  │
└─────────────────────────────────┘
```

**Pros**:
- ✅ Transparent
- ✅ Parent gets attribution
- ✅ Clear for support issues
- ✅ Marketing opportunity for parent

**Cons**:
- ❌ Breaks white-label use case
- ❌ Clients may not want this visible
- ❌ Could confuse end-users

---

#### Option C: Optional Attribution

**Behavior**: Parent chooses whether to show attribution per sub-account

```javascript
// API to update sub-account settings
PUT /admin/UpdateSubAccount
{
  "subAccountId": "client-1",
  "showParentAttribution": true,  // Optional
  "customAttributionText": "Created by Creative Studio"  // Optional custom text
}
```

**Pros**:
- ✅ Flexible - serves both use cases
- ✅ Parent controls branding
- ✅ Custom messaging possible
- ✅ Can change over time

**Cons**:
- ❌ More complex implementation
- ❌ More settings to manage
- ❌ UI needs configuration

---

**TEAM DECISION REQUIRED**:
- [ ] Option A: Hidden (White-label, simple)
- [ ] Option B: Always Show (Transparent, attribution)
- [ ] Option C: Optional (Flexible, complex)

**Questions to Consider**:
1. What do our target customers (agencies) prefer?
2. Do we want to promote parent users?
3. Are there legal/transparency requirements?
4. What do competitors do?

---

### Decision 5: Email & Notification Handling

**The Problem**: Sub-accounts may have email addresses, but can't login. Who receives notifications?

#### Scenarios to Consider:

1. **Password reset for sub-account**: Should not be possible (sub-account can't login)
2. **Analytics reports**: Where do they go?
3. **Public contact forms**: If someone contacts sub-account, who gets the email?
4. **System notifications**: (e.g., "Your link was clicked 100 times")
5. **Security alerts**: (e.g., suspicious activity)

---

#### Option A: All Emails to Parent ⭐ SIMPLE

**Model**: Sub-account email is for display only, all notifications go to parent

```json
{
  "subAccountEmail": "client@example.com",  // Public display only
  "emailBehavior": "all-to-parent",
  "parentReceivesNotifications": true
}
```

**Email Routing**:
- Analytics reports → Parent email
- Public contact → Parent email (with "via @clientbrand1" prefix)
- System notifications → Parent email
- Security alerts → Parent email

**Pros**:
- ✅ Simple - one place for all emails
- ✅ Parent stays informed
- ✅ No email configuration needed
- ✅ Works even if sub-account email invalid

**Cons**:
- ❌ Parent may get overwhelmed with emails
- ❌ Cannot delegate email management
- ❌ Client can't receive their own notifications

---

#### Option B: Configurable Per Sub-Account

**Model**: Parent chooses email destination for each sub-account

```json
{
  "subAccountId": "client-1",
  "subAccountEmail": "client@example.com",
  "emailSettings": {
    "analyticsReports": "sub-account",  // or "parent" or "both"
    "publicContact": "sub-account",
    "systemNotifications": "parent",
    "securityAlerts": "parent"
  }
}
```

**Pros**:
- ✅ Flexible - different needs for different sub-accounts
- ✅ Clients can receive their own notifications
- ✅ Parent can choose what to monitor
- ✅ Scales better with many sub-accounts

**Cons**:
- ❌ Complex configuration
- ❌ Confusing UI
- ❌ Email validation required
- ❌ More maintenance

---

#### Option C: Copy to Both

**Model**: Send all emails to both parent and sub-account

**Pros**:
- ✅ Everyone stays informed
- ✅ Simple configuration

**Cons**:
- ❌ Duplicate emails
- ❌ May violate privacy (client doesn't know parent gets copy)
- ❌ Higher email sending costs

---

**TEAM DECISION REQUIRED**:
- [ ] Option A: All to Parent (Simple, MVP)
- [ ] Option B: Configurable (Flexible, complex)
- [ ] Option C: Copy to Both (Redundant)

**Questions to Consider**:
1. What email volume do we expect?
2. Are there privacy concerns?
3. Do clients need to receive emails directly?
4. Can we start simple and add configuration later?

**Recommendation**: Start with **Option A** for MVP, add **Option B** in Phase 2 based on feedback.

---

## Implementation Recommendations

### Phase 1 (MVP) - Recommended Decisions:

1. **Context Management**: Option C (Hybrid) - Session-based for UI, parameter-based for API
2. **Feature Quota**: Option A (Shared) - Simple, clear, encourages upgrades
3. **Deletion**: Option B (Soft Delete) - 30-day recovery period
4. **Public Visibility**: Option A (Hidden) - White-label friendly
5. **Email Handling**: Option A (All to Parent) - Simple, can expand later

### Phase 2 (Enhancements) - Future Considerations:

- Add configurable email routing
- Add optional parent attribution toggle
- Consider per-account quotas based on data
- Add archive storage for deleted sub-accounts
- Add restore UI for soft-deleted accounts

---

## API Endpoint Summary

Based on recommended decisions, here are the key endpoints:

### Sub-Account Management

```
POST /admin/CreateSubAccount
GET /admin/GetSubAccounts
PUT /admin/UpdateSubAccount
DELETE /admin/DeleteSubAccount (soft delete)
POST /admin/RestoreSubAccount (within 30 days)
POST /admin/UpdateSubAccountStatus (suspend/reactivate)
```

### Context Switching

```
POST /admin/SwitchToSubAccount
POST /admin/SwitchToParentAccount
GET /admin/GetActiveContext
```

### Updated Existing Endpoints

All existing admin endpoints support:
- Session-based context (automatic)
- Optional `?subAccountId=xxx` parameter (override)
- Feature validation against parent's tier
- Shared quota enforcement

---

## Testing Requirements

### Security Testing

- [ ] Verify parent cannot access other parents' sub-accounts
- [ ] Verify sub-account relationships are validated on every request
- [ ] Verify session context is properly isolated
- [ ] Verify parameter injection attacks are prevented
- [ ] Verify tokens cannot be forged for sub-accounts

### Quota Testing

- [ ] Verify shared quota counts across parent + all sub-accounts
- [ ] Verify quota checks happen before operations
- [ ] Verify error messages clearly indicate quota exceeded
- [ ] Verify quota updates in real-time
- [ ] Test with PREMIUM (3 sub-accounts) and ENTERPRISE (unlimited)

### Context Switching Testing

- [ ] Verify switching to sub-account works
- [ ] Verify switching back to parent works
- [ ] Verify operations in sub-account context target correct account
- [ ] Verify parameter override works
- [ ] Verify session expiry is handled

### Deletion Testing

- [ ] Verify soft delete marks account correctly
- [ ] Verify public profile returns 404 for deleted accounts
- [ ] Verify restore works within 30 days
- [ ] Verify restore fails after 30 days
- [ ] Verify hard delete cleans up properly (scheduled job)

---

## Open Questions for Team Discussion

1. **Session Management**:
   - Where do we store session state? (Azure Table? Redis? In-memory?)
   - How long should sessions persist?
   - Do we need distributed session management for scaling?

2. **Performance**:
   - How many sub-accounts do we expect per parent? (affects quota calculation)
   - Do we need caching for relationship validation?
   - Should we paginate sub-account lists?

3. **Monitoring**:
   - What metrics should we track?
   - How do we detect abuse (e.g., creating/deleting many sub-accounts)?
   - What alerts do we need?

4. **Support**:
   - How do support staff access sub-account issues?
   - Can we switch context on behalf of users for support?
   - What audit logging is needed?

5. **Billing** (Future):
   - If we charge per additional sub-account, how is that tracked?
   - What happens on payment failure - suspend sub-accounts?
   - How do we handle refunds if sub-accounts are deleted?

---

## Next Steps

1. **Team Review Meeting**:
   - Schedule 2-hour session
   - Review each decision point
   - Vote on recommended options
   - Document final decisions

2. **Prototype**:
   - Build proof-of-concept for context switching
   - Test session management approach
   - Validate quota calculation performance
   - Identify any blockers

3. **Update Planning Document**:
   - Document final decisions
   - Update API specifications
   - Create detailed implementation tasks
   - Estimate timeline more accurately

4. **Security Review**:
   - Share with security team
   - Conduct threat modeling
   - Plan penetration testing
   - Document security requirements

---

## Appendix: Alternative Architectures Considered

### Alternative 1: Separate Sub-Account Users Table

**Idea**: Store sub-accounts in a different table from regular users

**Rejected Because**:
- Increases complexity
- Duplicate schema maintenance
- Harder to query across both types
- Public URLs would need different lookup logic

### Alternative 2: Parent Account Impersonation Tokens

**Idea**: Generate temporary tokens for sub-accounts that parent can use

**Rejected Because**:
- Complex token management
- Security risk (leaked tokens)
- Doesn't solve session state problem
- Over-engineered for the use case

### Alternative 3: Pure API Parameter Approach (No Context Switching)

**Idea**: No session state at all, just parameters

**Rejected Because**:
- Too error-prone for UI
- Every component needs to track subAccountId
- Easy to make mistakes
- Poor UX (forgetting to pass parameter)

---

## Document Version

- **Version**: 1.0
- **Date**: 2024-01-11
- **Status**: Draft for Team Discussion
- **Next Review**: After team decision meeting
