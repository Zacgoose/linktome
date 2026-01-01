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
        case 'honey':
          const honeySvg = `<svg xmlns='http://www.w3.org/2000/svg'><defs><pattern id='a' width='56.915' height='30' patternTransform='scale(2)' patternUnits='userSpaceOnUse'><rect width='100%' height='100%' fill='${bgColor}'/><path fill='${patternColor}' d='M10.023 0c1.263 1.051 2.418 2.246 3.592 3.462 1.874 1.944 3.808 3.938 6.287 5.404-.94.552-1.8 1.18-2.606 1.856-.844-.785-1.66-1.625-2.452-2.444C11.22 4.525 7.476.646 0 .645v1.71c6.752.001 10.089 3.451 13.615 7.107.771.8 1.568 1.619 2.397 2.401a62 62 0 0 0-1.785 1.776C10.785 10.099 7.056 6.646 0 6.645v1.708c6.38.002 9.706 3.085 13.038 6.513a51 51 0 0 1-1.878 1.86C8.773 14.73 5.373 12.646 0 12.646v1.707c4.679.001 7.63 1.687 9.86 3.514-.97.793-2.009 1.5-3.173 2.066C4.652 19.07 2.46 18.646 0 18.646v1.706c1.494 0 2.872.171 4.17.512-1.24.332-2.61.517-4.17.517v1.71c7.477-.001 11.22-3.881 14.842-7.63 3.527-3.654 6.864-7.106 13.615-7.106s10.084 3.452 13.612 7.106c3.622 3.75 7.363 7.63 14.842 7.63h.004v-1.71h-.006c-1.56 0-2.932-.186-4.171-.517 1.294-.34 2.675-.512 4.17-.512h.007v-1.706h-.004c-2.466 0-4.654.427-6.686 1.287-1.164-.567-2.206-1.273-3.175-2.066 2.23-1.827 5.182-3.514 9.86-3.514h.005v-1.708h-.004c-5.375 0-8.777 2.084-11.16 4.081a50 50 0 0 1-1.88-1.86c3.33-3.425 6.657-6.513 13.04-6.513h.004V6.647h-.004c-7.052 0-10.785 3.449-14.23 6.99a54 54 0 0 0-1.786-1.774 73 73 0 0 0 2.397-2.4c3.528-3.658 6.864-7.108 13.619-7.108h.004V.645c-7.479 0-11.225 3.88-14.848 7.633-.793.819-1.606 1.66-2.45 2.444a19.4 19.4 0 0 0-2.612-1.86c2.482-1.461 4.415-3.46 6.293-5.404C44.472 2.243 45.628 1.051 46.89 0h-2.564a56 56 0 0 0-1.644 1.638A57 57 0 0 0 41.04 0h-2.563c1.058.878 2.037 1.854 3.017 2.865a57 57 0 0 1-1.877 1.864C37.23 2.732 33.83.647 28.457.647c-5.375 0-8.776 2.085-11.163 4.082a58 58 0 0 1-1.879-1.864c.98-1.01 1.957-1.988 3.016-2.865H15.87a56 56 0 0 0-1.642 1.638A58 58 0 0 0 12.583 0zm18.432 2.355c4.678 0 7.63 1.684 9.86 3.511-.967.79-2.003 1.49-3.167 2.061-1.871-.796-4.05-1.281-6.693-1.282-2.65 0-4.825.486-6.696 1.282-1.164-.567-2.198-1.272-3.165-2.057 2.23-1.83 5.18-3.515 9.861-3.515m.002 10.29c-7.479 0-11.224 3.879-14.847 7.628-2.134 2.213-4.16 4.306-6.916 5.651a15.8 15.8 0 0 0-3.792-1.063l-.134-.022q-.406-.061-.827-.101l-.143-.011a31 31 0 0 0-.703-.052l-.234-.009A17 17 0 0 0 0 24.644v1.708q.393.001.775.019l.211.01q.318.018.636.045c.041.004.089.005.13.009q.374.036.737.088.07.014.143.024.333.05.655.116l.083.014q.37.079.735.171l.053.017q.753.197 1.466.475h.007a13.4 13.4 0 0 1 1.789.847h.004c.864.484 1.71 1.079 2.591 1.813h2.568q-.072-.068-.141-.136c.833-.782 1.624-1.603 2.396-2.402 3.531-3.657 6.868-7.108 13.62-7.108 6.75 0 10.083 3.453 13.61 7.106a70 70 0 0 0 2.401 2.408q-.074.067-.141.132h2.562c2.534-2.11 5.516-3.646 10.02-3.646h.005v-1.71h-.002c-2.646 0-4.825.489-6.697 1.28-2.756-1.349-4.781-3.438-6.918-5.651-3.62-3.752-7.366-7.628-14.84-7.628zm-.002 1.708c6.751 0 10.084 3.453 13.616 7.107 1.875 1.942 3.806 3.94 6.288 5.405-.938.554-1.8 1.182-2.608 1.86-.847-.788-1.664-1.632-2.455-2.452-3.62-3.749-7.366-7.63-14.84-7.63-7.478 0-11.225 3.881-14.845 7.63a62 62 0 0 1-2.455 2.449 19.3 19.3 0 0 0-2.606-1.857c2.478-1.465 4.411-3.46 6.287-5.404 3.53-3.657 6.864-7.108 13.618-7.108m-.001 10.291c-5.953 0-9.538 2.46-12.581 5.356h2.556c2.534-2.11 5.52-3.648 10.027-3.648 4.504 0 7.485 1.538 10.018 3.648h2.56c-3.038-2.895-6.628-5.356-12.58-5.356'/></pattern></defs><rect width='800%' height='800%' fill='url(#a)'/></svg>`;
          patternBg = `url("data:image/svg+xml,${encodeURIComponent(honeySvg)}")`;
          return {
            backgroundImage: patternBg,
          };
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
export const getLinkLayoutProps = (link: Pick<Link, 'layout' | 'thumbnail' | 'icon'>) => {
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
  usernameOpacity: 0.9,
  bioOpacity: 0.8,
  footerOpacity: 0.8,
};