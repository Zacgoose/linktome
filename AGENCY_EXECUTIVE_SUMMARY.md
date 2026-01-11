# Agency/Multi-Account Profiles - Executive Summary (ULTRA-SIMPLIFIED)

## What We're Building

An **ultra-simplified, infrastructure-leveraging** feature that allows parent accounts with **agency permissions** to create and manage **sub-accounts** where:

- ✅ Sub-accounts stored in **existing Users table** (add 2 flags: `IsSubAccount`, `AuthenticationDisabled`)
- ✅ Use **existing permissions system** to block features (no special code)
- ✅ Use **existing tier system** to inherit parent's tier (automatic lookup)
- ✅ Use **existing user context** mechanism (just add flags to UserAuth type)
- ✅ Manage from **existing Users page** (add one conditional section)
- ✅ **Minimal new code** - leverage everything that exists!

## Ultra-Simplification Strategy

**Reuse existing infrastructure instead of building new**:

1. **Users table**: Add 2 boolean flags (not new columns for relationships)
2. **SubAccounts table**: Simple relationship tracking only (parent-child links)
3. **Permissions**: Use existing permission check functions
4. **Tier logic**: Update existing getUserTier() to check parent if sub-account
5. **Frontend**: Add one section to existing Users page
6. **API**: 3 new endpoints (create, get list, delete) + reuse all existing endpoints

**Result**: ~80% code reuse, minimal new development!

## Key Simplifications from Previous Iterations

Based on team feedback, this is now **even simpler**:

1. ✅ **Existing Users table**: Sub-accounts are just users with flags
2. ✅ **Existing permissions system**: Block features via permission checks  
3. ✅ **Existing tier functions**: Auto-inherit parent's tier
4. ✅ **Existing user context**: No new context mechanism needed
5. ✅ **Existing UI patterns**: Just add conditional sections
6. ✅ **No complex context switching**: Use existing user session

## Subscription Model

### How It Works

**Base Tier + Agency Permission + User Pack**

1. Parent selects **base tier** (Free, Pro, Premium, Enterprise)
   - Parent gets these features
   - Sub-accounts also get these features

2. Parent adds **agency permission** (add-on to enable feature)
   - `agency-basic`: Works with Free tier base
   - `agency-pro`: Works with Pro tier base
   - `agency-premium`: Works with Premium tier base

3. Parent purchases **user pack** (scales independently)
   - 3-user pack: $15/mo
   - 10-user pack: $40/mo
   - 25-user pack: $90/mo
   - Can purchase multiple packs

### Example Pricing

**Small Agency**: Free ($0) + Agency-Basic ($10) + 3-user pack ($15) = **$25/mo**
- Parent: Free features
- 3 sub-accounts: Free features each

**Medium Agency**: Pro ($10) + Agency-Pro ($20) + 10-user pack ($40) = **$70/mo**
- Parent: Pro features
- 10 sub-accounts: Pro features each

**Large Agency**: Premium ($30) + Agency-Premium ($30) + 2x25-user pack ($180) = **$240/mo**
- Parent: Premium features
- 50 sub-accounts: Premium features each

## Why This Feature?

### Target Use Cases

1. **Agencies** managing multiple client brands from one dashboard
2. **Multi-brand businesses** with separate brand identities
3. **Influencers** with multiple content personas

### Differentiation from Existing Multi-Page Feature

| Feature | Multi-Page (Current) | Multi-Account (New) |
|---------|---------------------|---------------------|
| URL | `/username/slug` | `/sub-account-username` |
| Username | Shared | Unique per sub-account |
| Authentication | One user | Only parent logs in, sub-accounts disabled |
| Features | Based on user's tier | Sub-accounts operate like parent's base tier |
| Management | User manages own pages | Parent manages sub-accounts from Users page |
| Use Case | One person, different link collections | Managing multiple brands/clients |

## Key Business Decisions

### Access Model
- **Any tier** can add agency permission (Free, Pro, Premium, Enterprise)
- Agency permission is **add-on** to base tier
- Sub-account **packs are purchased separately** (3, 10, 25 users)
- Parent and all sub-accounts get **parent's base tier features**

### Feature Model
**Each sub-account operates independently** with full tier features:
- Parent: Pro tier → Gets 50 links, 3 pages, API access, etc.
- Sub-account 1: Gets 50 links, 3 pages, analytics, etc. (independently)
- Sub-account 2: Gets 50 links, 3 pages, analytics, etc. (independently)

**Blocked features for sub-accounts**:
- Login (password auth)
- API authentication
- MFA management
- User management
- Subscription management

### UI Integration
- **No new pages**: Sub-accounts section integrated into existing `/admin/users` page
- Appears below existing user manager relationships
- Only shown if user has agency permission

## Critical Technical Decisions

### 1. Database ⭐ LEVERAGE EXISTING USERS TABLE

**Add only 2 flags to Users table**:
- `IsSubAccount` (boolean)
- `AuthenticationDisabled` (boolean)  (actually `AuthDisabled` in backend)

**New SubAccounts table**: Just relationship tracking (parent-child links)

**That's it!** No complex schema changes.

### 2. Permissions ⭐ USE BACKEND ROLE SYSTEM

Backend assigns sub-accounts a limited role (e.g., `sub_account_user`) that doesn't include sensitive permissions.

**Backend handles permission assignment**:
```powershell
# Backend assigns role based on account type
if ($User.IsSubAccount) {
  $Role = 'sub_account_user'  # Limited permissions
} else {
  $Role = 'user'  # Full permissions
}

# Backend returns permissions array
$Permissions = Get-DefaultRolePermissions -Role $Role
```

**Frontend just checks permissions** (no special sub-account logic):
```typescript
// Existing permission check pattern
if (user.permissions.includes('manage:auth')) {
  // Show auth settings
}

if (user.permissions.includes('manage:billing')) {
  // Show subscription settings
}
```

**Sub-accounts won't have these permissions in their array** - backend handles it!

### 3. Tier Access ⭐ BACKEND TIER LOOKUP

Backend updates `Get-UserSubscription.ps1` to return parent's tier for sub-accounts:

```powershell
# Backend function
if ($User.IsSubAccount) {
  $ParentId = Get-SubAccountOwner -SubAccountId $User.RowKey
  $Parent = Get-User $ParentId
  return Get-UserSubscription -User $Parent  # Parent's tier
}
return Get-UserSubscription -User $User  # Own tier
```

**All existing tier code works automatically!** Frontend gets correct tier from API.

### 4. Frontend ⭐ MINIMAL CHANGES

- Add sub-accounts section to `/admin/users` page
- Use existing permission checks (`permissions.includes('...')`)
- No special sub-account detection logic needed!

**Backend returns correct permissions** - frontend just checks them.

### 5. API ⭐ 3 NEW ENDPOINTS + REUSE ALL EXISTING

**New**: CreateSubAccount, GetSubAccounts, DeleteSubAccount  
**Existing**: All other endpoints work as-is (links, pages, analytics, etc.)

**Minimal API development needed!**

## Implementation Timeline

### Phase 1: MVP (8-10 weeks)
- **Week 1-2**: API design finalization, database schema
- **Week 3-4**: Backend implementation (endpoints, context switching)
- **Week 5-6**: Frontend implementation (UI, context management)
- **Week 7-8**: Testing (integration, security, UAT)
- **Week 9-10**: Beta launch (ENTERPRISE only)

### Phase 2: Enhancements (4-6 weeks)
- Configurable email routing
- Optional parent attribution toggle
- Advanced analytics aggregation
- Performance optimizations

### Phase 3: GA (2 weeks)
- Enable for PREMIUM tier
- Public announcement
- Documentation and support training

**Total Time**: 14-18 weeks (3.5-4.5 months)

## Database Changes Required

### New Tables

1. **AccountRelationships**
   - Track parent-child relationships
   - Store status, creation date, notes

2. **SubAccountProfiles** (Optional)
   - Additional sub-account metadata
   - Internal labels, notes for parent

### Updated Tables

1. **Users** - Add columns:
   - `IsSubAccount` (boolean)
   - `ParentAccountId` (string, nullable)
   - `AccountType` (string)
   - `AuthenticationDisabled` (boolean)

2. **Subscription** - Add columns:
   - `IncludedSubAccounts` (integer)
   - `UsedSubAccounts` (integer)

3. **All Data Tables** (Links, Pages, etc.)
   - No changes needed - existing userId/PartitionKey is sufficient

## API Endpoints Summary

### New Endpoints

**Sub-Account Management**:
- `POST /admin/CreateSubAccount` - Create new sub-account
- `GET /admin/GetSubAccounts` - List all sub-accounts
- `PUT /admin/UpdateSubAccount` - Update sub-account details
- `DELETE /admin/DeleteSubAccount` - Soft delete sub-account
- `POST /admin/RestoreSubAccount` - Restore within 30 days
- `POST /admin/UpdateSubAccountStatus` - Suspend/reactivate

**Context Switching**:
- `POST /admin/SwitchToSubAccount` - Set active context
- `POST /admin/SwitchToParentAccount` - Clear context
- `GET /admin/GetActiveContext` - Get current context

### Updated Endpoints

All existing admin endpoints (`/admin/*`) support:
- Session-based context (automatic)
- Optional `?subAccountId=xxx` parameter (override)
- Feature validation against parent's tier
- Shared quota enforcement

## Security Considerations

### Authentication & Authorization

1. **Sub-account CANNOT login**:
   - No password, no MFA, no API keys
   - Authentication disabled flag enforced

2. **Parent assumes sub-account identity**:
   - Via context switching only
   - Relationship validated on every request
   - Audit logging for all operations

3. **Data isolation**:
   - Parent can only access their own sub-accounts
   - No cross-parent access possible
   - Queries filtered by ownership

### Rate Limiting

- Applied at parent account level
- All sub-accounts share parent's rate limit
- Prevents abuse through sub-account creation

## User Experience

### Parent Dashboard

```
┌─────────────────────────────────────────────┐
│  [☰ Menu]  |  🔄 Managing: ClientBrand1 ▼   │ ← Context Switcher
├─────────────────────────────────────────────┤
│  Dashboard | Links | Pages | Analytics      │
│                                             │
│  You are managing ClientBrand1's account   │ ← Context Indicator
│                                             │
│  [Link management for ClientBrand1...]     │
└─────────────────────────────────────────────┘
```

### Sub-Account Management Page

```
┌─────────────────────────────────────────────┐
│  Sub-Accounts Management         [+ Create] │
│                                             │
│  3 of 3 sub-accounts used (PREMIUM tier)   │ ← Limit Indicator
│  Upgrade to ENTERPRISE for unlimited        │
├─────────────────────────────────────────────┤
│  [Search/Filter]                           │
├─────────────────────────────────────────────┤
│  📊 Client Brand 1          [Switch] [Edit] │
│  @clientbrand1 | Active                     │
│  2 pages • 15 links • Last updated 2h ago  │
├─────────────────────────────────────────────┤
│  📊 Client Brand 2          [Switch] [Edit] │
│  @clientbrand2 | Active                     │
│  1 page • 8 links • Last updated 1d ago    │
├─────────────────────────────────────────────┤
│  📊 Client Brand 3          [Switch] [Edit] │
│  @clientbrand3 | Suspended                  │
│  1 page • 5 links • Last updated 5d ago    │
└─────────────────────────────────────────────┘
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complexity confuses users | High | Clear documentation, in-app guidance, tooltips |
| Performance with many sub-accounts | Medium | Pagination, caching, query optimization |
| Security vulnerabilities | High | Security review, penetration testing, audit logs |
| Quota abuse (shared model) | Medium | Rate limiting, monitoring, alerts |
| Low adoption | High | Market research, beta testing, flexible pricing |
| Session management issues | Medium | Robust session infrastructure, timeout handling |

## Success Metrics

### Adoption (First 3 Months)
- **Target**: 30% of PREMIUM/ENTERPRISE users create at least 1 sub-account
- **Target**: Average 2-3 sub-accounts per active parent

### Revenue Impact (First 6 Months)
- **Target**: 10% increase in PREMIUM/ENTERPRISE conversions
- **Target**: 15% reduction in churn (agencies stay longer)

### Technical Performance
- **Target**: <500ms API response time with sub-accounts
- **Target**: >99% context switching success rate
- **Target**: <5% of support tickets related to sub-accounts

### User Satisfaction
- **Target**: NPS > 40 for feature
- **Target**: <5 critical bugs in first month

## Open Questions for Team

### Business Questions
1. Should PRO tier get any sub-accounts? (Currently 0)
2. What's the pricing for additional sub-accounts beyond included?
3. Do we need market validation before building?
4. What's the competitor landscape?

### Technical Questions
1. What session management infrastructure exists?
2. What's our database scaling strategy with relationships?
3. Do we need distributed session management?
4. What monitoring/alerting do we need?

### Product Questions
1. Do agencies want parent attribution visible?
2. Should sub-accounts receive any direct emails?
3. What analytics aggregation features are needed?
4. Should we allow converting sub-account to independent account?

## Next Steps

### This Week
1. **Team Review Meeting** (2 hours)
   - Review this summary and full planning docs
   - Make decisions on critical questions
   - Align on recommended approach

2. **API Team Discussion** (1 hour)
   - Review API design decisions document
   - Finalize endpoint specifications
   - Agree on context management approach

3. **UX/UI Planning** (1 hour)
   - Create detailed mockups
   - Plan user flows
   - Identify affected components

### Next Week
4. **Security Review** (2 hours)
   - Threat modeling session
   - Authentication/authorization review
   - Plan penetration testing

5. **Customer Validation** (Ongoing)
   - Survey PREMIUM/ENTERPRISE users
   - Identify beta testers
   - Validate use cases

6. **Technical Spike** (3-5 days)
   - Prototype context switching
   - Test session management
   - Validate database performance

### Before Development
7. **Documentation**
   - Finalize API specifications
   - Create user guide outline
   - Prepare support materials

8. **Development Setup**
   - Break down into user stories
   - Set up feature flags
   - Initialize tracking

## Recommendation

**Proceed with MVP implementation using recommended decisions**:
- Hybrid context management (session + parameter)
- Shared quota model
- Soft delete with 30-day recovery
- Hidden parent relationship
- All emails to parent

**Target ENTERPRISE tier first for beta**, then expand to PREMIUM after validating approach and gathering feedback.

**Estimated effort**: 14-18 weeks total, with beta at week 10.

## Documentation Reference

This summary is based on:
1. `AGENCY_MULTI_ACCOUNT_PLANNING.md` - Comprehensive planning document
2. `AGENCY_API_DISCUSSION.md` - Detailed API decisions for team
3. Existing codebase analysis and tier system review

---

**Prepared by**: GitHub Copilot Agent
**Date**: 2024-01-11  
**Status**: Draft - Awaiting Team Review
