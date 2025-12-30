import React from 'react';
import {
  Instagram,
  YouTube,
  Twitter,
  Facebook,
  LinkedIn,
  Email,
  WhatsApp,
  MusicNote,
  Forum,
  Link as LinkIcon,
} from '@mui/icons-material';
import { WallpaperStyle, ButtonStyle, TextStyle, Link } from '@/types/links';

// Font family mapping
export const FONT_FAMILIES: Record<string, string> = {
  'inter': 'Inter, sans-serif',
  'space-mono': '"Space Mono", monospace',
  'poppins': 'Poppins, sans-serif',
  'roboto': 'Roboto, sans-serif',
  'playfair': '"Playfair Display", serif',
  'oswald': 'Oswald, sans-serif',
  'lato': 'Lato, sans-serif',
  'montserrat': 'Montserrat, sans-serif',
  'raleway': 'Raleway, sans-serif',
  'dm-sans': '"DM Sans", sans-serif',
  'default': 'Inter, sans-serif',
  'serif': 'Georgia, serif',
  'mono': '"Courier New", monospace',
};

/**
 * Get CSS font-family string from font value
 */
export const getFontFamily = (font?: string): string => {
  return FONT_FAMILIES[font || 'inter'] || FONT_FAMILIES.inter;
};

/**
 * Get background style object from wallpaper settings
 */
export const getBackgroundStyle = (
  wallpaper?: WallpaperStyle,
  customGradient?: { start: string; end: string }
): React.CSSProperties => {
  if (!wallpaper) {
    // Fallback to legacy gradient support
    if (customGradient) {
      return {
        background: `linear-gradient(180deg, ${customGradient.start} 0%, ${customGradient.end} 100%)`,
      };
    }
    return { background: '#ffffff' };
  }
  
  switch (wallpaper.type) {
    case 'fill':
      return { background: wallpaper.color || '#ffffff' };
      
    case 'gradient':
      const direction = wallpaper.gradientDirection || 180;
      return {
        background: `linear-gradient(${direction}deg, ${wallpaper.gradientStart || '#667eea'} 0%, ${wallpaper.gradientEnd || '#764ba2'} 100%)`,
      };
      
    case 'blur':
      return {
        background: wallpaper.color || '#ffffff',
        backdropFilter: `blur(${wallpaper.blur || 10}px)`,
      };
      
    case 'pattern':
      const patternColor = wallpaper.patternColor || '#00000010';
      const bgColor = wallpaper.color || '#ffffff';
      let patternBg = bgColor;
      let backgroundSize: string | undefined;
      
      switch (wallpaper.patternType) {
        case 'dots':
          patternBg = `radial-gradient(${patternColor} 2px, transparent 2px), ${bgColor}`;
          backgroundSize = '20px 20px';
          break;
        case 'grid':
          patternBg = `linear-gradient(${patternColor} 1px, transparent 1px), linear-gradient(90deg, ${patternColor} 1px, transparent 1px), ${bgColor}`;
          backgroundSize = '20px 20px';
          break;
        case 'lines':
          patternBg = `repeating-linear-gradient(0deg, ${patternColor}, ${patternColor} 1px, transparent 1px, transparent 20px), ${bgColor}`;
          break;
        case 'waves':
          patternBg = `repeating-radial-gradient(circle at 0 0, transparent 0, ${bgColor} 20px), repeating-linear-gradient(${patternColor}, ${patternColor})`;
          break;
        case 'geometric':
          patternBg = `linear-gradient(30deg, ${patternColor} 12%, transparent 12.5%, transparent 87%, ${patternColor} 87.5%, ${patternColor}), linear-gradient(150deg, ${patternColor} 12%, transparent 12.5%, transparent 87%, ${patternColor} 87.5%, ${patternColor}), linear-gradient(30deg, ${patternColor} 12%, transparent 12.5%, transparent 87%, ${patternColor} 87.5%, ${patternColor}), linear-gradient(150deg, ${patternColor} 12%, transparent 12.5%, transparent 87%, ${patternColor} 87.5%, ${patternColor}), ${bgColor}`;
          backgroundSize = '40px 70px';
          break;
      }
      
      return {
        background: patternBg,
        backgroundSize,
      };
      
    case 'image':
      return {
        backgroundImage: `url(${wallpaper.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
      
    case 'video':
      // Video backgrounds handled separately with video element
      return { background: 'transparent' };
      
    default:
      return { background: '#ffffff' };
  }
};

/**
 * Get button style object from button settings
 */
export const getButtonStyle = (buttons?: ButtonStyle): React.CSSProperties => {
  if (!buttons) {
    return {
      borderRadius: '8px',
      backgroundColor: '#e4e5e6',
      color: '#010101',
    };
  }
  
  const cornerRadius = buttons.cornerRadius === 'square' ? '0px' : 
                       buttons.cornerRadius === 'pill' ? '50px' : '8px';
  
  let shadow = 'none';
  switch (buttons.shadow) {
    case 'subtle':
      shadow = '0 2px 4px rgba(0,0,0,0.1)';
      break;
    case 'strong':
      shadow = '0 4px 12px rgba(0,0,0,0.2)';
      break;
    case 'hard':
      shadow = '4px 4px 0px rgba(0,0,0,0.8)';
      break;
  }
  
  const baseStyle: React.CSSProperties = {
    borderRadius: cornerRadius,
    boxShadow: shadow,
    color: buttons.textColor || '#010101',
    transition: 'all 0.2s ease',
  };
  
  switch (buttons.type) {
    case 'solid':
      return {
        ...baseStyle,
        backgroundColor: buttons.backgroundColor || '#e4e5e6',
        border: 'none',
      };
    case 'glass':
      return {
        ...baseStyle,
        backgroundColor: `${buttons.backgroundColor || '#ffffff'}80`,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${buttons.borderColor || '#ffffff40'}`,
      };
    case 'outline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        border: `2px solid ${buttons.borderColor || buttons.backgroundColor || '#000000'}`,
      };
    default:
      return {
        ...baseStyle,
        backgroundColor: buttons.backgroundColor || '#e4e5e6',
      };
  }
};

/**
 * Animation keyframes CSS string
 */
export const ANIMATION_KEYFRAMES = `
@keyframes link-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
@keyframes link-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
@keyframes link-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
@keyframes link-glow {
  0%, 100% { box-shadow: 0 0 5px rgba(0,0,0,0.2); }
  50% { box-shadow: 0 0 20px rgba(0,0,0,0.4); }
}
`;

/**
 * Get animation style for a link
 */
export const getAnimationStyle = (animation?: string): React.CSSProperties => {
  switch (animation) {
    case 'shake':
      return { animation: 'link-shake 0.5s ease-in-out infinite' };
    case 'pulse':
      return { animation: 'link-pulse 2s ease-in-out infinite' };
    case 'bounce':
      return { animation: 'link-bounce 1s ease-in-out infinite' };
    case 'glow':
      return { animation: 'link-glow 2s ease-in-out infinite' };
    default:
      return {};
  }
};

/**
 * Get social icon component by platform name
 */
export const getSocialIcon = (platform: string, fontSize: 'small' | 'medium' | 'inherit' = 'small'): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    instagram: <Instagram fontSize={fontSize} />,
    youtube: <YouTube fontSize={fontSize} />,
    twitter: <Twitter fontSize={fontSize} />,
    facebook: <Facebook fontSize={fontSize} />,
    linkedin: <LinkedIn fontSize={fontSize} />,
    email: <Email fontSize={fontSize} />,
    whatsapp: <WhatsApp fontSize={fontSize} />,
    spotify: <MusicNote fontSize={fontSize} />,
    discord: <Forum fontSize={fontSize} />,
    tiktok: <MusicNote fontSize={fontSize} />,
  };
  return icons[platform?.toLowerCase()] || <LinkIcon fontSize={fontSize} />;
};

/**
 * Determine if a background color is dark (for text color contrast)
 */
export const isDarkBackground = (wallpaper?: WallpaperStyle): boolean => {
  if (!wallpaper) return false;
  
  // Gradient and image backgrounds are typically dark
  if (wallpaper.type === 'gradient' || wallpaper.type === 'image' || wallpaper.type === 'video') {
    return true;
  }
  
  // Check fill color brightness
  if (wallpaper.color) {
    const hex = wallpaper.color.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.5;
    }
  }
  
  return false;
};

/**
 * Get text color based on background darkness
 */
export const getTextColor = (
  wallpaper?: WallpaperStyle,
  textColor?: string,
  isCard?: boolean
): string => {
  if (isCard) return textColor || '#010101';
  return isDarkBackground(wallpaper) ? '#ffffff' : (textColor || '#010101');
};

/**
 * Get link layout properties
 */
export const getLinkLayoutProps = (link: Link) => {
  const isFeatured = link.layout === 'featured';
  const hasThumbnail = link.thumbnail || link.icon;
  const thumbnailPosition = link.layout === 'thumbnail-left' ? 'left' : 
                           link.layout === 'thumbnail-right' ? 'right' : undefined;
  
  return {
    isFeatured,
    hasThumbnail,
    thumbnailPosition,
  };
};

/**
 * Default appearance values
 */
export const DEFAULT_WALLPAPER: WallpaperStyle = {
  type: 'fill',
  color: '#ffffff',
};

export const DEFAULT_BUTTONS: ButtonStyle = {
  type: 'solid',
  cornerRadius: 'rounded',
  shadow: 'none',
  backgroundColor: '#e4e5e6',
  textColor: '#010101',
};

export const DEFAULT_TEXT: TextStyle = {
  titleFont: 'inter',
  titleColor: '#010101',
  titleSize: 'small',
  bodyFont: 'inter',
  pageTextColor: '#010101',
  buttonTextColor: '#010101',
};