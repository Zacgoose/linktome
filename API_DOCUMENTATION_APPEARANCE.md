# Appearance API Documentation

## Overview

This document describes the appearance customization system for the LinkToMe platform. The frontend handles all theme logic and filtering - the backend simply stores and returns the appearance data as provided.

## Key Concepts

### Theme Types

1. **Custom/Customizable Themes** (`type: 'customizable'`)
   - Full customization allowed
   - Examples: Custom, Air, Blocks, Lake, Mineral
   - Frontend sends complete appearance configuration
   - `customTheme: true` flag

2. **Curated Themes** (`type: 'curated'`)
   - Limited customization to preserve designer intent
   - Examples: Agate, Astrid, Aura, Bloom, Breeze, Honeycomb
   - Frontend filters data before sending (theme name + customizable properties only)
   - `customTheme: false` flag

**Note:** All theme logic, filtering, and defaults are handled by the frontend. The backend treats all appearance data uniformly.

## API Endpoints

### `PUT /api/admin/UpdateAppearance?pageId={pageId}`

Stores the appearance configuration exactly as received.

**Request Body:** JSON object containing appearance configuration

**Custom/Customizable Theme Example:**
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

**Curated Theme Example:**
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
  "socialIcons": [],
  "hideFooter": false,
  "profileImageUrl": "https://example.com/avatar.jpg"
}
```

**Response:** Success/error status

### `GET /api/admin/GetAppearance?pageId={pageId}`

Returns the stored appearance configuration exactly as it was saved.

**Response Format:**
```json
{
  "theme": "agate",
  "customTheme": false,
  "pageId": "page-uuid-here",
  "header": { ... },
  "wallpaper": { ... },
  "buttons": { ... },
  "text": { ... },
  "socialIcons": [...],
  "hideFooter": false,
  "profileImageUrl": "..."
}
```

### `GET /api/public/GetUserProfile`

Returns the complete user profile including appearance data, exactly as stored.

**Response includes:**
- username, displayName, bio, avatar
- appearance configuration (as stored)
- links and groups
- social icons

## Frontend Responsibilities

The frontend is responsible for:

1. **Theme Defaults:** Maintaining theme default configurations
2. **Filtering:** Sending only relevant data based on theme type
   - Custom themes: Send complete configuration
   - Curated themes: Send theme name + only customizable properties (colors)
3. **Rendering:** Merging stored data with theme defaults when displaying curated themes
4. **Validation:** Ensuring theme restrictions are enforced in the UI

## Data Storage

The backend stores appearance data as JSON without any transformation:
- Stores exactly what the frontend sends
- Returns exactly what was stored
- No merging, filtering, or validation of theme data

## Frontend Implementation Notes

### For Curated Themes

When saving a curated theme, the frontend uses `prepareAppearanceDataForApi()` to send only:
- Theme name and ID
- Customizable properties (colors only for curated themes)
- Header, social icons, and other non-theme-specific data

When loading a curated theme, the frontend:
- Retrieves stored data from API
- Merges with theme defaults to get complete configuration
- Applies stored color overrides to the theme defaults

### For Custom Themes

When saving a custom theme:
- Frontend sends complete appearance configuration
- All properties are stored

When loading a custom theme:
- Frontend uses stored data as-is
- No merging with defaults needed

## Testing Checklist

- [ ] Save and load custom theme with all properties
- [ ] Save and load curated theme with color customizations
- [ ] Verify curated theme color overrides persist
- [ ] Switch between custom and curated themes
- [ ] Verify public profile renders correctly for both theme types
- [ ] Test "Restore Theme Defaults" button for curated themes

## Questions?

Contact the frontend team for:
- Theme default values
- Customization rules for specific themes
- Frontend filtering logic
