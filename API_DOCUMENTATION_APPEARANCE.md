# Appearance API - Updated Documentation

## Overview

This document describes the updated appearance customization system that differentiates between **curated themes** (with limited customization) and **custom/customizable themes** (with full customization).

## Key Changes

### Theme Types

1. **Custom/Customizable Themes** (`type: 'customizable'`)
   - Full customization allowed
   - Examples: Custom, Air, Blocks, Lake, Mineral
   - All appearance properties can be modified
   - `customTheme: true` flag sent to API

2. **Curated Themes** (`type: 'curated'`)
   - Limited customization to preserve designer intent
   - Examples: Agate, Astrid, Aura, Bloom, Breeze, Honeycomb
   - Only specific properties can be customized
   - `customTheme: false` flag sent to API
   - Theme name is sent, plus only the customizable properties

## API Endpoint

### `PUT /api/admin/UpdateAppearance?pageId={pageId}`

#### Request Body Structure

The request body structure varies based on the theme type:

##### For Custom/Customizable Themes

Send the **complete** appearance configuration:

```json
{
  "theme": "custom",
  "customTheme": true,
  "pageId": "page-uuid-here",
  "header": {
    "profileImageLayout": "classic",
    "titleStyle": "text",
    "displayName": "John Doe",
    "bio": "Welcome to my page"
  },
  "wallpaper": {
    "type": "gradient",
    "gradientStart": "#667eea",
    "gradientEnd": "#764ba2",
    "gradientDirection": 180
  },
  "buttons": {
    "type": "solid",
    "cornerRadius": "rounded",
    "shadow": "subtle",
    "backgroundColor": "#4a6cf7",
    "textColor": "#ffffff"
  },
  "text": {
    "titleFont": "poppins",
    "titleColor": "#1c2541",
    "titleSize": "small",
    "bodyFont": "inter",
    "pageTextColor": "#23335b"
  },
  "socialIcons": [
    {
      "platform": "instagram",
      "url": "https://instagram.com/username",
      "order": 0,
      "active": true
    }
  ],
  "hideFooter": false,
  "profileImageUrl": "https://example.com/avatar.jpg"
}
```

##### For Curated Themes

Send **only** the theme name and customizable properties:

```json
{
  "theme": "agate",
  "customTheme": false,
  "pageId": "page-uuid-here",
  "header": {
    "profileImageLayout": "classic",
    "titleStyle": "text",
    "displayName": "John Doe",
    "bio": "Welcome to my page"
  },
  "wallpaper": {
    "type": "gradient",
    "gradientStart": "#2a2a3e",
    "gradientEnd": "#a18dab",
    "gradientDirection": 220
  },
  "buttons": {
    "type": "solid",
    "cornerRadius": "pill",
    "shadow": "strong",
    "backgroundColor": "#ffffff",
    "textColor": "#2a2a3e"
  },
  "text": {
    "titleFont": "playfair",
    "titleColor": "#f0f0f0",
    "titleSize": "small",
    "bodyFont": "dm-sans",
    "pageTextColor": "#d5d5d5"
  },
  "socialIcons": [
    {
      "platform": "instagram",
      "url": "https://instagram.com/username",
      "order": 0,
      "active": true
    }
  ],
  "hideFooter": false,
  "profileImageUrl": "https://example.com/avatar.jpg"
}
```

**Note:** For curated themes:
- Wallpaper colors (gradient/pattern colors) are customizable
- Wallpaper **type** is NOT sent (backend should use theme default)
- Button colors are customizable
- Button **type**, **cornerRadius**, **shadow** are NOT customizable (backend should use theme defaults)
- Text colors are customizable
- Font families are NOT customizable (backend should use theme defaults)

## Customization Rules by Theme

### Customizable Themes (Full Customization)
- **Custom, Air, Blocks, Lake, Mineral**
- All properties can be modified
- User has full control over:
  - Wallpaper type and colors
  - Button styles and colors
  - Font families and colors
  - Header layout
  - Social icons

### Curated Themes (Limited Customization)
- **Agate, Astrid, Aura, Bloom, Breeze, Honeycomb**
- Limited customization to maintain design integrity
- **Allowed:**
  - Wallpaper colors (gradient/pattern/blur colors, opacity)
  - Button colors (background, text, border)
  - Text colors
  - Header layout (classic vs hero)
  - Social icons
  - Display name, bio, profile image
  
- **NOT Allowed (use theme defaults):**
  - Wallpaper type (gradient → pattern, etc.)
  - Button type (solid → glass → outline)
  - Button corner radius (square → rounded → pill)
  - Button shadow style
  - Font families (title and body fonts)

## Backend Implementation Guidance

### 1. Data Storage

Store both the theme name and the customized properties:

```typescript
interface StoredAppearance {
  theme: string;              // "agate", "custom", "air", etc.
  customTheme: boolean;       // true for custom/customizable, false for curated
  
  // Store only the properties that were sent in the request
  // For curated themes, this will be a subset
  customizations: {
    wallpaper?: Partial<WallpaperStyle>;
    buttons?: Partial<ButtonStyle>;
    text?: Partial<TextStyle>;
    header: HeaderStyle;
    socialIcons: SocialIcon[];
    hideFooter: boolean;
    profileImageUrl?: string;
  };
}
```

### 2. Retrieval Logic

When fetching appearance data for rendering:

```typescript
function getAppearanceForRendering(stored: StoredAppearance): AppearanceData {
  if (stored.customTheme) {
    // For custom themes, use stored data as-is
    return stored.customizations;
  }
  
  // For curated themes, merge with theme defaults
  const themeDefaults = getThemeDefaults(stored.theme);
  
  return {
    ...themeDefaults,
    // Override only the customizable properties
    wallpaper: {
      ...themeDefaults.wallpaper,
      // Allow color overrides, but keep type/pattern from theme
      ...(stored.customizations.wallpaper?.color && { color: stored.customizations.wallpaper.color }),
      ...(stored.customizations.wallpaper?.gradientStart && { gradientStart: stored.customizations.wallpaper.gradientStart }),
      ...(stored.customizations.wallpaper?.gradientEnd && { gradientEnd: stored.customizations.wallpaper.gradientEnd }),
      ...(stored.customizations.wallpaper?.gradientDirection && { gradientDirection: stored.customizations.wallpaper.gradientDirection }),
      ...(stored.customizations.wallpaper?.patternColor && { patternColor: stored.customizations.wallpaper.patternColor }),
    },
    buttons: {
      ...themeDefaults.buttons,
      // Allow color overrides, but keep type/style from theme
      ...(stored.customizations.buttons?.backgroundColor && { backgroundColor: stored.customizations.buttons.backgroundColor }),
      ...(stored.customizations.buttons?.textColor && { textColor: stored.customizations.buttons.textColor }),
      ...(stored.customizations.buttons?.borderColor && { borderColor: stored.customizations.buttons.borderColor }),
    },
    text: {
      ...themeDefaults.text,
      // Allow color overrides, but keep fonts from theme
      ...(stored.customizations.text?.titleColor && { titleColor: stored.customizations.text.titleColor }),
      ...(stored.customizations.text?.pageTextColor && { pageTextColor: stored.customizations.text.pageTextColor }),
    },
    header: stored.customizations.header,
    socialIcons: stored.customizations.socialIcons,
    hideFooter: stored.customizations.hideFooter,
    profileImageUrl: stored.customizations.profileImageUrl,
  };
}
```

### 3. Theme Defaults

The backend should maintain a copy of the theme defaults. Here's the structure for reference:

```typescript
const THEME_DEFAULTS = {
  agate: {
    wallpaper: { type: 'gradient', gradientStart: '#1f1c2c', gradientEnd: '#928dab', gradientDirection: 220 },
    buttons: { type: 'solid', cornerRadius: 'pill', shadow: 'strong', backgroundColor: '#f8fafc', textColor: '#1f2937' },
    text: { titleFont: 'playfair', titleColor: '#f8fafc', titleSize: 'small', bodyFont: 'dm-sans', pageTextColor: '#e2e8f0' },
  },
  astrid: {
    wallpaper: { type: 'blur', color: '#0b0f1a', blur: 14, opacity: 0.94 },
    buttons: { type: 'glass', cornerRadius: 'pill', shadow: 'subtle', backgroundColor: '#7c3aed', textColor: '#f8f7ff', borderColor: '#c084fc' },
    text: { titleFont: 'poppins', titleColor: '#f5f3ff', titleSize: 'small', bodyFont: 'inter', pageTextColor: '#e0def7' },
  },
  // ... other themes
};
```

## Response Format

### `GET /api/admin/GetAppearance?pageId={pageId}`

Return the complete appearance data for editing:

```json
{
  "theme": "agate",
  "customTheme": false,
  "pageId": "page-uuid-here",
  "header": { ... },
  "wallpaper": {
    "type": "gradient",
    "gradientStart": "#1f1c2c",
    "gradientEnd": "#928dab",
    "gradientDirection": 220
  },
  "buttons": {
    "type": "solid",
    "cornerRadius": "pill",
    "shadow": "strong",
    "backgroundColor": "#f8fafc",
    "textColor": "#1f2937"
  },
  "text": {
    "titleFont": "playfair",
    "titleColor": "#f8fafc",
    "titleSize": "small",
    "bodyFont": "dm-sans",
    "pageTextColor": "#e2e8f0"
  },
  "socialIcons": [...],
  "hideFooter": false,
  "profileImageUrl": "..."
}
```

### `GET /api/public/GetUserProfile`

Return the complete rendered appearance (same format as above) for the public profile page.

## Examples

### Example 1: User selects "Agate" curated theme and changes colors

**Request to API:**
```json
{
  "theme": "agate",
  "customTheme": false,
  "wallpaper": {
    "type": "gradient",
    "gradientStart": "#3a2a4c",
    "gradientEnd": "#b8a8cb"
  },
  "buttons": {
    "backgroundColor": "#e8e8ff",
    "textColor": "#2a1a3a"
  },
  "text": {
    "titleColor": "#ffffff",
    "pageTextColor": "#f0f0ff"
  }
}
```

**Backend stores:** Theme name + color overrides only

**On retrieval:** Merge overrides with "agate" defaults for type, fonts, etc.

### Example 2: User selects "Custom" theme with full customization

**Request to API:**
```json
{
  "theme": "custom",
  "customTheme": true,
  "wallpaper": {
    "type": "pattern",
    "patternType": "dots",
    "color": "#1a1a2e",
    "patternColor": "#4a4a5e"
  },
  "buttons": {
    "type": "outline",
    "cornerRadius": "pill",
    "shadow": "none",
    "backgroundColor": "#ff6b6b",
    "textColor": "#ffffff",
    "borderColor": "#ff6b6b"
  },
  "text": {
    "titleFont": "montserrat",
    "titleColor": "#ffffff",
    "titleSize": "large",
    "bodyFont": "inter",
    "pageTextColor": "#e0e0e0"
  }
}
```

**Backend stores:** All properties as-is

**On retrieval:** Return stored data without merging with defaults

## Database Schema

The appearance data is stored as JSON. Required fields:
- `customTheme` (boolean) - indicates whether full customization is allowed
- `theme` (string) - the theme ID
- For curated themes: Only store the customizable properties (colors)
- For custom themes: Store all appearance properties

## Testing Checklist

- [ ] Create new profile with custom theme, verify all properties save and load
- [ ] Create profile with curated theme (e.g., "Agate"), verify theme defaults are used
- [ ] Modify colors on curated theme, verify colors save but other properties use defaults
- [ ] Switch from custom to curated theme, verify restrictions apply
- [ ] Switch from curated to custom theme, verify full customization available
- [ ] Verify public profile page renders correctly for both theme types

## Questions?

Contact the frontend team for clarification on:
- Theme default values
- Customization rules for specific themes
- Edge cases in data handling
