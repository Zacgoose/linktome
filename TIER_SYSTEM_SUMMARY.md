# User Tier System - Quick Reference

## System Overview

A complete user tier validation and feature tracking system has been implemented to support premium features and subscription management.

## Key Files Created

### Type Definitions
- `src/types/tiers.ts` - Tier types, limits, and configurations
- `src/types/api.ts` - Updated with `tier` field in UserAuth

### Utilities
- `src/utils/tierValidation.ts` - Core validation logic
- `src/utils/featureGate.ts` - Feature usage tracking

### Components
- `src/components/TierBadge.tsx` - Display user tier
- `src/components/UpgradePrompt.tsx` - Upgrade dialog
- `src/hooks/useFeatureGate.ts` - React hook for feature checks

### Pages
- `src/pages/admin/feature-usage.tsx` - Usage analytics dashboard
- `src/pages/admin/dashboard.tsx` - Updated with tier badge
- `src/pages/admin/appearance.tsx` - Integrated tier checks
- `src/components/LinkForm.tsx` - Integrated tier checks

### Documentation
- `TIER_VALIDATION_GUIDE.md` - Complete implementation guide

## Four Subscription Tiers

| Tier | Icon | Features |
|------|------|----------|
| **Free** | 🆓 | 10 links, basic themes |
| **Pro** | ⭐ | 50 links, animations, scheduling, premium fonts |
| **Premium** | 💎 | 100 links, video backgrounds, custom domain |
| **Enterprise** | 🏢 | Unlimited, white-label, priority support |

## Feature Restrictions Implemented

### Link Features (LinkForm.tsx)
- ✅ Custom Layouts (featured, thumbnail) - Pro+
- ✅ Link Animations (shake, pulse, bounce, glow) - Pro+
- ✅ Link Scheduling (date/time restrictions) - Pro+
- ✅ Link Locking (access codes, age verification) - Pro+

### Appearance Features (appearance.tsx)
- ✅ Premium Themes - Based on theme isPro flag
- ✅ Premium Fonts - Based on font isPro flag
- ✅ Video Backgrounds - Premium+ (configured in limits)

### Usage Limits (configured)
- ✅ Max Links: Free=10, Pro=50, Premium=100, Enterprise=Unlimited
- ✅ Max Link Groups: Free=2, Pro=10, Premium=25, Enterprise=Unlimited
- ✅ API Keys: Free=0, Pro=3, Premium=10, Enterprise=Unlimited
- ✅ Analytics Retention: Free=30 days, Pro=90 days, Premium=365 days, Enterprise=Unlimited

## Quick Start: Using in Components

```typescript
import { useFeatureGate } from '@/hooks/useFeatureGate';
import UpgradePrompt from '@/components/UpgradePrompt';

function MyComponent() {
  const { 
    canAccess, 
    checkAndTrack, 
    showUpgrade, 
    upgradeInfo, 
    closeUpgradePrompt 
  } = useFeatureGate();

  const handlePremiumAction = () => {
    if (!canAccess('linkAnimations').allowed) {
      checkAndTrack('linkAnimations', 'Animations Feature');
      return; // Automatically shows upgrade prompt
    }
    
    // Execute premium action
  };

  return (
    <>
      <Button onClick={handlePremiumAction}>
        Use Premium Feature
      </Button>
      
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

## Testing Instructions

### 1. View Current Tier
Navigate to `/admin/dashboard` - tier badge shows in top right

### 2. Test Premium Features
Try these actions (should show upgrade prompts for free tier):
- Add a link → Effects tab → Select any animation
- Add a link → Schedule tab → Enable scheduling
- Add a link → Lock tab → Enable locking
- Add a link → Layout tab → Select featured or thumbnail layout
- Appearance → Select a premium theme (has lock icon)

### 3. View Usage Tracking
Navigate to `/admin/feature-usage` to see:
- Total attempts
- Successful uses
- Blocked attempts
- Feature usage statistics

### 4. Simulate Different Tiers
In browser console:
```javascript
const user = JSON.parse(localStorage.getItem('user'));
user.tier = 'pro'; // Change to 'free', 'pro', 'premium', or 'enterprise'
localStorage.setItem('user', JSON.stringify(user));
location.reload();
```

## Backend Integration Needed

The frontend is ready. To complete the system:

1. **Add tier field to User table/model**
2. **Include tier in JWT token** when user logs in
3. **Create tier management API**:
   ```
   POST /api/admin/SetUserTier
   GET /api/user/GetTier
   ```
4. **Add server-side validation** for all premium features
5. **Implement feature tracking endpoint**:
   ```
   POST /api/tracking/FeatureUsage
   GET /api/tracking/FeatureStats
   ```

## Customization

### Add a New Feature

1. Edit `src/types/tiers.ts`:
```typescript
export interface TierLimits {
  // ... existing
  myNewFeature: boolean;
}

export const TIER_CONFIG = {
  [UserTier.FREE]: {
    // ... existing
    myNewFeature: false,
  },
  [UserTier.PRO]: {
    // ... existing
    myNewFeature: true,
  },
  // ... other tiers
};
```

2. Use in component:
```typescript
const { canAccess } = useFeatureGate();
if (canAccess('myNewFeature').allowed) {
  // Show feature
}
```

### Modify Tier Limits

Edit `TIER_CONFIG` in `src/types/tiers.ts` to change:
- Link limits
- Feature availability
- API rate limits
- Analytics retention

## Key Benefits

✅ **Clear UX**: Users see what's premium before trying  
✅ **Usage Tracking**: Know which features drive upgrades  
✅ **Flexible**: Easy to add features or change limits  
✅ **Type-Safe**: Full TypeScript support  
✅ **Extensible**: Hook-based architecture for easy reuse  

## Important Notes

⚠️ **Frontend Only**: Current implementation is client-side. Add server validation before production.  
⚠️ **Mock Storage**: Usage tracking uses localStorage. Replace with API calls for production.  
⚠️ **Tier Source**: User tier comes from `user.tier` in auth context. Backend must provide this.  

## Feature Usage Dashboard

Access at `/admin/feature-usage` to see:
- Usage summary cards (attempts, successful, blocked)
- Current tier limits
- Most used features
- Blocked feature attempts
- Recent activity log

This helps identify:
- Which premium features users want most
- Conversion opportunities
- Feature adoption by tier

## Next Steps

1. ✅ Frontend tier validation - COMPLETE
2. ✅ UI components and prompts - COMPLETE
3. ✅ Usage tracking system - COMPLETE
4. ⏳ Backend tier validation - TODO
5. ⏳ Payment integration - TODO
6. ⏳ Subscription management - TODO

For detailed information, see `TIER_VALIDATION_GUIDE.md`.
