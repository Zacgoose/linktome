# Agency/Multi-Account Profiles - Executive Summary

## What We're Building

A feature that allows **parent accounts** (PREMIUM+ tier) to create and manage **sub-accounts** (child profiles) where:

- ✅ Sub-accounts are separate usernames with independent public profiles
- ✅ Parent manages everything (links, pages, appearance, analytics)
- ✅ Sub-accounts inherit feature access from parent's tier
- ❌ Sub-accounts CANNOT login independently
- ❌ Sub-accounts CANNOT manage their own API keys, MFA, or subscriptions

## Why This Feature?

### Target Use Cases

1. **Agencies** managing multiple client brands
2. **Multi-brand businesses** with separate identities
3. **Influencers** with multiple content personas

### Differentiation from Existing Multi-Page Feature

| Feature | Multi-Page (Current) | Multi-Account (New) |
|---------|---------------------|---------------------|
| URL | `/username/slug` | `/sub-account-username` |
| Username | Shared | Unique per sub-account |
| Authentication | One user | Only parent logs in |
| Use Case | One person, different link collections | One person managing multiple identities/clients |

## Key Business Decisions

### Tier Access
- **FREE**: 0 sub-accounts
- **PRO**: 0 sub-accounts (could be changed)
- **PREMIUM**: 3 sub-accounts
- **ENTERPRISE**: Unlimited sub-accounts

### Feature Quota Model
**RECOMMENDED: Shared Quota**
- Parent + all sub-accounts share one pool of resources
- Example: PREMIUM has 100 links total across all accounts
- Simpler to implement, encourages upgrades
- Can be made more generous later based on feedback

### Pricing Strategy (Future)
- PREMIUM: Base price includes 3 sub-accounts
- ENTERPRISE: Base price includes unlimited
- Optional: Add-on pricing for additional sub-accounts beyond included limit

## Critical Technical Decisions

### 1. Context Management ⭐ HYBRID APPROACH RECOMMENDED

**For UI**: Session-based context switching
```javascript
POST /admin/SwitchToSubAccount { subAccountId: "client-1" }
// Now all API calls operate on client-1
GET /admin/GetLinks → Returns client-1's links
```

**For API Clients**: Parameter-based
```javascript
GET /admin/GetLinks?subAccountId=client-1
// Explicit parameter, no session needed
```

**Benefits**:
- Clean UI code (single active context)
- Flexible API for automation
- Parameter overrides session if both present

### 2. Deletion Behavior ⭐ SOFT DELETE RECOMMENDED

- Mark as deleted, keep data for 30 days
- Allow restore during grace period
- Scheduled job for final cleanup after 30 days
- Protects against accidental deletion

### 3. Public Profile ⭐ HIDE RELATIONSHIP

- Sub-account profiles look like regular profiles
- No indication of parent account
- White-label friendly for agencies
- Can add optional attribution later

### 4. Email Handling ⭐ ALL TO PARENT (MVP)

- Sub-account email is for display only
- All notifications go to parent
- Simple to implement
- Can add routing options in Phase 2

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
