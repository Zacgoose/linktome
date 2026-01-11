# Agency/Multi-Account Profiles - Documentation Index

## Overview

This folder contains comprehensive planning documentation for the **Agency/Multi-Account Profiles** feature in LinkToMe. This feature will allow parent accounts (PREMIUM+ tier) to create and manage sub-accounts that inherit features from the parent's subscription plan but cannot login independently.

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
- ✅ A separate username with its own public profile (e.g., `/clientbrand1`)
- ✅ Managed entirely by a parent account
- ✅ Inherits feature access from parent's subscription tier
- ❌ **CANNOT** login independently (no password, no MFA, no API keys)
- ❌ **CANNOT** manage subscriptions, user settings, or authentication

### How is This Different from Multi-Page?

The app already has a **multi-page system** where users can create multiple pages:

| Feature | Multi-Page (Existing) | Multi-Account (New) |
|---------|----------------------|---------------------|
| User | Same user account | Parent + multiple sub-accounts |
| URL | `/username/main`, `/username/music` | `/parent`, `/client1`, `/client2` |
| Username | Shared across pages | Each sub-account has unique username |
| Login | User logs in | Only parent logs in |
| Use Case | One person, different link collections | Managing multiple brands/clients |

**Example**:
- Multi-Page: `@creativestudio/main`, `@creativestudio/portfolio`
- Multi-Account: `@creativestudio` (parent), `@clientbrand1`, `@clientbrand2`

### Target Use Cases

1. **Digital Agencies**: Manage multiple client brands from one dashboard
2. **Multi-Brand Businesses**: Separate identities for different product lines
3. **Influencers**: Different personas for different content types

## Recommended Technical Decisions

Based on analysis in the planning documents, here are the **recommended MVP decisions**:

### 1. Context Management: **Hybrid Approach** ⭐
- UI uses session-based context switching (cleaner code)
- API clients can use parameter-based (flexible)
- Parameter overrides session when both present

### 2. Feature Quota: **Shared Quota** ⭐
- Parent + all sub-accounts share one resource pool
- Example: PREMIUM 100 links total across all accounts
- Simpler to implement, encourages tier upgrades

### 3. Deletion: **Soft Delete with 30-day Recovery** ⭐
- Mark as deleted, keep data for 30 days
- Allow restore during grace period
- Protects against accidental deletion

### 4. Public Visibility: **Hide Parent Relationship** ⭐
- Sub-account profiles look like regular profiles
- No indication of parent account
- White-label friendly for agencies

### 5. Email Handling: **All to Parent (MVP)** ⭐
- Sub-account email is for display only
- All notifications go to parent account
- Can add configurable routing in Phase 2

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

### New Tables
1. **AccountRelationships** - Track parent-child relationships
2. **SubAccountProfiles** - Additional sub-account metadata (optional)

### Updated Tables
- **Users**: Add `IsSubAccount`, `ParentAccountId`, `AccountType`, `AuthenticationDisabled`
- **Subscription**: Add `IncludedSubAccounts`, `UsedSubAccounts`
- **All data tables** (Links, Pages, etc.): No changes needed

## API Endpoints Summary

### New Endpoints
```
POST /admin/CreateSubAccount        - Create new sub-account
GET /admin/GetSubAccounts           - List all sub-accounts
PUT /admin/UpdateSubAccount         - Update sub-account details
DELETE /admin/DeleteSubAccount      - Soft delete sub-account
POST /admin/RestoreSubAccount       - Restore deleted sub-account
POST /admin/UpdateSubAccountStatus  - Suspend/reactivate

POST /admin/SwitchToSubAccount      - Set active context
POST /admin/SwitchToParentAccount   - Clear context
GET /admin/GetActiveContext         - Get current context
```

### Updated Endpoints
All existing `/admin/*` endpoints support:
- Session-based context (automatic)
- Optional `?subAccountId=xxx` parameter (override)
- Feature validation against parent's tier
- Shared quota enforcement

## Security Highlights

1. **Authentication**: Sub-accounts cannot login (no password, no MFA, no API keys)
2. **Authorization**: Parent ownership validated on every request
3. **Context Switching**: Only valid relationships allowed, fully audited
4. **Data Isolation**: Parents can only access their own sub-accounts
5. **Rate Limiting**: Applied at parent account level

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
