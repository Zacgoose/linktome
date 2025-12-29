# Documentation: API Tier Restrictions

This folder contains comprehensive documentation for implementing API access restrictions based on account tiers and pricing models in the LinkToMe application.

## 📋 Overview

The proposed architecture extends LinkToMe's existing Role-Based Access Control (RBAC) system with tier-based restrictions that control:

- **API Rate Limits**: Hourly and daily request quotas per tier
- **Feature Access**: Endpoint-level access control based on subscription level
- **Resource Limits**: Maximum links, custom domains, analytics retention, etc.
- **Usage Tracking**: Comprehensive API usage monitoring and analytics

## 📚 Documentation Files

### [API_TIER_RESTRICTIONS.md](./API_TIER_RESTRICTIONS.md)
**Main Architecture Document** - Complete system design and implementation guide

**Contents:**
- Current system architecture overview
- Proposed tier system design with 4 tiers (Free, Basic, Pro, Enterprise)
- Database schema changes and new tables
- Backend implementation details (middleware, services, functions)
- Frontend integration requirements (components, hooks, error handling)
- Rate limiting implementation strategies
- Admin interface for tier management
- Implementation phases and timeline
- Testing strategy and examples
- Monitoring and observability approach
- Security considerations
- Pricing model integration examples (Stripe)

**Who should read this:** Project managers, full-stack developers, architects

### [BACKEND_REQUIREMENTS.md](./BACKEND_REQUIREMENTS.md)
**Backend-Specific Implementation Guide** - Detailed backend requirements and code examples

**Contents:**
- Database schema with SQL DDL statements
- Redis schema design for rate limiting
- Required API endpoints (user-facing and admin)
- Core backend services implementation
  - Tier validation middleware
  - Rate limiting service (sliding window, token bucket)
  - Usage tracking service
  - Subscription management service
- Background jobs and scheduled tasks
- Environment variables and configuration
- Performance optimization strategies
- Error handling patterns
- Testing requirements
- Monitoring and alerting setup

**Who should read this:** Backend developers, DevOps engineers, database administrators

### [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)
**Visual Architecture Guide** - Diagrams and flowcharts

**Contents:**
- System overview diagram
- Request flow diagrams:
  - Successful request flow
  - Rate limit exceeded flow
  - Tier restriction flow
- Tier configuration structure
- Database schema visualization
- Redis data structures
- Admin monitoring dashboard mockup
- User usage dashboard mockup

**Who should read this:** All team members for quick reference, especially useful for visual learners

## 🎯 Quick Start Guide

### For Project Managers

1. Review [API_TIER_RESTRICTIONS.md](./API_TIER_RESTRICTIONS.md) sections:
   - Overview and proposed architecture
   - Implementation phases (Week 1-6 timeline)
   - Testing strategy
   - Next steps

2. Key decisions needed:
   - Final tier limits (API calls, features, pricing)
   - Payment processor choice (Stripe, PayPal, etc.)
   - Implementation timeline and resource allocation
   - Monitoring and analytics requirements

### For Backend Developers

1. Start with [BACKEND_REQUIREMENTS.md](./BACKEND_REQUIREMENTS.md)
2. Review [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) for visual context
3. Focus on:
   - Database changes (4 new tables + user table modifications)
   - Redis setup for rate limiting
   - Core services implementation
   - API endpoints to create

### For Frontend Developers

1. Review frontend sections in [API_TIER_RESTRICTIONS.md](./API_TIER_RESTRICTIONS.md):
   - Section 4: Frontend Changes
   - Usage dashboard component
   - Tier-aware error handling
   - Feature gating hooks

2. Reference [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) for:
   - User usage dashboard mockup
   - Request flow understanding

### For DevOps/Infrastructure

1. Review [BACKEND_REQUIREMENTS.md](./BACKEND_REQUIREMENTS.md) sections:
   - Redis setup requirements
   - Database optimization (indexes, partitioning)
   - Environment variables
   - Background jobs setup
   - Monitoring and alerting

## 🏗️ Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Database schema changes
- Redis setup
- Tier configuration
- Basic middleware implementation

### Phase 2: Backend Integration (Weeks 2-3)
- Wrap Azure Functions with tier validation
- Implement rate limiting
- Usage tracking system
- Admin APIs

### Phase 3: Frontend Integration (Weeks 3-4)
- Update user types
- Tier-aware error handling
- Usage dashboard
- Feature gating

### Phase 4: Testing (Weeks 4-5)
- Unit tests
- Integration tests
- Load tests
- Documentation

### Phase 5: Monitoring (Weeks 5-6)
- Analytics dashboard
- Alerting setup
- Performance monitoring
- User feedback collection

## 🔑 Key Features

### Four-Tier System

| Tier | Rate Limit | Max Links | Custom Domains | Price |
|------|-----------|-----------|----------------|-------|
| **Free** | 100/hr, 1K/day | 5 | 0 | $0 |
| **Basic** | 500/hr, 5K/day | 25 | 1 | $9/mo |
| **Pro** | 2K/hr, 20K/day | 100 | 5 | $29/mo |
| **Enterprise** | Unlimited | Unlimited | Unlimited | Custom |

### Core Components

1. **Tier Validation Middleware**: Checks every API request against user's tier limits
2. **Redis-Based Rate Limiting**: High-performance sliding window counters
3. **Usage Tracking**: Comprehensive API call logging and analytics
4. **Admin Dashboard**: Manage user subscriptions and view usage statistics
5. **User Dashboard**: Self-service usage monitoring and upgrade prompts

## 🛠️ Technology Stack

- **Frontend**: Next.js, React, TypeScript, Material-UI
- **Backend**: Azure Functions, TypeScript
- **Database**: SQL Database (Azure SQL)
- **Cache**: Redis (Azure Cache for Redis)
- **Authentication**: JWT tokens in HTTP-only cookies
- **Payment**: Stripe (recommended)

## 📊 Database Changes

### New Tables (4)
1. **SubscriptionHistory**: Audit trail of tier changes
2. **ApiUsage**: Raw API call records
3. **ApiUsageHourly**: Hourly aggregates for performance
4. **ApiUsageDaily**: Daily aggregates for dashboards
5. **RateLimitViolations**: Track limit violations

### Modified Tables (1)
- **Users**: Add subscription tier, status, and date fields

## 🔒 Security Considerations

- JWT-based authentication with HTTP-only cookies
- Server-side tier validation (never trust client)
- Distributed rate limiting with Redis
- Signed tokens to prevent tampering
- IP-based abuse detection
- Comprehensive audit logging

## 📈 Monitoring & Observability

### Metrics to Track
- API usage by tier
- Rate limit hit rate
- Tier upgrade triggers
- Performance impact of tier checks
- Redis cache hit rate

### Alerts to Configure
- Redis connection failures
- High 429 (rate limit) response rate
- Tier validation errors
- Unusual usage patterns

## 🧪 Testing Strategy

### Unit Tests
- Tier validation logic
- Rate limiting algorithms
- Endpoint pattern matching

### Integration Tests
- End-to-end API flows
- Redis rate limiting
- Database usage tracking

### Load Tests
- Rate limiting under concurrency
- Redis performance
- Database query performance

## 💰 Pricing Integration

The documentation includes examples for Stripe integration:
- Checkout session creation
- Webhook handling
- Subscription management
- Payment status tracking

## 🚀 Next Steps

1. **Review Documentation**: All stakeholders review relevant sections
2. **Make Key Decisions**:
   - Finalize tier limits and pricing
   - Choose payment processor
   - Confirm timeline
3. **Environment Setup**:
   - Provision Redis instance
   - Set up test database
   - Configure payment processor test mode
4. **Begin Implementation**: Start with Phase 1 (database and backend foundation)

## ❓ Questions or Feedback

For questions about the architecture or implementation:
1. Review the relevant documentation sections
2. Check the [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) for visual clarification
3. Consult the code examples in each document
4. Reach out to the development team with specific questions

## 📝 Notes

- **No Code Changes Yet**: As requested, this is documentation only. No actual code changes have been made to the repository.
- **Incremental Implementation**: The architecture supports gradual rollout, starting with backend and progressively adding features.
- **Backward Compatibility**: Existing users default to "free" tier, maintaining current functionality.
- **Flexibility**: Tier limits are configuration-driven and can be easily adjusted without code changes.

---

**Last Updated**: December 2024  
**Status**: Design Phase - No code implementation yet  
**Next Action**: Stakeholder review and decision on tier limits/pricing
