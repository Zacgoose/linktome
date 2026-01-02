# User Tier System - Quick Reference

## System Overview

A complete user tier validation system has been implemented to support premium features and subscription management.

## Key Files Created

### Type Definitions
- `src/types/tiers.ts` - Tier types, limits, and configurations
- `src/types/api.ts` - Updated with `tier` field in UserAuth

### Utilities
- `src/utils/tierValidation.ts` - Core validation logic

### Components
- `src/components/TierBadge.tsx` - Display user tier
- `src/components/UpgradePrompt.tsx` - Upgrade dialog
- `src/hooks/useFeatureGate.ts` - React hook for feature checks

### Pages
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
    openUpgradePrompt,
    showUpgrade, 
    upgradeInfo, 
    closeUpgradePrompt 
  } = useFeatureGate();

  const handlePremiumAction = () => {
    const access = canAccess('linkAnimations');
    if (!access.allowed && access.requiredTier) {
      openUpgradePrompt('Animations Feature', access.requiredTier);
      return;
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

### 3. Simulate Different Tiers
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
✅ **Flexible**: Easy to add features or change limits  
✅ **Type-Safe**: Full TypeScript support  
✅ **Extensible**: Hook-based architecture for easy reuse  

## Important Notes

⚠️ **Frontend Only**: Current implementation is client-side. Add server validation before production.  
⚠️ **Tier Source**: User tier comes from `user.tier` in auth context. Backend must provide this.  

## Next Steps

1. ✅ Frontend tier validation - COMPLETE
2. ✅ UI components and prompts - COMPLETE
3. ⏳ Backend tier validation - TODO
4. ⏳ Payment integration - TODO
5. ⏳ Subscription management - TODO

For detailed information, see `TIER_VALIDATION_GUIDE.md`.
