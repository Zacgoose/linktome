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
}

export interface WallpaperStyle {
  type: 'fill' | 'gradient' | 'blur' | 'pattern' | 'image' | 'video';
  color?: string;
  gradientStart?: string;
  gradientEnd?: string;
  gradientDirection?: number;
  patternType?: 'grid' | 'dots' | 'lines' | 'waves' | 'geometric';
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
  buttonTextColor: string;
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
  { value: 'playfair', label: 'Playfair Display', fontFamily: '"Playfair Display", serif', isPro: true },
  { value: 'oswald', label: 'Oswald', fontFamily: 'Oswald, sans-serif' },
  { value: 'lato', label: 'Lato', fontFamily: 'Lato, sans-serif' },
  { value: 'montserrat', label: 'Montserrat', fontFamily: 'Montserrat, sans-serif' },
  { value: 'raleway', label: 'Raleway', fontFamily: 'Raleway, sans-serif', isPro: true },
  { value: 'dm-sans', label: 'DM Sans', fontFamily: '"DM Sans", sans-serif' },
];

// Theme presets
export const THEME_PRESETS: AppearanceTheme[] = [
  { id: 'custom', name: 'Custom', type: 'customizable' },
  { id: 'air', name: 'Air', type: 'customizable', preview: '/themes/air.webp' },
  { id: 'blocks', name: 'Blocks', type: 'customizable', preview: '/themes/blocks.webp' },
  { id: 'lake', name: 'Lake', type: 'customizable', preview: '/themes/lake.webp' },
  { id: 'mineral', name: 'Mineral', type: 'customizable', preview: '/themes/mineral.webp' },
  { id: 'agate', name: 'Agate', type: 'customizable', preview: '/themes/agate.webp', isPro: true },
  { id: 'astrid', name: 'Astrid', type: 'customizable', preview: '/themes/astrid.webp', isPro: true },
  { id: 'aura', name: 'Aura', type: 'customizable', preview: '/themes/aura.webp', isPro: true },
  { id: 'bloom', name: 'Bloom', type: 'customizable', preview: '/themes/bloom.webp', isPro: true },
  { id: 'breeze', name: 'Breeze', type: 'customizable', preview: '/themes/breeze.webp', isPro: true },
];

// Pattern options
export const PATTERN_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'dots', label: 'Dots' },
  { value: 'lines', label: 'Lines' },
  { value: 'waves', label: 'Waves' },
  { value: 'geometric', label: 'Geometric' },
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
    buttonTextColor: '#010101',
  },
  hideFooter: false,
};