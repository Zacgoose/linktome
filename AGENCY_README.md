# Agency/Multi-Account Profiles - Documentation Index (ULTRA-SIMPLIFIED)

## Overview

This folder contains comprehensive planning documentation for the **Agency/Multi-Account Profiles** feature in LinkToMe - **ultra-simplified to leverage existing infrastructure**. This feature will allow parent accounts with **agency permissions** to create and manage sub-accounts using mostly existing code.

## Ultra-Simplification Approach

**Maximize code reuse, minimize new development**:

1. **Existing Users table**: Sub-accounts are Users with 2 flags (`IsSubAccount`, `AuthenticationDisabled`)
2. **Existing permissions system**: Block features via existing permission checks
3. **Existing tier functions**: Update getUserTier() to return parent's tier for sub-accounts
4. **Existing user context**: Use AuthContext as-is, just add 2 fields
5. **Existing Users page**: Add one conditional section
6. **Simple SubAccounts table**: Just parent-child relationship tracking

**Development estimate**: 2-3 weeks (vs 8-12 weeks original plan) due to massive code reuse!

## Document Purpose

These documents are designed to facilitate planning and discussion with the API team and development team **before any code implementation**. No code changes are included in this PR - only planning, exploration, and design documentation.

## Documents in This Planning Package

### 1. [AGENCY_EXECUTIVE_SUMMARY.md](./AGENCY_EXECUTIVE_SUMMARY.md)
**👥 Audience**: All stakeholders, executives, product managers

**Purpose**: High-level overview and key decisions

**Contents**:
- Feature overview and business justification
- Key technical decisions with recommendations
- Implementation timeline (14-18 weeks)
- Success metrics and KPIs
- Risks and mitigations
- Next steps

**Read this first** if you want a quick understanding of what we're building and why.

---

### 2. [AGENCY_MULTI_ACCOUNT_PLANNING.md](./AGENCY_MULTI_ACCOUNT_PLANNING.md)
**👥 Audience**: Development team, architects, product managers

**Purpose**: Comprehensive technical planning document

**Contents**:
- Detailed business use cases
- Complete data model changes (tables, schemas, migrations)
- All API endpoints (new and updated)
- Frontend component specifications
- Security considerations and audit logging
- Subscription and billing implications
- Migration strategy and rollout plan
- Open questions and risks
- Detailed timeline with phases

**Read this** for complete technical specifications and implementation details.

**Length**: ~1,255 lines covering every aspect of the feature

---

### 3. [AGENCY_API_DISCUSSION.md](./AGENCY_API_DISCUSSION.md)
**👥 Audience**: API team, backend developers, architects

**Purpose**: Facilitate API design discussions and decisions

**Contents**:
- **5 Critical API Design Decisions** that need team agreement:
  1. Context Management Strategy (session vs parameter)
  2. Feature Quota Model (shared vs per-account)
  3. Sub-Account Deletion Behavior (hard vs soft delete)
  4. Public Profile Visibility (show parent or hide)
  5. Email & Notification Handling (routing options)

- Each decision includes:
  - Problem statement
  - Multiple options with pros/cons
  - Implementation code examples (PowerShell)
  - Recommendation
  - Questions to consider

**Read this** before the API design meeting to prepare for decisions.

**Length**: ~988 lines with detailed option analysis

---

## Key Concepts

### What is a Sub-Account?

A **sub-account** (also called child account or managed profile) is:
- ✅ A regular account with full tier features (based on parent's base tier)
- ✅ A separate username with its own public profile (e.g., `/clientbrand1`)
- ✅ Managed by parent from existing Users page
- ✅ Operates independently with own links, pages, appearance, analytics
- ❌ **CANNOT** login (password or API authentication disabled)
- ❌ **CANNOT** manage API keys, MFA, users, or subscriptions

### How is This Different from Multi-Page?

The app already has a **multi-page system** where users can create multiple pages:

| Feature | Multi-Page (Existing) | Multi-Account (New) |
|---------|----------------------|---------------------|
| User | Same user account | Parent + multiple sub-accounts |
| URL | `/username/main`, `/username/music` | `/parent`, `/client1`, `/client2` |
| Username | Shared across pages | Each sub-account has unique username |
| Login | User logs in | Only parent logs in, sub-accounts disabled |
| Management | User manages own pages | Parent manages from existing Users page |
| Features | Based on user's tier | Each sub-account gets parent's base tier features |
| Quotas | Shared limits | Independent limits per account |
| Use Case | One person, different link collections | Managing multiple brands/clients |

**Example**:
- Multi-Page: `@creativestudio/main`, `@creativestudio/portfolio`
- Multi-Account: `@creativestudio` (parent), `@clientbrand1`, `@clientbrand2`

### Target Use Cases

1. **Digital Agencies**: Manage multiple client brands from one dashboard
2. **Multi-Brand Businesses**: Separate identities for different product lines
3. **Influencers**: Different personas for different content types

### Subscription Model

**Base Tier + Agency Permission + User Pack**

Example pricing:
- **Small**: Free ($0) + Agency-Basic ($10) + 3-user pack ($15) = $25/mo
- **Medium**: Pro ($10) + Agency-Pro ($20) + 10-user pack ($40) = $70/mo
- **Large**: Premium ($30) + Agency-Premium ($30) + 2x25-user pack ($180) = $240/mo

## Recommended Technical Decisions

Based on the simplified approach, here are the **recommended MVP decisions**:

### 1. Context Management: **URL Parameter** ⭐
- Simple `?subAccountId=xxx` parameter on all admin endpoints
- No session management needed
- Stateless and explicit

### 2. Feature Access: **Independent Per-Account** ⭐
- Each sub-account gets full tier limits independently
- Not a shared pool - simpler and more generous
- Example: Pro tier parent + 3 sub-accounts = 4 accounts each with 50 links

### 3. UI Integration: **Existing Users Page** ⭐
- Add sub-accounts section to `/admin/users` page
- No new routes or pages
- Conditional display based on agency permission

### 4. Deletion: **Soft Delete with 30-day Recovery** ⭐
- Mark as deleted, keep data for 30 days
- Allow restore during grace period

### 5. Public Visibility: **Hide Parent Relationship** ⭐
- Sub-account profiles look like regular profiles
- No indication of parent account
- White-label friendly for agencies

### 6. Permissions: **Permission-Based Access** ⭐
- `agency-basic`, `agency-pro`, `agency-premium` permissions
- Add-on to any base tier
- Unlocks sub-account creation capability

### 7. Subscription Packs: **Purchased Separately** ⭐
- 3-user pack ($15/mo)
- 10-user pack ($40/mo)
- 25-user pack ($90/mo)
- Can purchase multiple packs
- Scales independently of base tier

## Implementation Timeline

```
Phase 1: MVP (8-10 weeks)
├── Week 1-2: API design, database schema
├── Week 3-4: Backend implementation
├── Week 5-6: Frontend implementation
├── Week 7-8: Testing (integration, security)
└── Week 9-10: Beta launch (ENTERPRISE only)

Phase 2: Enhancements (4-6 weeks)
├── Configurable email routing
├── Optional parent attribution
├── Advanced analytics
└── Performance optimizations

Phase 3: GA (2 weeks)
├── Enable for PREMIUM tier
├── Public announcement
└── Documentation and support

Total: 14-18 weeks (3.5-4.5 months)
```

## Tier Access

| Tier | Max Sub-Accounts | Notes |
|------|------------------|-------|
| FREE | 0 | Feature not available |
| PRO | 0 | Could be changed based on business model |
| PREMIUM | 3 | Base price includes 3 sub-accounts |
| ENTERPRISE | Unlimited | Base price includes unlimited |

## Database Changes Summary

### Minimal Changes
1. **Users table**: Add 2 boolean flags (`IsSubAccount`, `AuthenticationDisabled`)
2. **SubAccounts table**: Simple parent-child relationship (PartitionKey: ParentUserId, RowKey: ChildUserId)

**That's it!** No other table changes needed.

## Code Changes Summary

### Backend (PowerShell/Azure Functions)
1. **3 new endpoints**: CreateSubAccount, GetSubAccounts, DeleteSubAccount
2. **Update Get-UserSubscription.ps1**: Check if sub-account, return parent's tier
3. **Update authentication**: Check `AuthDisabled` flag on login/API key validation
4. **Update Get-DefaultRolePermissions.ps1**: Add `sub_account_user` role with limited permissions

**Reuse**: All existing endpoints, existing permission system, existing tier logic

### Frontend (React/Next.js)
1. **Add 2 fields to UserAuth type**: `IsSubAccount`, `AuthDisabled` (optional, for display only)
2. **Update Users page**: Add one conditional sub-accounts section
3. **Use existing permission checks**: Check `user.permissions.includes('...')` everywhere

**No special sub-account logic needed!** Backend returns correct permissions per user role.

**Reuse**: Existing AuthContext, existing permission checks, existing UI components, existing API hooks

## Implementation Estimate

**2-3 weeks** (vs 8-12 weeks original plan)

- Week 1: Database changes + 3 API endpoints + role definition
- Week 2: Frontend UI section + verify permission checks work
- Week 3: Testing, bug fixes, documentation

**Massive time savings due to code reuse!**

## Next Steps

### Immediate (This Week)
1. **Team Review Meeting** - Review all documents, make decisions
2. **API Design Meeting** - Finalize endpoint specifications
3. **UX/UI Planning** - Create detailed mockups and user flows

### Following Week
4. **Security Review** - Threat modeling and security audit
5. **Customer Validation** - Survey users, identify beta testers
6. **Technical Spike** - Prototype context switching and session management

### Before Development
7. **Final Approvals** - Stakeholder sign-off
8. **Development Setup** - User stories, tasks, feature flags

## Questions or Feedback?

This is a **planning and discussion document package**. The goal is to:
- Thoroughly explore the problem space
- Identify all technical decisions needed
- Facilitate informed discussions with the team
- Document architecture before implementation

**No code changes are included in this PR** - implementation will follow after team alignment.

## Related Documentation

For reference, see existing planning documents in the repository:
- `API_MULTI_PAGE_GUIDE.md` - Similar planning approach for multi-page feature
- `ANALYTICS_TRACKING_PLAN.md` - Analytics planning example
- `IMPLEMENTATION_SUMMARY.md` - Multi-page implementation summary

---

**Status**: ✅ Planning Complete - Awaiting Team Discussion  
**Version**: 1.0  
**Date**: 2024-01-11  
**Total Documentation**: ~2,594 lines across 3 documents
