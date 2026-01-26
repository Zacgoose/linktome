# Theme Customization Implementation Summary

## Overview

This implementation adds sophisticated theme customization controls to the LinkToMe appearance system, differentiating between fully customizable themes and curated designer themes with limited customization options.

## What Was Changed

### 1. Type Definitions (`src/types/links.ts`)

**Added `customizableProperties` to `AppearanceTheme` interface:**
```typescript
customizableProperties?: {
  wallpaperColors?: boolean;
  wallpaperType?: boolean;
  buttonColors?: boolean;
  buttonStyle?: boolean;
  textColors?: boolean;
  fonts?: boolean;
  headerLayout?: boolean;
  socialIcons?: boolean;
}
```

**Updated all 11 theme presets with customization rules:**
- **Customizable themes** (Custom, Air, Blocks, Lake, Mineral): All properties set to `true`
- **Curated themes** (Agate, Astrid, Aura, Bloom, Breeze, Honeycomb): Mixed permissions
  - ✅ Colors customizable (wallpaperColors, buttonColors, textColors)
  - ❌ Structure locked (wallpaperType, buttonStyle, fonts)

### 2. Theme Helper Utilities (`src/utils/themeHelpers.ts`)

Created a comprehensive helper module with functions:

- `getThemeById()` - Retrieve theme preset by ID
- `isPropertyCustomizable()` - Check if a property can be customized
- `getCustomizableProperties()` - Get all customization rules for a theme
- `prepareAppearanceDataForApi()` - **Key function** that filters data before sending to API
- `canModifyWallpaperProperty()` - Check wallpaper modification permissions
- `canModifyButtonProperty()` - Check button modification permissions  
- `canModifyTextProperty()` - Check text modification permissions

**Key Logic in `prepareAppearanceDataForApi()`:**
- For custom/customizable themes → Send complete configuration
- For curated themes → Send theme name + only customizable properties (colors)
- Backend receives filtered data that matches what user is allowed to change

### 3. Appearance Page UI (`src/pages/admin/appearance.tsx`)

**Added visual restrictions for curated themes:**

1. **Wallpaper Type Selector**
   - Disabled when `!canModifyWallpaperProperty(theme, 'type')`
   - Shows lock icon and tooltip: "Wallpaper type cannot be changed for this curated theme"
   - Grayed out with reduced opacity

2. **Button Style & Corner Radius**
   - Disabled when `!canModifyButtonProperty(theme, 'style')`
   - Shows helper text: "Button style is locked for this curated theme"
   - Grayed out buttons with disabled state

3. **Font Family Selectors**
   - Disabled when `!canModifyTextProperty(theme, 'font')`
   - Shows helper text: "Locked for this theme"
   - Autocomplete dropdowns disabled

4. **Color Pickers**
   - Always enabled (colors are customizable for all themes)
   - Users can adjust colors to personalize curated themes

**Updated save logic:**
```typescript
const dataWithProfileImage = {
  ...formData,
  profileImageUrl: data?.profileImageUrl,
};

const dataToSave = prepareAppearanceDataForApi(dataWithProfileImage);

updateAppearance.mutate({
  url: `admin/UpdateAppearance?pageId=${currentPage.id}`,
  data: dataToSave,
});
```

### 4. API Documentation (`API_DOCUMENTATION_APPEARANCE.md`)

Comprehensive 200+ line documentation for backend team including:
- Request/response formats for both theme types
- Backend implementation guidance
- Data storage recommendations
- Retrieval logic with theme defaults merging
- Migration notes for existing users
- Testing checklist
- Real-world examples

### 5. Bug Fixes

Fixed pre-existing TypeScript errors in `src/hooks/useApiQuery.ts`:
- Changed `showToast(data.message, 'success')` to `showToast(String(data.message), 'success')`
- Fixed type mismatch that was blocking builds

## How It Works

### User Flow

1. **User selects a theme:**
   - Custom/Customizable → All options available
   - Curated → Some options locked with visual indicators

2. **User customizes:**
   - Can always change colors (for brand consistency)
   - Cannot change structure of curated themes (preserves designer intent)

3. **User saves:**
   - Frontend filters data using `prepareAppearanceDataForApi()`
   - API receives only what user is allowed to customize
   - Backend stores theme name + customizations

4. **Backend retrieves:**
   - For custom themes → Return stored data as-is
   - For curated themes → Merge theme defaults with color overrides
   - Frontend renders complete appearance data

### Data Flow Example

**Curated Theme (Agate) - User changes colors:**

**Frontend sends:**
```json
{
  "theme": "agate",
  "customTheme": false,
  "wallpaper": {
    "gradientStart": "#custom-color-1",
    "gradientEnd": "#custom-color-2"
  },
  "buttons": {
    "backgroundColor": "#custom-color-3",
    "textColor": "#custom-color-4"
  },
  "text": {
    "titleColor": "#custom-color-5",
    "pageTextColor": "#custom-color-6"
  }
}
```

**Backend stores:**
- Theme: "agate"
- Color overrides only

**Backend returns (on load):**
```json
{
  "theme": "agate",
  "wallpaper": {
    "type": "gradient",  // From theme default
    "gradientStart": "#custom-color-1",  // User override
    "gradientEnd": "#custom-color-2"     // User override
  },
  "buttons": {
    "type": "solid",     // From theme default
    "cornerRadius": "pill",  // From theme default
    "backgroundColor": "#custom-color-3",  // User override
    "textColor": "#custom-color-4"        // User override
  }
  // ... complete merged data
}
```

## Benefits

1. **Preserves Design Quality**
   - Curated themes maintain designer's vision
   - Users can't break carefully crafted aesthetics

2. **Personalization**
   - Colors always customizable for brand alignment
   - Power users get full control with custom themes

3. **Performance**
   - Reduced data sent to API
   - Backend stores less redundant data

4. **Scalability**
   - Easy to add new themes with different rules
   - Flexible permission system

## Testing Performed

✅ TypeScript compilation successful
✅ Next.js build successful  
✅ Helper function logic validated with test script
✅ Theme customization rules verified for all 11 themes
✅ Data filtering logic confirmed for both theme types

## What Backend Team Needs to Do

1. **Read `API_DOCUMENTATION_APPEARANCE.md`** - Complete implementation guide

2. **Store theme name** - Save `theme` and `customTheme` fields

3. **Implement retrieval logic** - Merge theme defaults with customizations

4. **Handle theme defaults** - Maintain a copy of default theme configurations

5. **Test with examples** - Use provided JSON examples in documentation

## Files Changed

- `src/types/links.ts` - Type definitions
- `src/utils/themeHelpers.ts` - Helper utilities (NEW FILE)
- `src/pages/admin/appearance.tsx` - UI restrictions and save logic
- `src/hooks/useApiQuery.ts` - Bug fix
- `API_DOCUMENTATION_APPEARANCE.md` - Backend documentation (NEW FILE)
- `.gitignore` - Excluded test file

## Future Enhancements

Potential improvements for later:
- Theme preview modal showing locked vs unlocked options
- "Restore theme defaults" button for curated themes
- Theme templates/marketplace
- Per-theme advanced options panel
- A/B testing between theme variations
