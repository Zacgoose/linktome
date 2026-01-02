# User Tier Validation System

## Overview

This document explains the user tier validation system that has been implemented in the LinkToMe application. This system allows you to restrict features based on user subscription tiers.

## Architecture

### 1. Tier Definitions

The system defines four subscription tiers in `src/types/tiers.ts`:

- **FREE**: Basic tier with limited features
- **PRO**: Enhanced tier with advanced features
- **PREMIUM**: Premium tier with extensive features
- **ENTERPRISE**: Full-featured tier with unlimited access

Each tier has specific feature limits defined in the `TIER_CONFIG` object.

### 2. Core Components

#### Type Definitions (`src/types/tiers.ts`)
- `UserTier`: Enum defining available tiers
- `TierLimits`: Interface defining feature limits per tier
- `TIER_CONFIG`: Configuration mapping tiers to their limits
- `FeatureAccessResult`: Result of feature access checks

#### Validation Utilities (`src/utils/tierValidation.ts`)
- `getTierLimits(tier)`: Get limits for a specific tier
- `parseTier(tierString)`: Parse tier from string with fallback
- `canAccessFeature(tier, feature)`: Check if tier allows feature access
- `hasReachedLimit(tier, limitType, count)`: Check if usage limit reached
- `canUseFontFamily(tier, isPro)`: Check font availability
- `canUseTheme(tier, isPro)`: Check theme availability

#### React Hook (`src/hooks/useFeatureGate.ts`)
- `useFeatureGate()`: Primary hook for feature validation in components
  - Returns: `canAccess`, `userTier`, `showUpgrade`, `openUpgradePrompt`, `closeUpgradePrompt`

#### UI Components
- **TierBadge** (`src/components/TierBadge.tsx`): Display user tier
- **UpgradePrompt** (`src/components/UpgradePrompt.tsx`): Show upgrade dialog

### 3. Integration Points

The system is integrated into:

1. **Link Management** (`src/components/LinkForm.tsx`)
   - Custom layouts (featured, thumbnail variations)
   - Link animations (shake, pulse, bounce, glow)
   - Link scheduling (date/time restrictions)
   - Link locking (access codes, age verification)

2. **Appearance Editor** (`src/pages/admin/appearance.tsx`)
   - Premium themes
   - Premium fonts
   - Video backgrounds (configured but not enforced in current UI)

3. **Admin Dashboard** (`src/pages/admin/dashboard.tsx`)
   - Displays user tier badge

## Usage Examples

### Basic Feature Check

```typescript
import { useFeatureGate } from '@/hooks/useFeatureGate';

function MyComponent() {
  const { canAccess } = useFeatureGate();
  
  // Check if user can access a feature
  const access = canAccess('linkAnimations');
  
  if (!access.allowed) {
    console.log(access.reason); // "This feature requires pro tier or higher"
  }
  
  if (access.allowed) {
    // Enable feature
  }
}
```

### With Upgrade Prompt

```typescript
function MyComponent() {
  const { 
    canAccess, 
    openUpgradePrompt,
    showUpgrade, 
    upgradeInfo, 
    closeUpgradePrompt 
  } = useFeatureGate();
  
  const handleFeatureClick = () => {
    const access = canAccess('customLayouts');
    if (!access.allowed && access.requiredTier) {
      openUpgradePrompt('Custom Layout', access.requiredTier);
    } else {
      // Enable feature
    }
  };
  
  return (
    <>
      <Button onClick={handleFeatureClick}>Use Feature</Button>
      
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

### Limit Checking

```typescript
import { hasReachedLimit } from '@/utils/tierValidation';

function LinkList() {
  const { user } = useAuthContext();
  const currentLinkCount = 15;
  
  const canAddMore = hasReachedLimit(
    user?.tier, 
    'maxLinks', 
    currentLinkCount
  );
  
  if (!canAddMore.allowed) {
    console.log(canAddMore.reason); 
    // "You've reached the limit of 10 maxLinks. Upgrade to add more."
  }
}
```

## Backend Integration

### Current State

The system is **frontend-only**. The user tier is read from `user.tier` in the auth context.

### Backend Requirements

To make this production-ready, you need to:

1. **Add tier field to user model** in your database
2. **Update JWT token** to include `tier` field
3. **Create tier management endpoints**:
   - `POST /api/admin/SetUserTier` - Admin sets user tier
   - `GET /api/admin/GetUserTier` - Get user's current tier
   - `POST /api/billing/UpdateSubscription` - Handle subscription changes

4. **Add server-side validation**:
   - Validate tier on every feature-related API call
   - Reject requests if user tier doesn't allow the feature
   - Example: Check tier before saving link with animations

### Example Backend Validation

```csharp
// Example C# backend validation
public async Task<IActionResult> SaveLink([FromBody] LinkModel link)
{
    var user = await GetCurrentUser();
    var tierLimits = GetTierLimits(user.Tier);
    
    // Check if animations are allowed
    if (link.Animation != "none" && !tierLimits.LinkAnimations)
    {
        return BadRequest(new { error = "Link animations require Pro tier" });
    }
    
    // Check link count limit
    var currentCount = await GetUserLinkCount(user.UserId);
    if (currentCount >= tierLimits.MaxLinks && tierLimits.MaxLinks != -1)
    {
        return BadRequest(new { 
            error = $"Maximum link limit ({tierLimits.MaxLinks}) reached" 
        });
    }
    
    // Save link...
}
```

## Configuration

### Modifying Tier Limits

Edit `src/types/tiers.ts` to adjust tier configurations:

```typescript
export const TIER_CONFIG: Record<UserTier, TierLimits> = {
  [UserTier.FREE]: {
    maxLinks: 10,           // Change limits here
    customLayouts: false,    // Enable/disable features
    linkAnimations: false,
    // ... other features
  },
  // ... other tiers
};
```

### Adding New Features

1. Add feature to `TierLimits` interface in `src/types/tiers.ts`
2. Set feature value for each tier in `TIER_CONFIG`
3. Use `canAccess('newFeature')` in your component

Example:

```typescript
// 1. Add to TierLimits interface
export interface TierLimits {
  // ... existing features
  customBranding: boolean;
}

// 2. Add to TIER_CONFIG
[UserTier.FREE]: {
  // ... existing config
  customBranding: false,
},
[UserTier.PRO]: {
  // ... existing config
  customBranding: true,
},

// 3. Use in component
const { canAccess } = useFeatureGate();
if (canAccess('customBranding').allowed) {
  // Show branding options
}
```

## Testing

### Manual Testing Steps

1. **Test tier badge display**:
   - Navigate to `/admin/dashboard`
   - Verify tier badge appears in top right

2. **Test link form restrictions**:
   - Go to Links page and add/edit a link
   - Try to enable animations (should show upgrade prompt for free tier)
   - Try to enable scheduling (should show upgrade prompt)
   - Try to enable locking (should show upgrade prompt)
   - Try custom layouts (should show upgrade prompt)

3. **Test appearance restrictions**:
   - Go to Appearance page
   - Try to select a premium theme (look for lock icon)
   - Try to select a premium font (should be filtered out)

4. **Test usage tracking**:
   - Navigate to `/admin/feature-usage`
   - Attempt to use premium features
   - Refresh the page
   - Verify attempts are logged

### Simulating Different Tiers

To test different tiers, temporarily set the tier in localStorage:

```javascript
// In browser console:
const user = JSON.parse(localStorage.getItem('user'));
user.tier = 'pro'; // or 'premium', 'enterprise', 'free'
localStorage.setItem('user', JSON.stringify(user));
location.reload();
```

## Benefits

1. **User Experience**:
   - Clear indication of premium features
   - Informative upgrade prompts

2. **Business Intelligence**:
   - Understand which features drive upgrades
   - Clear tier boundaries

3. **Flexibility**:
   - Easy to add new tiers
   - Simple to adjust feature limits
   - Modular and extensible

4. **Maintainability**:
   - Centralized tier configuration
   - Reusable validation logic
   - Type-safe implementation

## Next Steps

1. **Backend Integration**: Implement server-side tier validation
2. **Billing Integration**: Connect to Stripe/payment processor
3. **Tier Management UI**: Admin panel for managing user tiers
4. **Upgrade Flows**: Complete checkout and subscription management

## Support

For questions or issues with the tier validation system, refer to:
- Type definitions: `src/types/tiers.ts`
- Validation logic: `src/utils/tierValidation.ts`
- React hook: `src/hooks/useFeatureGate.ts`
