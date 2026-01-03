// Link Types
export interface Link {
  id: string;
  title: string;
  url: string;
  order: number;
  active: boolean;
  icon?: string;
  thumbnail?: string;
  thumbnailType?: 'icon' | 'image' | 'emoji';
  layout?: 'classic' | 'featured' | 'thumbnail-left' | 'thumbnail-right';
  animation?: 'none' | 'shake' | 'pulse' | 'bounce' | 'glow';
  schedule?: {
    enabled: boolean;
    startDate?: string;
    endDate?: string;
    timezone?: string;
  };
  lock?: {
    enabled: boolean;
    type?: 'code' | 'age' | 'sensitive';
    code?: string;
    message?: string;
  };
  clicks?: number;
  clicksTrend?: 'up' | 'down' | 'neutral';
  groupId?: string | null;
}

export interface LinkGroup {
  id: string;
  title: string;
  order: number;
  active: boolean;
  layout?: 'stack' | 'grid' | 'carousel';
  collapsed?: boolean;
}

export interface LinksResponse {
  links: Link[];
  groups: LinkGroup[];
}

// Appearance Types
export interface AppearanceTheme {
  id: string;
  name: string;
  type: 'customizable' | 'curated';
  preview?: string;
  isPro?: boolean;
  appearance?: Partial<AppearanceData>;
}

export interface WallpaperStyle {
  type: 'fill' | 'gradient' | 'blur' | 'pattern' | 'image' | 'video';
  color?: string;
  gradientStart?: string;
  gradientEnd?: string;
  gradientDirection?: number;
  patternType?: 'grid' | 'dots' | 'lines' | 'waves' | 'geometric' | 'honey';
  patternColor?: string;
  imageUrl?: string;
  videoUrl?: string;
  blur?: number;
  opacity?: number;
}

export interface ButtonStyle {
  type: 'solid' | 'glass' | 'outline';
  cornerRadius: 'square' | 'rounded' | 'pill'; // 0, 8, 50
  shadow: 'none' | 'subtle' | 'strong' | 'hard';
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
  hoverEffect?: 'none' | 'lift' | 'glow' | 'fill';
}

export interface TextStyle {
  titleFont: string;
  titleColor: string;
  titleSize: 'small' | 'large';
  bodyFont: string;
  pageTextColor: string;
  usernameOpacity?: number;
  bioOpacity?: number;
  footerOpacity?: number;
}

export interface HeaderStyle {
  profileImageLayout: 'classic' | 'hero';
  titleStyle: 'text' | 'logo';
  logoUrl?: string;
  displayName: string;
  bio?: string;
}

export interface SocialIcon {
  platform: string;
  url: string;
  order: number;
  active: boolean;
}

export interface AppearanceData {
  // Theme
  theme: string;
  customTheme?: boolean;
  
  // Header
  header: HeaderStyle;
  profileImageUrl?: string;
  socialIcons: SocialIcon[];
  
  // Wallpaper/Background
  wallpaper: WallpaperStyle;
  
  // Buttons
  buttons: ButtonStyle;
  
  // Text/Fonts
  text: TextStyle;
  
  // Footer
  hideFooter: boolean;
  
  // Legacy support (for backwards compatibility)
  buttonStyle?: string;
  fontFamily?: string;
  layoutStyle?: string;
  colors?: {
    primary: string;
    secondary: string;
    background: string;
    buttonBackground: string;
    buttonText: string;
  };
  customGradient?: {
    start: string;
    end: string;
  };
}

// Profile Types for Preview
export interface ProfileData {
  username: string;
  displayName: string;
  bio?: string;
  profileImageUrl?: string;
  verified?: boolean;
}

// Font Options
export interface FontOption {
  value: string;
  label: string;
  fontFamily: string;
  previewUrl?: string;
  isPro?: boolean;
}

// Available fonts
export const FONT_OPTIONS: FontOption[] = [
  { value: 'inter', label: 'Inter', fontFamily: 'Inter, sans-serif' },
  { value: 'space-mono', label: 'Space Mono', fontFamily: '"Space Mono", monospace' },
  { value: 'poppins', label: 'Poppins', fontFamily: 'Poppins, sans-serif' },
  { value: 'roboto', label: 'Roboto', fontFamily: 'Roboto, sans-serif' },
  { value: 'playfair', label: 'Playfair Display', fontFamily: '"Playfair Display", serif', isPro: false },
  { value: 'oswald', label: 'Oswald', fontFamily: 'Oswald, sans-serif' },
  { value: 'lato', label: 'Lato', fontFamily: 'Lato, sans-serif' },
  { value: 'montserrat', label: 'Montserrat', fontFamily: 'Montserrat, sans-serif' },
  { value: 'raleway', label: 'Raleway', fontFamily: 'Raleway, sans-serif', isPro: false },
  { value: 'dm-sans', label: 'DM Sans', fontFamily: '"DM Sans", sans-serif' },
];

// Theme presets
export const THEME_PRESETS: AppearanceTheme[] = [
  { id: 'custom', name: 'Custom', type: 'customizable' },
  {
    id: 'air',
    name: 'Air',
    type: 'customizable',
    appearance: {
      wallpaper: { type: 'gradient', gradientStart: '#d7e8ff', gradientEnd: '#f5f7fb', gradientDirection: 135 },
      buttons: {
        type: 'outline',
        cornerRadius: 'pill',
        shadow: 'subtle',
        backgroundColor: '#4a6cf7',
        textColor: '#1c2541',
        borderColor: '#4a6cf7',
      },
      text: {
        titleFont: 'poppins',
        titleColor: '#1c2541',
        titleSize: 'small',
        bodyFont: 'inter',
        pageTextColor: '#23335b',
      },
    },
  },
  {
    id: 'blocks',
    name: 'Blocks',
    type: 'customizable',
    appearance: {
      wallpaper: { type: 'pattern', patternType: 'grid', color: '#0b1021', patternColor: '#16213e' },
      buttons: {
        type: 'solid',
        cornerRadius: 'square',
        shadow: 'hard',
        backgroundColor: '#9ef01a',
        textColor: '#0b1021',
      },
      text: {
        titleFont: 'oswald',
        titleColor: '#e5e7eb',
        titleSize: 'small',
        bodyFont: 'inter',
        pageTextColor: '#cbd5e1',
      },
    },
  },
  {
    id: 'lake',
    name: 'Lake',
    type: 'customizable',
    appearance: {
      wallpaper: { type: 'pattern', patternType: 'waves', color: '#0b132b', patternColor: '#1c2541' },
      buttons: {
        type: 'glass',
        cornerRadius: 'rounded',
        shadow: 'subtle',
        backgroundColor: '#4cc9f0',
        textColor: '#e0f7fa',
        borderColor: '#a0e9ff',
      },
      text: {
        titleFont: 'dm-sans',
        titleColor: '#e0fbfc',
        titleSize: 'small',
        bodyFont: 'inter',
        pageTextColor: '#c7e3ff',
      },
      layoutStyle: 'card',
    },
  },
  {
    id: 'mineral',
    name: 'Mineral',
    type: 'customizable',
    appearance: {
      wallpaper: { type: 'fill', color: '#0f172a' },
      buttons: {
        type: 'outline',
        cornerRadius: 'rounded',
        shadow: 'subtle',
        backgroundColor: '#93c5fd',
        textColor: '#e2e8f0',
        borderColor: '#93c5fd',
      },
      text: {
        titleFont: 'space-mono',
        titleColor: '#e2e8f0',
        titleSize: 'small',
        bodyFont: 'inter',
        pageTextColor: '#cbd5e1',
      },
      layoutStyle: 'centered',
    },
  },
  {
    id: 'agate',
    name: 'Agate',
    type: 'customizable',
    isPro: false,
    appearance: {
      wallpaper: { type: 'gradient', gradientStart: '#1f1c2c', gradientEnd: '#928dab', gradientDirection: 220 },
      buttons: {
        type: 'solid',
        cornerRadius: 'pill',
        shadow: 'strong',
        backgroundColor: '#f8fafc',
        textColor: '#1f2937',
      },
      text: {
        titleFont: 'playfair',
        titleColor: '#f8fafc',
        titleSize: 'small',
        bodyFont: 'dm-sans',
        pageTextColor: '#e2e8f0',
      },
      layoutStyle: 'card',
    },
  },
  {
    id: 'astrid',
    name: 'Astrid',
    type: 'customizable',
    isPro: false,
    appearance: {
      wallpaper: { type: 'blur', color: '#0b0f1a', blur: 14, opacity: 0.94 },
      buttons: {
        type: 'glass',
        cornerRadius: 'pill',
        shadow: 'subtle',
        backgroundColor: '#7c3aed',
        textColor: '#f8f7ff',
        borderColor: '#c084fc',
      },
      text: {
        titleFont: 'poppins',
        titleColor: '#f5f3ff',
        titleSize: 'small',
        bodyFont: 'inter',
        pageTextColor: '#e0def7',
      },
      layoutStyle: 'centered',
    },
  },
  {
    id: 'aura',
    name: 'Aura',
    type: 'customizable',
    isPro: false,
    appearance: {
      wallpaper: { type: 'pattern', patternType: 'dots', color: '#0d1b2a', patternColor: '#415a77' },
      buttons: {
        type: 'outline',
        cornerRadius: 'pill',
        shadow: 'subtle',
        backgroundColor: '#fcbf49',
        textColor: '#0d1b2a',
        borderColor: '#fcbf49',
      },
      text: {
        titleFont: 'raleway',
        titleColor: '#e0e1dd',
        titleSize: 'small',
        bodyFont: 'inter',
        pageTextColor: '#c3c9d7',
      },
      layoutStyle: 'centered',
    },
  },
  {
    id: 'bloom',
    name: 'Bloom',
    type: 'customizable',
    isPro: false,
    appearance: {
      wallpaper: { type: 'gradient', gradientStart: '#ff9a9e', gradientEnd: '#fecfef', gradientDirection: 160 },
      buttons: {
        type: 'solid',
        cornerRadius: 'pill',
        shadow: 'subtle',
        backgroundColor: '#fffaf0',
        textColor: '#8c304d',
      },
      text: {
        titleFont: 'playfair',
        titleColor: '#5c1225',
        titleSize: 'small',
        bodyFont: 'inter',
        pageTextColor: '#6a2137',
      },
      layoutStyle: 'centered',
    },
  },
  {
    id: 'breeze',
    name: 'Breeze',
    type: 'customizable',
    isPro: false,
    appearance: {
      wallpaper: { type: 'pattern', patternType: 'lines', color: '#e6f1ff', patternColor: '#c1d6f5' },
      buttons: {
        type: 'outline',
        cornerRadius: 'rounded',
        shadow: 'none',
        backgroundColor: '#2b65ff',
        textColor: '#1d3a6d',
        borderColor: '#2b65ff',
      },
      text: {
        titleFont: 'montserrat',
        titleColor: '#0f172a',
        titleSize: 'small',
        bodyFont: 'inter',
        pageTextColor: '#243b53',
      },
      layoutStyle: 'card',
    },
  },
  {
    id: 'honeycomb',
    name: 'Honeycomb',
    type: 'customizable',
    isPro: false,
    appearance: {
      wallpaper: { type: 'pattern', patternType: 'honey', color: '#4E4E4E', patternColor: '#ECC94B' },
      buttons: {
        type: 'glass',
        cornerRadius: 'pill',
        shadow: 'subtle',
        backgroundColor: '#FDDC9D',
        textColor: '#000000',
        borderColor: '#fcbf49',
      },
      text: {
        titleFont: 'inter',
        titleColor: '#000000',
        titleSize: 'small',
        bodyFont: 'inter',
        pageTextColor: '#000000',
      },
      layoutStyle: 'centered',
    },
  },
];

// Pattern options
export const PATTERN_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'dots', label: 'Dots' },
  { value: 'lines', label: 'Lines' },
  { value: 'waves', label: 'Waves' },
  { value: 'geometric', label: 'Geometric' },
  { value: 'honey', label: 'Honeycomb' },
];

// Social platform options
export const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: 'Instagram' },
  { value: 'tiktok', label: 'TikTok', icon: 'MusicNote' },
  { value: 'youtube', label: 'YouTube', icon: 'YouTube' },
  { value: 'twitter', label: 'Twitter/X', icon: 'Twitter' },
  { value: 'facebook', label: 'Facebook', icon: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'LinkedIn' },
  { value: 'email', label: 'Email', icon: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'WhatsApp' },
  { value: 'spotify', label: 'Spotify', icon: 'MusicNote' },
  { value: 'discord', label: 'Discord', icon: 'Forum' },
];

/**
 * Link operation types for bulk updates
 */
export interface LinkOperation extends Partial<Link> {
  operation: 'add' | 'update' | 'remove';
}

export interface GroupOperation extends Partial<LinkGroup> {
  operation: 'add' | 'update' | 'remove';
}

export interface UpdateLinksRequest {
  links?: LinkOperation[];
  groups?: GroupOperation[];
}

// Default values
export const DEFAULT_APPEARANCE: AppearanceData = {
  theme: 'custom',
  customTheme: true,
  header: {
    profileImageLayout: 'classic',
    titleStyle: 'text',
    displayName: '@username',
  },
  socialIcons: [],
  wallpaper: {
    type: 'fill',
    color: '#ffffff',
  },
  buttons: {
    type: 'solid',
    cornerRadius: 'rounded',
    shadow: 'none',
    backgroundColor: '#e4e5e6',
    textColor: '#010101',
  },
  text: {
    titleFont: 'inter',
    titleColor: '#010101',
    titleSize: 'small',
    bodyFont: 'inter',
    pageTextColor: '#010101',
  },
  hideFooter: false,
};
