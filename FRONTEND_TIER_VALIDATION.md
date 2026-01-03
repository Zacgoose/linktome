# Frontend Tier Validation Documentation

This document provides a comprehensive overview of all tier-based validations implemented in the frontend, to help ensure the backend API validates the same features.

## Overview

The frontend tier validation system checks user subscription tiers before allowing access to premium features. All validations happen at **save time** or when attempting to access restricted pages/features, allowing users to explore premium options before upgrading.

## Important: User Tier Source

**The frontend uses the user's tier from the authentication context/JWT token, NOT from individual API responses.**

- User tier is stored in browser storage as part of the auth user object
- All components access tier via `useFeatureGate()` hook which reads from `useAuthContext()`
- API responses should **NOT** include a `tier` field - tier comes from auth token
- This ensures consistent tier display across all pages and prevents discrepancies

### Backend Implementation

The backend should:
1. Include `tier` field in the JWT token when user authenticates
2. Read tier from the authenticated user's token for all validation logic
3. **Do NOT** return tier in individual API responses (analytics, API keys list, etc.)
4. Validate all premium features based on the authenticated user's tier from token

## Feature Keys Reference

All feature keys correspond to the `TierLimits` interface in `src/types/tiers.ts`:

```typescript
interface TierLimits {
  // Link features
  maxLinks: number;
  maxLinkGroups: number;
  customLayouts: boolean;
  linkAnimations: boolean;
  linkScheduling: boolean;
  linkLocking: boolean;
  
  // Appearance features
  customThemes: boolean;
  premiumFonts: boolean;
  customLogos: boolean;
  videoBackgrounds: boolean;
  removeFooter: boolean;
  
  // Analytics features
  advancedAnalytics: boolean;
  analyticsExport: boolean;
  analyticsRetentionDays: number;
  
  // API features
  apiAccess: boolean;
  apiKeysLimit: number;
  apiRequestsPerMinute: number;
  apiRequestsPerDay: number;
  
  // Other features
  customDomain: boolean;
  prioritySupport: boolean;
  whiteLabel: boolean;
}
```

## Implemented Validations

### 1. Link Management Features
**File:** `src/components/LinkForm.tsx`

#### Custom Layouts
- **Feature Key:** `customLayouts`
- **Required Tier:** Pro+
- **Validation Point:** Form submission (handleSubmit)
- **Checked When:** User selects layout other than 'classic'
- **API Endpoint:** `admin/UpdateLinks` (POST/PUT)
- **Payload Field:** `layout` (string)

**API Validation Required:**
```typescript
// Check if link.layout !== 'classic' and user.tier < 'pro'
if (link.layout && link.layout !== 'classic') {
  const canUse = checkTierFeature(user.tier, 'customLayouts');
  if (!canUse) throw new Error('Custom layouts require Pro tier');
}
```

#### Link Animations
- **Feature Key:** `linkAnimations`
- **Required Tier:** Pro+
- **Validation Point:** Form submission
- **Checked When:** User selects animation other than 'none'
- **API Endpoint:** `admin/UpdateLinks`
- **Payload Field:** `animation` (string)

**API Validation Required:**
```typescript
// Check if link.animation !== 'none' and user.tier < 'pro'
if (link.animation && link.animation !== 'none') {
  const canUse = checkTierFeature(user.tier, 'linkAnimations');
  if (!canUse) throw new Error('Link animations require Pro tier');
}
```

#### Link Scheduling
- **Feature Key:** `linkScheduling`
- **Required Tier:** Pro+
- **Validation Point:** Form submission
- **Checked When:** User enables scheduling (schedule.enabled = true)
- **API Endpoint:** `admin/UpdateLinks`
- **Payload Field:** `schedule` object with `{ enabled, startDate, endDate, timezone }`

**API Validation Required:**
```typescript
// Check if schedule.enabled and user.tier < 'pro'
if (link.schedule && link.schedule.enabled) {
  const canUse = checkTierFeature(user.tier, 'linkScheduling');
  if (!canUse) throw new Error('Link scheduling requires Pro tier');
}
```

#### Link Locking
- **Feature Key:** `linkLocking`
- **Required Tier:** Pro+
- **Validation Point:** Form submission
- **Checked When:** User enables locking (lock.enabled = true)
- **API Endpoint:** `admin/UpdateLinks`
- **Payload Field:** `lock` object with `{ enabled, type, code, message }`

**API Validation Required:**
```typescript
// Check if lock.enabled and user.tier < 'pro'
if (link.lock && link.lock.enabled) {
  const canUse = checkTierFeature(user.tier, 'linkLocking');
  if (!canUse) throw new Error('Link locking requires Pro tier');
}
```

### 2. Appearance Features
**File:** `src/pages/admin/appearance.tsx`

#### Custom Themes
- **Feature Key:** `customThemes`
- **Required Tier:** Pro+
- **Validation Point:** Form submission (handleSubmit)
- **Checked When:** User selects theme other than free themes
- **API Endpoint:** `admin/UpdateAppearance`
- **Payload Field:** `theme` (string)

**API Validation Required:**
```typescript
// Check if theme is premium and user.tier < 'pro'
const premiumThemes = ['gradient-sunset', 'dark-ocean', 'neon-lights', /* ... */];
if (premiumThemes.includes(appearance.theme)) {
  const canUse = checkTierFeature(user.tier, 'customThemes');
  if (!canUse) throw new Error('Premium themes require Pro tier');
}
```

#### Premium Fonts
- **Feature Key:** `premiumFonts`
- **Required Tier:** Pro+
- **Validation Point:** Form submission
- **Checked When:** User selects font with `isPro: true`
- **API Endpoint:** `admin/UpdateAppearance`
- **Payload Field:** `font` (string)

**API Validation Required:**
```typescript
// Check if font is premium and user.tier < 'pro'
const premiumFonts = ['playfair', 'raleway', 'lato', 'montserrat'];
if (premiumFonts.includes(appearance.font)) {
  const canUse = checkTierFeature(user.tier, 'premiumFonts');
  if (!canUse) throw new Error('Premium fonts require Pro tier');
}
```

#### Video Backgrounds
- **Feature Key:** `videoBackgrounds`
- **Required Tier:** Premium+
- **Validation Point:** Form submission
- **Checked When:** User enables video background
- **API Endpoint:** `admin/UpdateAppearance`
- **Payload Field:** `videoBackground` (string URL)

**API Validation Required:**
```typescript
// Check if videoBackground is set and user.tier < 'premium'
if (appearance.videoBackground) {
  const canUse = checkTierFeature(user.tier, 'videoBackgrounds');
  if (!canUse) throw new Error('Video backgrounds require Premium tier');
}
```

#### Custom Logos
- **Feature Key:** `customLogos`
- **Required Tier:** Pro+
- **Validation Point:** Form submission
- **Checked When:** User uploads a custom logo
- **API Endpoint:** `admin/UpdateAppearance`
- **Payload Field:** `logo` (string URL)

**API Validation Required:**
```typescript
// Check if logo is custom and user.tier < 'pro'
if (appearance.logo && appearance.logo !== defaultLogo) {
  const canUse = checkTierFeature(user.tier, 'customLogos');
  if (!canUse) throw new Error('Custom logos require Pro tier');
}
```

#### Remove Footer
- **Feature Key:** `removeFooter`
- **Required Tier:** Pro+
- **Validation Point:** Form submission
- **Checked When:** User enables "remove footer" option
- **API Endpoint:** `admin/UpdateAppearance`
- **Payload Field:** `hideFooter` (boolean)

**API Validation Required:**
```typescript
// Check if hideFooter is true and user.tier < 'pro'
if (appearance.hideFooter === true) {
  const canUse = checkTierFeature(user.tier, 'removeFooter');
  if (!canUse) throw new Error('Removing footer requires Pro tier');
}
```

### 3. API Access Features
**File:** `src/pages/admin/apiauth.tsx`

**Note:** The API keys list endpoint should NOT return a `tier` field. User tier comes from auth context.

**Expected Response Structure:**
```typescript
{
  keys: ApiKey[],
  availablePermissions: string[],
  rateLimits: {
    requestsPerMinute: number,
    requestsPerDay: number
  },
  usage: {
    dailyUsed: number,
    dailyRemaining: number,
    perKey: Record<string, { minuteUsed: number, minuteRemaining: number }>
  }
}
```

#### API Access
- **Feature Key:** `apiAccess`
- **Required Tier:** Pro+
- **Validation Point:** When clicking "Create Key" button
- **Checked When:** User tries to access API functionality
- **API Endpoints:** `admin/apikeyscreate`, `admin/apikeyslist`

**API Validation Required:**
```typescript
// Check on all API key endpoints
if (user.tier < 'pro') {
  const canUse = checkTierFeature(user.tier, 'apiAccess');
  if (!canUse) throw new Error('API access requires Pro tier');
}
```

#### API Keys Limit
- **Feature Key:** `apiKeysLimit`
- **Required Tier:** Varies (Pro=3, Premium=10, Enterprise=unlimited)
- **Validation Point:** Before creating a new API key
- **Checked When:** User tries to create an API key
- **API Endpoint:** `admin/apikeyscreate`

**API Validation Required:**
```typescript
// Check on API key creation
const existingKeysCount = await getApiKeysCount(user.id);
const limit = getTierLimit(user.tier, 'apiKeysLimit');

if (limit !== -1 && existingKeysCount >= limit) {
  throw new Error(`API key limit reached. Your ${user.tier} plan allows ${limit} keys.`);
}
```

### 4. Analytics Features
**File:** `src/pages/admin/analytics.tsx`

#### Analytics Export
- **Feature Key:** `analyticsExport`
- **Required Tier:** Pro+
- **Validation Point:** When clicking "Export Data" button
- **Checked When:** User tries to export analytics data to CSV
- **API Endpoint:** N/A (client-side export, but should be validated if you add a backend export endpoint)

**API Validation Required (if implementing backend export):**
```typescript
// Check on analytics export endpoint
if (user.tier < 'pro') {
  const canUse = checkTierFeature(user.tier, 'analyticsExport');
  if (!canUse) throw new Error('Analytics export requires Pro tier');
}
```

### 5. Link Groups Features
**File:** `src/pages/admin/links.tsx`

#### Max Link Groups
- **Feature Key:** `maxLinkGroups`
- **Required Tier:** Varies (Free=2, Pro=10, Premium=25, Enterprise=unlimited)
- **Validation Point:** Before creating a new link group/collection
- **Checked When:** User tries to create a new collection
- **API Endpoint:** `admin/UpdateLinks` (with groups operation)

**API Validation Required:**
```typescript
// Check on group creation
const existingGroupsCount = await getLinkGroupsCount(user.id);
const limit = getTierLimit(user.tier, 'maxLinkGroups');

if (limit !== -1 && existingGroupsCount >= limit) {
  throw new Error(`Link group limit reached. Your ${user.tier} plan allows ${limit} groups.`);
}
```

## NOT Implemented in Frontend (Backend Only)

These features are configured in `TIER_CONFIG` but have no frontend validation:

### Analytics Retention Days
- **Feature Key:** `analyticsRetentionDays`
- **Backend Only:** Should be enforced when querying analytics data
- **Implementation:** Backend should only return analytics data within the user's retention period

### API Rate Limits
- **Feature Keys:** `apiRequestsPerMinute`, `apiRequestsPerDay`
- **Backend Only:** Should be enforced using rate limiting middleware
- **Implementation:** Backend should track and limit API requests per key

### Custom Domain
- **Feature Key:** `customDomain`
- **Not Implemented:** No UI exists yet
- **Future Implementation:** When adding custom domain feature

### Priority Support
- **Feature Key:** `prioritySupport`
- **Not Implemented:** No UI exists yet
- **Future Implementation:** May affect support ticket routing

### White Label
- **Feature Key:** `whiteLabel`
- **Not Implemented:** No UI exists yet
- **Future Implementation:** When adding white label branding feature

## Tier Configuration

```typescript
export const TIER_CONFIG: Record<UserTier, TierLimits> = {
  [UserTier.FREE]: {
    maxLinks: 10,
    maxLinkGroups: 2,
    customLayouts: false,
    linkAnimations: false,
    linkScheduling: false,
    linkLocking: false,
    customThemes: true, // Some themes are free
    premiumFonts: false,
    customLogos: false,
    videoBackgrounds: false,
    removeFooter: false,
    advancedAnalytics: false,
    analyticsExport: false,
    analyticsRetentionDays: 30,
    apiAccess: false,
    apiKeysLimit: 0,
    apiRequestsPerMinute: 0,
    apiRequestsPerDay: 0,
    customDomain: false,
    prioritySupport: false,
    whiteLabel: false,
  },
  [UserTier.PRO]: {
    maxLinks: 50,
    maxLinkGroups: 10,
    customLayouts: true,
    linkAnimations: true,
    linkScheduling: true,
    linkLocking: true,
    customThemes: true,
    premiumFonts: true,
    customLogos: true,
    videoBackgrounds: false,
    removeFooter: true,
    advancedAnalytics: true,
    analyticsExport: true,
    analyticsRetentionDays: 90,
    apiAccess: true,
    apiKeysLimit: 3,
    apiRequestsPerMinute: 60,
    apiRequestsPerDay: 10000,
    customDomain: false,
    prioritySupport: false,
    whiteLabel: false,
  },
  [UserTier.PREMIUM]: {
    maxLinks: 100,
    maxLinkGroups: 25,
    customLayouts: true,
    linkAnimations: true,
    linkScheduling: true,
    linkLocking: true,
    customThemes: true,
    premiumFonts: true,
    customLogos: true,
    videoBackgrounds: true,
    removeFooter: true,
    advancedAnalytics: true,
    analyticsExport: true,
    analyticsRetentionDays: 365,
    apiAccess: true,
    apiKeysLimit: 10,
    apiRequestsPerMinute: 120,
    apiRequestsPerDay: 50000,
    customDomain: true,
    prioritySupport: true,
    whiteLabel: false,
  },
  [UserTier.ENTERPRISE]: {
    maxLinks: -1, // unlimited
    maxLinkGroups: -1, // unlimited
    customLayouts: true,
    linkAnimations: true,
    linkScheduling: true,
    linkLocking: true,
    customThemes: true,
    premiumFonts: true,
    customLogos: true,
    videoBackgrounds: true,
    removeFooter: true,
    advancedAnalytics: true,
    analyticsExport: true,
    analyticsRetentionDays: -1, // unlimited
    apiAccess: true,
    apiKeysLimit: -1, // unlimited
    apiRequestsPerMinute: 300,
    apiRequestsPerDay: -1, // unlimited
    customDomain: true,
    prioritySupport: true,
    whiteLabel: true,
  },
};
```

## Backend Validation Checklist

For each feature, the backend should:

1. ✅ **Check user tier** from JWT or session
2. ✅ **Validate against `TIER_CONFIG`** limits
3. ✅ **Return appropriate error** with status code 403 (Forbidden) or 402 (Payment Required)
4. ✅ **Include required tier** in error message for frontend to display

### Example Backend Validation

```typescript
// Middleware example
function validateTierFeature(featureKey: keyof TierLimits) {
  return (req, res, next) => {
    const userTier = req.user.tier;
    const tierLimits = TIER_CONFIG[userTier];
    
    if (typeof tierLimits[featureKey] === 'boolean') {
      if (!tierLimits[featureKey]) {
        return res.status(403).json({
          error: 'Upgrade required',
          feature: featureKey,
          requiredTier: getRequiredTier(featureKey),
        });
      }
    }
    
    next();
  };
}

// Usage in routes
app.post('/admin/UpdateLinks', 
  validateTierFeature('customLayouts'), // if custom layout
  validateTierFeature('linkAnimations'), // if animations
  // ... other validations
  handleUpdateLinks
);
```

### Error Response Format

When validation fails, return:

```json
{
  "error": "Upgrade required",
  "message": "Custom layouts require Pro tier or higher",
  "feature": "customLayouts",
  "requiredTier": "pro",
  "currentTier": "free"
}
```

## Testing the Validations

### Frontend Testing

1. **As Free User:**
   - Try to save link with custom layout → blocked
   - Try to save link with animation → blocked
   - Try to enable scheduling → blocked
   - Try to enable locking → blocked
   - Try to select premium theme → blocked
   - Try to select premium font → blocked
   - Try to enable video background → blocked
   - Try to remove footer → blocked
   - Try to access API keys page → blocked
   - Try to export analytics → blocked
   - Try to create 3rd link group → blocked

2. **As Pro User:**
   - All above features should work ✓
   - Try to enable video background → blocked (requires Premium)
   - Try to create 11th link group → blocked (limit is 10)
   - Try to create 4th API key → blocked (limit is 3)

3. **As Premium User:**
   - All features should work ✓
   - All limits increased

4. **As Enterprise User:**
   - Everything unlimited ✓

### Backend Testing

Ensure backend validates ALL features from the checklist above, even if user bypasses frontend validation.

## Summary

**Total Features:** 19
- **Fully Implemented:** 13 (with frontend validation)
- **Backend Only:** 3 (rate limits, retention days)
- **Not Implemented:** 3 (custom domain, priority support, white label)

**Critical for Backend:**
- ✅ Link features (4): layouts, animations, scheduling, locking
- ✅ Appearance features (5): themes, fonts, logos, video, footer
- ✅ API access (2): access gate, keys limit
- ✅ Analytics (1): export
- ✅ Link groups (1): max groups limit
- ⚠️ Rate limiting (2): per minute, per day (backend only)
- ⚠️ Analytics retention (1): days (backend only)

All frontend validations show user-friendly upgrade prompts before attempting API calls. Backend should still validate everything as the final security layer.
