# Tier Validation Components

This directory contains reusable components for implementing tier-based feature gating throughout the application. These components provide a consistent UX for premium features and upgrade prompts.

## Components

### TierProtectedSection

Wraps content that requires a specific tier level. Shows upgrade prompt if user doesn't have required tier.

**Usage:**
```tsx
import { TierProtectedSection } from '@/components/tier';

<TierProtectedSection
  featureKey="advancedAnalytics"
  featureName="Advanced Analytics"
  benefits={[
    'Top performing links analysis',
    'Recent link clicks tracking',
    'Extended analytics retention',
  ]}
>
  <AdvancedAnalyticsContent />
</TierProtectedSection>
```

**Props:**
- `featureKey`: The feature key from TierLimits interface
- `featureName`: Display name for upgrade messaging
- `children`: Content to show when user has access
- `upgradeMessage?`: Custom upgrade message
- `benefits?`: List of benefits to show
- `compact?`: Show compact alert style (default: false)
- `fallback?`: Custom content when access denied

### TierProtectedButton

Button that validates tier before onClick action. Automatically shows upgrade prompt if user lacks access.

**Usage:**
```tsx
import { TierProtectedButton } from '@/components/tier';

<TierProtectedButton
  featureKey="analyticsExport"
  featureName="Analytics Export"
  onClick={handleExport}
  variant="outlined"
  startIcon={<DownloadIcon />}
>
  Export Data
</TierProtectedButton>
```

**Props:**
- `featureKey`: The feature key from TierLimits interface
- `featureName`: Display name for upgrade messaging
- `onClick`: Action to perform when user has access
- `children`: Button content
- `showLockIcon?`: Show lock icon (default: true if no access)
- All standard MUI Button props

### TierLimitAlert

Displays alerts when user has reached or is nearing tier limits.

**Usage:**
```tsx
import { TierLimitAlert } from '@/components/tier';

<TierLimitAlert
  limitKey="apiKeysLimit"
  limitName="API Keys"
  currentCount={apiKeys.length}
/>
```

**Props:**
- `limitKey`: The limit feature to check
- `limitName`: Display name for the limit
- `currentCount`: Current usage count
- `message?`: Custom message
- `alwaysShow?`: Show even if limit not reached (default: false)

Shows warning when limit reached, info when nearing (80%+).

### UsageBar

Displays usage progress bar with current/total values.

**Usage:**
```tsx
import { UsageBar } from '@/components/tier';

<UsageBar
  used={dailyRequests}
  total={rateLimits.requestsPerDay}
  label="Daily Requests"
/>
```

**Props:**
- `used`: Current usage count
- `total`: Maximum allowed count (-1 for unlimited)
- `label`: Label to display
- `showUnlimited?`: Show "Unlimited" text (default: true)

## Hook: useTierProtection

Simplified hook that combines `useFeatureGate` with automatic upgrade prompt management.

**Usage:**
```tsx
import { useTierProtection } from '@/hooks/useTierProtection';

function MyPage() {
  const { canAccess, openUpgradePrompt, UpgradePromptComponent } = useTierProtection();
  
  return (
    <>
      {/* Your page content */}
      <UpgradePromptComponent />
    </>
  );
}
```

**Returns:**
- `canAccess`: Function to check feature access
- `userTier`: Current user's tier
- `openUpgradePrompt`: Function to manually open upgrade prompt
- `closeUpgradePrompt`: Function to close upgrade prompt
- `UpgradePromptComponent`: Pre-configured component to render

## Migration Guide

### Before (Old Pattern)

```tsx
import { useFeatureGate } from '@/hooks/useFeatureGate';
import UpgradePrompt from '@/components/UpgradePrompt';

function MyPage() {
  const { 
    canAccess, 
    showUpgrade, 
    upgradeInfo, 
    closeUpgradePrompt, 
    openUpgradePrompt, 
    userTier 
  } = useFeatureGate();
  
  const handleExport = () => {
    const access = canAccess('analyticsExport');
    if (!access.allowed && access.requiredTier) {
      openUpgradePrompt('Analytics Export', access.requiredTier);
      return;
    }
    // Do export
  };
  
  return (
    <>
      <Button onClick={handleExport}>Export</Button>
      
      {showUpgrade && upgradeInfo && (
        <UpgradePrompt
          open={showUpgrade}
          onClose={closeUpgradePrompt}
          feature={upgradeInfo.feature}
          requiredTier={upgradeInfo.requiredTier!}
          currentTier={upgradeInfo.currentTier}
        />
      )}
    </>
  );
}
```

### After (New Pattern)

```tsx
import { useTierProtection } from '@/hooks/useTierProtection';
import { TierProtectedButton } from '@/components/tier';

function MyPage() {
  const { UpgradePromptComponent } = useTierProtection();
  
  const handleExport = () => {
    // Just do export - button handles tier check
  };
  
  return (
    <>
      <TierProtectedButton
        featureKey="analyticsExport"
        featureName="Analytics Export"
        onClick={handleExport}
      >
        Export
      </TierProtectedButton>
      
      <UpgradePromptComponent />
    </>
  );
}
```

## Benefits

✅ **Less Code**: 20-40 fewer lines per page
✅ **Consistent UX**: Same upgrade flow everywhere
✅ **Type Safe**: Full TypeScript support
✅ **Easy to Test**: Isolated, reusable components
✅ **Maintainable**: Update one place, affects all pages
✅ **Flexible**: Compose components as needed

## Examples in Codebase

See these files for real-world usage:
- `/src/pages/admin/analytics.tsx` - TierProtectedSection, TierProtectedButton
- `/src/pages/admin/apiauth.tsx` - TierLimitAlert, UsageBar
- `/src/pages/admin/links.tsx` - TierLimitAlert, useTierProtection
- `/src/pages/admin/appearance.tsx` - useTierProtection
- `/src/components/LinkForm.tsx` - useTierProtection

## Adding New Tier-Gated Features

1. Add feature to `TierLimits` interface in `/src/types/tiers.ts`
2. Configure limits in `TIER_CONFIG`
3. Use components in your page:

```tsx
// For sections of content
<TierProtectedSection featureKey="myFeature" featureName="My Feature">
  <MyFeatureContent />
</TierProtectedSection>

// For buttons
<TierProtectedButton 
  featureKey="myFeature" 
  featureName="My Feature"
  onClick={handleAction}
>
  Use Feature
</TierProtectedButton>

// For limits
<TierLimitAlert
  limitKey="myFeatureLimit"
  limitName="My Feature"
  currentCount={count}
/>
```

That's it! The components handle all tier checking, upgrade prompts, and UI.
