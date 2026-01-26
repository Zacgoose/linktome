/**
 * Theme Customization Helper Utilities
 * 
 * This module contains helpers for managing theme customization restrictions
 * and preparing appearance data for API submission.
 */

import { AppearanceData, AppearanceTheme, THEME_PRESETS } from '@/types/links';

/**
 * Get the theme preset by ID
 */
export function getThemeById(themeId: string): AppearanceTheme | undefined {
  return THEME_PRESETS.find(theme => theme.id === themeId);
}

/**
 * Restore theme defaults for curated themes
 * Returns the default appearance configuration for a given theme
 */
export function restoreThemeDefaults(themeId: string): Partial<AppearanceData> | null {
  const theme = getThemeById(themeId);
  
  if (!theme || !theme.appearance) {
    return null;
  }
  
  return {
    wallpaper: theme.appearance.wallpaper ? { ...theme.appearance.wallpaper } : undefined,
    buttons: theme.appearance.buttons ? { ...theme.appearance.buttons } : undefined,
    text: theme.appearance.text ? { ...theme.appearance.text } : undefined,
  };
}

/**
 * Check if a specific property is customizable for a given theme
 * Returns true for themes without customization rules (backward compatibility)
 */
export function isPropertyCustomizable(
  themeId: string,
  property: keyof NonNullable<AppearanceTheme['customizableProperties']>
): boolean {
  const theme = getThemeById(themeId);
  if (!theme) {
    // Unknown theme - allow customization for safety
    return true;
  }
  
  if (!theme.customizableProperties) {
    // No customization rules defined - treat as fully customizable (legacy support)
    return true;
  }
  
  return theme.customizableProperties[property] === true;
}

/**
 * Get all customizable properties for a theme
 */
export function getCustomizableProperties(themeId: string) {
  const theme = getThemeById(themeId);
  return theme?.customizableProperties || {};
}

/**
 * Prepare appearance data for API submission based on theme type
 * 
 * For curated themes: Send only theme name + customizable properties
 * For custom themes: Send all configuration options
 * 
 * @param appearanceData - The complete appearance data from the form
 * @returns Object ready to be sent to the API
 */
export function prepareAppearanceDataForApi(appearanceData: AppearanceData): AppearanceData {
  const theme = getThemeById(appearanceData.theme);
  
  // If no theme found or it's a custom theme, send everything
  if (!theme || theme.type === 'customizable') {
    return {
      ...appearanceData,
      // Include a flag to indicate this is a custom/fully customizable theme
      customTheme: true,
    };
  }

  // For curated themes, only send customizable properties
  const customizable = theme.customizableProperties || {};
  const themePreset = theme.appearance || {};
  
  // Ensure theme has required appearance defaults
  if (!themePreset.wallpaper || !themePreset.buttons || !themePreset.text) {
    console.warn(`Theme ${appearanceData.theme} is missing appearance defaults. Falling back to full customization.`);
    return {
      ...appearanceData,
      customTheme: true,
    };
  }
  
  // Start with base data that's always sent
  const apiData: AppearanceData = {
    theme: appearanceData.theme,
    customTheme: false,
    header: appearanceData.header,
    socialIcons: appearanceData.socialIcons,
    hideFooter: appearanceData.hideFooter,
    pageId: appearanceData.pageId,
    
    // Use theme defaults as base (safe to use non-null assertion after check above)
    wallpaper: { ...themePreset.wallpaper },
    buttons: { ...themePreset.buttons },
    text: { ...themePreset.text },
  };

  // Override with user customizations only if allowed
  
  // Wallpaper customizations
  if (customizable.wallpaperColors && appearanceData.wallpaper) {
    // Allow color-related properties only
    if (appearanceData.wallpaper.color) {
      apiData.wallpaper.color = appearanceData.wallpaper.color;
    }
    if (appearanceData.wallpaper.gradientStart) {
      apiData.wallpaper.gradientStart = appearanceData.wallpaper.gradientStart;
    }
    if (appearanceData.wallpaper.gradientEnd) {
      apiData.wallpaper.gradientEnd = appearanceData.wallpaper.gradientEnd;
    }
    if (appearanceData.wallpaper.gradientDirection !== undefined) {
      apiData.wallpaper.gradientDirection = appearanceData.wallpaper.gradientDirection;
    }
    if (appearanceData.wallpaper.patternColor) {
      apiData.wallpaper.patternColor = appearanceData.wallpaper.patternColor;
    }
    if (appearanceData.wallpaper.opacity !== undefined) {
      apiData.wallpaper.opacity = appearanceData.wallpaper.opacity;
    }
  }
  
  if (customizable.wallpaperType && appearanceData.wallpaper) {
    // Allow changing wallpaper type and all related properties
    apiData.wallpaper = { ...appearanceData.wallpaper };
  }
  
  // Button customizations
  if (customizable.buttonColors && appearanceData.buttons) {
    if (appearanceData.buttons.backgroundColor) {
      apiData.buttons.backgroundColor = appearanceData.buttons.backgroundColor;
    }
    if (appearanceData.buttons.textColor) {
      apiData.buttons.textColor = appearanceData.buttons.textColor;
    }
    if (appearanceData.buttons.borderColor) {
      apiData.buttons.borderColor = appearanceData.buttons.borderColor;
    }
  }
  
  if (customizable.buttonStyle && appearanceData.buttons) {
    // Allow all button style properties
    apiData.buttons = { ...appearanceData.buttons };
  }
  
  // Text customizations
  if (customizable.textColors && appearanceData.text) {
    if (appearanceData.text.titleColor) {
      apiData.text.titleColor = appearanceData.text.titleColor;
    }
    if (appearanceData.text.pageTextColor) {
      apiData.text.pageTextColor = appearanceData.text.pageTextColor;
    }
  }
  
  if (customizable.fonts && appearanceData.text) {
    // Allow font family changes
    if (appearanceData.text.titleFont) {
      apiData.text.titleFont = appearanceData.text.titleFont;
    }
    if (appearanceData.text.bodyFont) {
      apiData.text.bodyFont = appearanceData.text.bodyFont;
    }
  }
  
  // Header layout is always customizable if specified
  if (customizable.headerLayout && appearanceData.header) {
    apiData.header = { ...appearanceData.header };
  }
  
  // Profile image is always sent
  if (appearanceData.profileImageUrl) {
    apiData.profileImageUrl = appearanceData.profileImageUrl;
  }
  
  return apiData;
}

/**
 * Check if user should be able to modify a wallpaper property
 */
export function canModifyWallpaperProperty(
  themeId: string,
  property: 'type' | 'color' | 'gradient' | 'pattern' | 'image' | 'video'
): boolean {
  const customizable = getCustomizableProperties(themeId);
  
  switch (property) {
    case 'type':
      return customizable.wallpaperType === true;
    case 'color':
    case 'gradient':
    case 'pattern':
      return customizable.wallpaperColors === true || customizable.wallpaperType === true;
    case 'image':
    case 'video':
      return customizable.wallpaperType === true;
    default:
      return false;
  }
}

/**
 * Check if user should be able to modify a button property
 */
export function canModifyButtonProperty(
  themeId: string,
  property: 'type' | 'style' | 'color'
): boolean {
  const customizable = getCustomizableProperties(themeId);
  
  switch (property) {
    case 'type':
    case 'style':
      return customizable.buttonStyle === true;
    case 'color':
      return customizable.buttonColors === true || customizable.buttonStyle === true;
    default:
      return false;
  }
}

/**
 * Check if user should be able to modify a text property
 */
export function canModifyTextProperty(
  themeId: string,
  property: 'font' | 'color'
): boolean {
  const customizable = getCustomizableProperties(themeId);
  
  switch (property) {
    case 'font':
      return customizable.fonts === true;
    case 'color':
      return customizable.textColors === true;
    default:
      return false;
  }
}
