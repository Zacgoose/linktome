# Subscription Downgrade Handling

## Overview

When a user's subscription ends, is cancelled, or payment fails, the system needs to handle features that are for paid accounts only. This document describes how the LinkToMe platform handles subscription downgrades.

## Affected Features

When downgrading from a paid tier (Pro, Premium, Enterprise) to the Free tier, the following features are affected:

### 1. Pages
- **Free tier limit**: 1 page
- **Behavior**: Additional pages beyond the first are removed
- **User choice**: Users can select which page to keep
- **Data retention**: Removed pages are not permanently deleted and can be restored upon re-subscription

### 2. Themes
- **Free tier limit**: Basic themes only (no premium themes)
- **Behavior**: Premium themes are reverted to the default free theme
- **Default theme**: The system selects the first available free theme
- **Customization**: Basic customization options remain available

### 3. Fonts
- **Free tier limit**: Basic fonts only
- **Behavior**: Premium fonts are reverted to free font alternatives
- **Default font**: Inter or other free fonts
- **Text styles**: Color and size customizations are preserved

### 4. Links
- **Free tier limit**: 10 links, 2 link groups
- **Behavior**: Excess links are removed, premium features are stripped
- **User choice**: Users can select which links to keep (up to the limit)
- **Premium features removed**:
  - Link animations
  - Link scheduling
  - Link locking (password protection, age gates)
  - Custom layouts (reverted to classic layout)

### 5. Short Links
- **Free tier limit**: 0 short links
- **Behavior**: All short links are deactivated
- **Data retention**: Short links are preserved but become inactive
- **Analytics**: Historical analytics data is retained

### 6. Sub-Accounts
- **Free tier limit**: Not available
- **Behavior**: All sub-accounts are suspended
- **Access**: Sub-accounts cannot log in while suspended
- **Note**: Sub-accounts are tied to User Packs, not subscription tiers

### 7. API Access
- **Free tier limit**: No API access
- **Behavior**: All API keys are revoked
- **Rate limits**: Reset to 0 requests/minute
- **Data**: API usage history is retained

### 8. Custom Logo
- **Free tier limit**: Not available
- **Behavior**: Custom logo is removed, default profile image shown

### 9. Video Backgrounds
- **Free tier limit**: Not available
- **Behavior**: Video backgrounds are removed, solid color or image backgrounds remain

### 10. Custom Domain
- **Free tier limit**: Not available
- **Behavior**: Custom domain is disconnected
- **Access**: User's page is accessible only via default LinkToMe subdomain

### 11. White Label
- **Free tier limit**: Not available
- **Behavior**: LinkToMe branding is restored (footer, powered by text, etc.)

### 12. Analytics Export
- **Free tier limit**: Not available
- **Behavior**: Export functionality is disabled
- **View access**: Users can still view analytics in the dashboard

## Downgrade Process

### 1. Assessment Phase
When a subscription is about to end:
1. System calculates what will change
2. Identifies items that exceed free tier limits
3. Determines if user action is required

### 2. User Notification
Users receive notifications:
- Email notification when subscription is cancelled
- In-app warning when subscription is about to end
- Preview page showing exactly what will change

### 3. User Choice Period
For items that require selection (pages, links, short links):
- Users are prompted to choose which items to keep
- If no selection is made, system uses default strategy:
  - **Pages**: Keep default page
  - **Links**: Keep first N links by order
  - **Short Links**: Keep first N by creation date

### 4. Execution Phase
On the subscription end date:
1. Features are automatically downgraded
2. Excess items are removed/deactivated
3. Premium features are stripped
4. User receives confirmation email

### 5. Grace Period
- Users retain access until the end of their current billing period
- No immediate disruption of service
- Downgrade occurs at the end of the paid period

## Downgrade Strategies

The system supports multiple strategies for choosing which items to keep:

### Keep Default
- **Pages**: Prioritizes the default page
- **Links**: Keeps items marked as priority
- **Best for**: Users who want to keep their main content

### Keep Newest
- Keeps the most recently created items
- **Best for**: Users who want their latest work

### Keep Oldest
- Keeps the oldest items
- **Best for**: Preserving original content

### User Choice
- User explicitly selects items to keep
- **Best for**: Users who want full control

## Data Retention

### Soft Delete
- Removed items are not permanently deleted
- Items are marked as inactive but preserved in database
- Upon re-subscription, items are automatically restored

### Restoration
When a user upgrades again:
1. Previously removed pages are reactivated
2. Stripped premium features are restored
3. Sub-accounts are unsuspended
4. API keys can be regenerated

### Permanent Deletion
Users can permanently delete items:
- Manual deletion from dashboard
- After account closure (30-day grace period)

## API Integration

### Backend Endpoints

```typescript
// Preview downgrade impact
POST /api/admin/previewDowngrade
Request: { userId: string, targetTier: UserTier, options?: DowngradeOptions }
Response: { assessment: SubscriptionDowngradeAssessment, canProceedAutomatically: boolean }

// Execute downgrade
POST /api/admin/executeDowngrade
Request: { userId: string, targetTier: UserTier, options: DowngradeOptions, userConfirmed: boolean }
Response: { success: boolean, assessment: SubscriptionDowngradeAssessment }
```

### Webhook Handling

Stripe webhooks trigger downgrade process:
- `customer.subscription.deleted`: Immediate downgrade
- `customer.subscription.updated`: Check if cancelled, schedule downgrade
- `invoice.payment_failed`: After retry attempts exhausted

## User Experience

### Downgrade Preview Page
- Shows before/after comparison
- Lists all affected features
- Allows item selection
- Confirms user understanding

### Notifications
- Email when subscription is cancelled
- Email 7 days before downgrade
- Email 1 day before downgrade
- Email after downgrade completes

### Dashboard Warnings
- Persistent banner when subscription is ending
- Link to downgrade preview
- Countdown to downgrade date

## Implementation Notes

### Frontend Components
- `SubscriptionDowngradePreview.tsx`: UI component for preview
- `useSubscriptionDowngrade.ts`: React hook for downgrade logic
- `subscriptionDowngradeHandler.ts`: Core assessment logic

### Type Definitions
- `subscriptionDowngrade.ts`: TypeScript types for all downgrade operations

### Testing
- Unit tests for assessment logic
- Integration tests for API endpoints
- E2E tests for user flow

## Security Considerations

- User must explicitly confirm downgrade
- Cannot be triggered by unauthenticated requests
- Audit log of all downgrade operations
- Restoration available only to account owner

## Future Enhancements

1. **Partial Downgrades**: Allow users to keep some premium features à la carte
2. **Pause Instead of Cancel**: Temporarily suspend without full downgrade
3. **Custom Grace Periods**: Extended periods for long-term customers
4. **Downgrade Analytics**: Track which features users miss most
5. **Re-engagement**: Targeted offers for features users are losing
