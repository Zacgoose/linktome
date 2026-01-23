import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Stack,
  Button,
  Grid,
  Paper,
  TextField,
  Divider,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Collapse,
  Switch,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Save as SaveIcon,
  PhoneIphone as PhoneIcon,
  Palette as PaletteIcon,
  FormatColorFill as FillIcon,
  Gradient as GradientIcon,
  BlurOn as BlurIcon,
  GridOn as PatternIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  TextFields as TextIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Check as CheckIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  AspectRatio as LayoutIcon,
  LockOutlined as LockOutlinedIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import Autocomplete from '@mui/material/Autocomplete';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet, useApiPut } from '@/hooks/useApiQuery';
import PhonePreview from '@/components/PhonePreview';
import {
  AppearanceData,
  AppearanceTheme,
  WallpaperStyle,
  ButtonStyle,
  TextStyle,
  HeaderStyle,
  LinksResponse,
  FONT_OPTIONS,
  THEME_PRESETS,
  PATTERN_OPTIONS,
  DEFAULT_APPEARANCE,
} from '@/types/links';
import { useToast } from '@/context/ToastContext';
import { getBackgroundStyle, getButtonStyle } from '@/utils/appearanceUtils';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { usePremiumValidation } from '@/hooks/usePremiumValidation';
import { usePageContext } from '@/context/PageContext';
import { usePageValidation } from '@/hooks/usePageValidation';
import UpgradePrompt from '@/components/UpgradePrompt';
import NoPageDialog from '@/components/NoPageDialog';
import { canUseFontFamily, canUseTheme } from '@/utils/tierValidation';
import { useTierRestrictions, GlobalUpgradePrompt } from '@/components/TierRestrictionBadge';

interface SectionProps {
  title: string;
  id: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
}

function CollapsibleSection({ title, id, children, defaultExpanded = true }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 3, mb: 3 }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          mb: expanded ? 2 : 0,
        }}
      >
        <Typography variant="h6" fontWeight={600} id={id}>
          {title}
        </Typography>
        <IconButton size="small">
          {expanded ? <CollapseIcon /> : <ExpandIcon />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        {children}
      </Collapse>
    </Box>
  );
}

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

// Debounce utility
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const ColorPicker: React.FC<ColorPickerProps> = React.memo(({ label, value, onChange }) => {
  // Debounce the onChange callback to avoid rapid parent updates
  const debouncedOnChange = useMemo(() => debounce(onChange, 60), [onChange]);

  // For the text field, update immediately (no debounce)
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
      onChange(val);
    }
  }, [onChange]);

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={(theme) => ({
            width: 40,
            height: 40,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            position: 'relative',
            bgcolor: theme.palette.background.paper,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => debouncedOnChange(e.target.value)}
            style={{
              width: '150%',
              height: '150%',
              border: 'none',
              borderRadius: '12px',
              padding: 0,
              background: 'transparent',
              cursor: 'pointer',
              display: 'block',
              position: 'absolute',
              top: '-15%',
              left: '-15%',
            }}
          />
        </Box>
        <TextField
          size="small"
          value={value.toUpperCase()}
          onChange={handleTextChange}
          sx={{ width: 100 }}
          inputProps={{ style: { fontFamily: 'monospace' } }}
        />
      </Box>
    </Box>
  );
});
ColorPicker.displayName = 'ColorPicker';

interface ThemeCardProps {
  theme: AppearanceTheme;
  selected: boolean;
  onClick: () => void;
  userTier: any;
}

function ThemeCard({ theme, selected, onClick, userTier }: ThemeCardProps) {
  const renderPreview = () => {
    if (theme.id === 'custom') {
      return (
        <Box
          sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
          }}
        >
          <PaletteIcon sx={{ fontSize: 32, color: 'grey.500' }} />
        </Box>
      );
    }

    if (theme.preview) {
      return (
        <Box
          component="img"
          src={theme.preview}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      );
    }

    const wallpaperStyle = theme.appearance ? getBackgroundStyle(theme.appearance.wallpaper) : {};
    const buttonPreviewStyle = theme.appearance ? getButtonStyle(theme.appearance.buttons) : {};
    const titleColor = theme.appearance?.text?.titleColor || 'rgba(0,0,0,0.8)';
    const pageTextColor = theme.appearance?.text?.pageTextColor || 'rgba(0,0,0,0.6)';

    if (theme.appearance) {
      return (
        <Box
          sx={{
            ...wallpaperStyle,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            p: 1.5,
            position: 'relative',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.85)',
                border: '2px solid rgba(0,0,0,0.04)',
                boxShadow: '0 6px 14px rgba(0,0,0,0.15)',
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ height: 8, width: '70%', borderRadius: 6, bgcolor: titleColor, opacity: 0.9 }} />
              <Box sx={{ height: 6, width: '55%', borderRadius: 6, bgcolor: pageTextColor, opacity: 0.7, mt: 0.5 }} />
            </Box>
          </Box>

          <Stack spacing={0.7}>
            {[0, 1].map((item) => (
              <Box
                key={item}
                sx={{
                  height: 14,
                  width: '100%',
                  borderRadius: buttonPreviewStyle.borderRadius || '8px',
                  backgroundColor: buttonPreviewStyle.backgroundColor || 'rgba(255,255,255,0.9)',
                  border: buttonPreviewStyle.border,
                  boxShadow: buttonPreviewStyle.boxShadow,
                  opacity: 0.95,
                }}
              />
            ))}
          </Stack>

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 2,
              pointerEvents: 'none',
            }}
          />
        </Box>
      );
    }

    return <Box sx={{ height: '100%', bgcolor: 'grey.200' }} />;
  };

  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        opacity: (!canUseTheme(userTier, theme.isPro).allowed) ? 0.8 : 1,
        position: 'relative',
      }}
    >
      <Paper
        elevation={selected ? 4 : 1}
        sx={{
          aspectRatio: '4/5',
          borderRadius: 2,
          overflow: 'hidden',
          border: selected ? 3 : 1,
          borderColor: selected ? 'primary.main' : 'divider',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.light',
            transform: 'scale(1.02)',
          },
        }}
      >
        {renderPreview()}
        {theme.isPro && !canUseTheme(userTier, theme.isPro).allowed && (
          <Chip
            icon={<LockIcon sx={{ fontSize: 12 }} />}
            label="Premium"
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              fontSize: 10,
              height: 20,
              bgcolor: 'rgba(0,0,0,0.7)',
              color: 'white',
              '& .MuiChip-icon': { color: 'white' },
            }}
          />
        )}
        {selected && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 20,
              height: 20,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckIcon sx={{ fontSize: 14, color: 'white' }} />
          </Box>
        )}
      </Paper>
      <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 1 }}>
        {theme.name}
      </Typography>
    </Box>
  );
}

export default function AppearancePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [themeTab, setThemeTab] = useState(0);
  const { canAccess, showUpgrade, upgradeInfo, closeUpgradePrompt, userTier, openUpgradePrompt } = useFeatureGate();
  const { validateFeatures } = usePremiumValidation({ userTier, openUpgradePrompt });
  const { currentPage, pages } = usePageContext();
  const { hasPages, noPagesDialogOpen, handleNoPagesDialogClose } = usePageValidation();

  const { data, isLoading } = useApiGet<AppearanceData>({
    url: 'admin/GetAppearance',
    queryKey: `admin-appearance-${currentPage?.id || 'none'}`,
    params: currentPage?.id ? { pageId: currentPage.id } : undefined,
    enabled: !!currentPage,
  });

  const { data: linksData } = useApiGet<LinksResponse>({
    url: 'admin/GetLinks',
    queryKey: `admin-links-${currentPage?.id || 'none'}`,
    params: currentPage?.id ? { pageId: currentPage.id } : undefined,
    enabled: !!currentPage,
  });

  const { data: profileData } = useApiGet<UserProfile>({
      url: 'admin/GetProfile',
      queryKey: 'admin-profile',
    });

  const activeLinks = linksData?.links?.filter(link => link.active).sort((a, b) => a.order - b.order) || [];

  const [formData, setFormData] = useState<AppearanceData>(DEFAULT_APPEARANCE);
  
  // Check for tier restrictions
  const tierRestrictions = useTierRestrictions({ 
    appearance: data,
  });

  // Profile Information states
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

  const dataLoadedRef = useRef(false);
  const lastPageIdRef = useRef<string | undefined>(undefined);

  // Reset dataLoadedRef when page changes
  useEffect(() => {
    if (currentPage?.id !== lastPageIdRef.current) {
      dataLoadedRef.current = false;
      lastPageIdRef.current = currentPage?.id;
    }
  }, [currentPage?.id]);

  useEffect(() => {
    if (data && !dataLoadedRef.current) {
      setFormData({
        ...DEFAULT_APPEARANCE,
        ...data,
        wallpaper: { ...DEFAULT_APPEARANCE.wallpaper, ...data.wallpaper },
        buttons: { ...DEFAULT_APPEARANCE.buttons, ...data.buttons },
        text: { ...DEFAULT_APPEARANCE.text, ...data.text },
        header: { ...DEFAULT_APPEARANCE.header, ...data.header },
      });
      dataLoadedRef.current = true;
    }
  }, [data]);

  const updateAppearance = useApiPut({
    relatedQueryKeys: [`admin-appearance-${currentPage?.id || 'none'}`, 'admin-profile'],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare premium feature checks
    const selectedTheme = THEME_PRESETS.find(t => t.id === formData.theme);
    const titleFont = FONT_OPTIONS.find(f => f.value === formData.text.titleFont);
    const bodyFont = FONT_OPTIONS.find(f => f.value === formData.text.bodyFont);
    
    // Validate premium features using the hook
    const isValid = validateFeatures([
      {
        featureKey: 'customThemes',
        featureName: 'Premium Theme',
        isUsing: selectedTheme?.isPro === true,
      },
      {
        featureKey: 'premiumFonts',
        featureName: 'Premium Font (Title)',
        isUsing: titleFont?.isPro === true,
      },
      {
        featureKey: 'premiumFonts',
        featureName: 'Premium Font (Body)',
        isUsing: bodyFont?.isPro === true,
      },
      {
        featureKey: 'videoBackgrounds',
        featureName: 'Video Background',
        isUsing: formData.wallpaper.type === 'video',
      },
      {
        featureKey: 'videoBackgrounds',
        featureName: 'Image Background',
        isUsing: formData.wallpaper.type === 'image',
      },
      {
        featureKey: 'removeFooter',
        featureName: 'Remove Footer',
        isUsing: formData.hideFooter === true,
      },
      {
        featureKey: 'customLogos',
        featureName: 'Custom Logo (Title Style)',
        isUsing: formData.header.titleStyle === 'logo',
      },
      {
        featureKey: 'customLayouts',
        featureName: 'Hero Profile Layout',
        isUsing: formData.header.profileImageLayout === 'hero',
      },
      {
        featureKey: 'customLayouts',
        featureName: 'Large Title Size',
        isUsing: formData.text.titleSize === 'large',
      },
    ]);
    
    // If validation fails, don't save
    if (!isValid) {
      return;
    }
    
    // Include profile image URL in the data to save
    const dataToSave = {
      ...formData,
      profileImageUrl: data?.profileImageUrl, // Preserve the current profile image
    };
    
    updateAppearance.mutate({
      url: currentPage?.id ? `admin/UpdateAppearance?pageId=${currentPage.id}` : 'admin/UpdateAppearance',
      data: dataToSave as unknown as Record<string, unknown>,
    });
  };

  const updateWallpaper = (updates: Partial<WallpaperStyle>) => {
    setFormData(prev => ({
      ...prev,
      wallpaper: { ...prev.wallpaper, ...updates },
    }));
  };

  const updateButtons = (updates: Partial<ButtonStyle>) => {
    setFormData(prev => ({
      ...prev,
      buttons: { ...prev.buttons, ...updates },
    }));
  };

  const updateText = (updates: Partial<TextStyle>) => {
    setFormData(prev => ({
      ...prev,
      text: { ...prev.text, ...updates },
    }));
  };

  const updateHeader = (updates: Partial<HeaderStyle>) => {
    setFormData(prev => ({
      ...prev,
      header: { ...prev.header, ...updates },
    }));
  };

  const handleAvatarUrlSave = () => {
    if (!data || !currentPage?.id) return;

    updateAppearance.mutate({
      url: `admin/UpdateAppearance?pageId=${currentPage.id}`,
      data: {
        ...data,
        profileImageUrl: avatarUrl,
      },
    });
    
    setEditingAvatar(false);
  };

  const handleThemeSelect = (theme: AppearanceTheme) => {
    // Allow selection - validation will happen on save
    setFormData(prev => {
      const next = {
        ...prev,
        theme: theme.id,
        customTheme: theme.id === 'custom',
      };

      if (!theme.appearance) {
        return next;
      }

      return {
        ...next,
        wallpaper: theme.appearance.wallpaper ? { ...prev.wallpaper, ...theme.appearance.wallpaper } : next.wallpaper,
        buttons: theme.appearance.buttons ? { ...prev.buttons, ...theme.appearance.buttons } : next.buttons,
        text: theme.appearance.text ? { ...prev.text, ...theme.appearance.text } : next.text,
        header: theme.appearance.header ? { ...prev.header, ...theme.appearance.header } : next.header,
        layoutStyle: theme.appearance.layoutStyle ?? next.layoutStyle,
      };
    });
  };

  const previewAppearance = useMemo(() => {
    const { theme: _theme, customTheme: _customTheme, ...rest } = formData;
    return rest;
  }, [formData]);

  // Show loading state only while initially loading
  if (isLoading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  // If no current page, show empty state (dialog will handle prompting user)
  if (!currentPage) {
    return (
      <>
        <Head>
          <title>Appearance - LinkToMe</title>
        </Head>

        <AdminLayout>
          <Container maxWidth="xl" sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
              Appearance
            </Typography>
            <Box display="flex" justifyContent="center" alignItems="center" p={8}>
              <Typography variant="body1" color="text.secondary">
                No page selected
              </Typography>
            </Box>
          </Container>
        </AdminLayout>

        {/* No Pages Dialog */}
        <NoPageDialog 
          open={noPagesDialogOpen} 
          onClose={handleNoPagesDialogClose} 
        />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Appearance - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
            Appearance
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Customize how your profile looks to visitors
          </Typography>
          
          {/* Tier Restriction Warning */}
          <GlobalUpgradePrompt restrictions={tierRestrictions} />

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
            {/* Mobile Preview - Show at top on small screens */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <PhoneIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" color="text.secondary">
                  Live Preview
                </Typography>
              </Box>
              <PhonePreview
                appearance={previewAppearance}
                links={activeLinks}
                displayName={formData.header.displayName}
                username={profileData?.username}
                compact
              />
            </Box>

            {/* Left Column - Settings */}
            <Box sx={{ flex: 1, minWidth: 0, mr: { xs: 0, md: '360px' } }}>
              <Card>
                <CardContent sx={{ p: 4 }}>
                  <Box component="form" onSubmit={handleSubmit}>
                    {/* Profile Information Section */}
                    <CollapsibleSection title="Profile Information" id="profile-info">
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Update your display name, bio, and profile image
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        {/* Avatar with edit button */}
                        <Box
                          sx={{
                            position: 'relative',
                            width: 64,
                            height: 64,
                            mt: 1,
                          }}
                        >
                          <Avatar
                            src={data?.profileImageUrl}
                            sx={{ width: 64, height: 64 }}
                          >
                            {formData.header?.displayName?.charAt(0) || 'U'}
                          </Avatar>
                          <IconButton
                            size="small"
                            sx={{
                              position: 'absolute',
                              bottom: -4,
                              right: -4,
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': {
                                bgcolor: 'primary.dark',
                              },
                              width: 28,
                              height: 28,
                            }}
                            onClick={() => {
                              setEditingAvatar(true);
                              setAvatarUrl(data?.profileImageUrl || '');
                            }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <TextField
                            label="Display Name"
                            fullWidth
                            value={formData.header.displayName}
                            onChange={(e) => updateHeader({ displayName: e.target.value })}
                            sx={{ mb: 2 }}
                            size="small"
                            inputProps={{ maxLength: 30 }}
                            helperText={`${formData.header.displayName.length}/30 characters`}
                          />
                          <TextField
                            label="Bio"
                            fullWidth
                            multiline
                            rows={2}
                            value={formData.header.bio || ''}
                            onChange={(e) => updateHeader({ bio: e.target.value })}
                            placeholder="Tell people about yourself..."
                            size="small"
                          />
                        </Box>
                      </Box>
                    </CollapsibleSection>

                    {/* Header Section */}
                    <CollapsibleSection title="Header" id="header">
                      <Stack spacing={3}>
                        <Box>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 2 }}>
                            Profile image layout
                          </Typography>
                          <Grid container spacing={2}>
                            {['classic', 'hero'].map((layout) => (
                              <Grid item xs={6} key={layout}>
                                <Paper
                                  onClick={() => updateHeader({ profileImageLayout: layout as 'classic' | 'hero' })}
                                  sx={{
                                    p: 2,
                                    cursor: 'pointer',
                                    border: 2,
                                    borderColor: formData.header.profileImageLayout === layout ? 'primary.main' : 'transparent',
                                    '&:hover': {
                                      borderColor: 'primary.light',
                                    },
                                    position: 'relative',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      height: 56,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {layout === 'classic' ? (
                                      <PersonIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                                    ) : (
                                      <LayoutIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                                    )}
                                  </Box>
                                  <Typography align="center" variant="caption" display="block">
                                    {layout.charAt(0).toUpperCase() + layout.slice(1)}
                                  </Typography>
                                  {layout === 'hero' && (
                                    <Chip
                                      icon={<LockIcon sx={{ fontSize: 10 }} />}
                                      label="Pro"
                                      size="small"
                                      sx={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        fontSize: 10,
                                        height: 18,
                                      }}
                                    />
                                  )}
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        <Divider />

                        <Box>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 2 }}>
                            Title style
                          </Typography>
                          <Grid container spacing={2}>
                            {['text', 'logo'].map((style) => (
                              <Grid item xs={6} key={style}>
                                <Paper
                                  onClick={() => updateHeader({ titleStyle: style as 'text' | 'logo' })}
                                  sx={{
                                    p: 2,
                                    cursor: 'pointer',
                                    border: 2,
                                    borderColor: formData.header.titleStyle === style ? 'primary.main' : 'transparent',
                                    '&:hover': {
                                      borderColor: 'primary.light',
                                    },
                                    position: 'relative',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      height: 56,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {style === 'text' ? (
                                      <TextIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                                    ) : (
                                      <ImageIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                                    )}
                                  </Box>
                                  <Typography align="center" variant="caption" display="block">
                                    {style.charAt(0).toUpperCase() + style.slice(1)}
                                  </Typography>
                                  {style === 'logo' && (
                                    <Chip
                                      icon={<LockIcon sx={{ fontSize: 10 }} />}
                                      label="Pro"
                                      size="small"
                                      sx={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        fontSize: 10,
                                        height: 18,
                                      }}
                                    />
                                  )}
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      </Stack>
                    </CollapsibleSection>

                    {/* Theme Section */}
                    <CollapsibleSection title="Theme" id="theme">
                      <Tabs
                        value={themeTab}
                        onChange={(_, v) => setThemeTab(v)}
                        sx={{ mb: 2 }}
                      >
                        <Tab label="Customizable" />
                        <Tab label="Curated" />
                      </Tabs>

                      <Grid container spacing={2}>
                        {THEME_PRESETS
                          .filter(t => themeTab === 0 ? t.type === 'customizable' : t.type === 'curated')
                          .map((theme) => (
                            <Grid item xs={4} sm={3} md={4} lg={3} key={theme.id}>
                              <ThemeCard
                                theme={theme}
                                selected={formData.theme === theme.id}
                                onClick={() => handleThemeSelect(theme)}
                                userTier={userTier}
                              />
                            </Grid>
                          ))}
                      </Grid>
                    </CollapsibleSection>

                    {/* Wallpaper Section */}
                    <CollapsibleSection title="Wallpaper" id="wallpaper">
                      <Stack spacing={3}>
                        <Box>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 2 }}>
                            Wallpaper style
                          </Typography>
                          <Grid container spacing={1}>
                            {[
                              { type: 'fill', icon: <FillIcon />, label: 'Fill' },
                              { type: 'gradient', icon: <GradientIcon />, label: 'Gradient' },
                              { type: 'blur', icon: <BlurIcon />, label: 'Blur' },
                              { type: 'pattern', icon: <PatternIcon />, label: 'Pattern' },
                              { type: 'image', icon: <ImageIcon />, label: 'Image', pro: true },
                              { type: 'video', icon: <VideoIcon />, label: 'Video', pro: true },
                            ].map((item) => (
                              <Grid item xs={4} sm={2} key={item.type}>
                                <Paper
                                  onClick={() => updateWallpaper({ type: item.type as WallpaperStyle['type'] })}
                                  sx={{
                                    p: 1.5,
                                    cursor: 'pointer',
                                    border: 2,
                                    borderColor: formData.wallpaper.type === item.type ? 'primary.main' : 'transparent',
                                    '&:hover': {
                                      borderColor: 'primary.light',
                                    },
                                    textAlign: 'center',
                                    position: 'relative',
                                  }}
                                >
                                  <Box sx={{ color: 'grey.600', mb: 0.5 }}>{item.icon}</Box>
                                  <Typography variant="caption">{item.label}</Typography>
                                  {item.pro && (
                                    <Chip
                                      icon={<LockIcon sx={{ fontSize: 8 }} />}
                                      label="Pro"
                                      size="small"
                                      sx={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        fontSize: 8,
                                        height: 16,
                                        '& .MuiChip-label': { px: 0.5 },
                                      }}
                                    />
                                  )}
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        <Divider />

                        {/* Color options based on wallpaper type */}
                        {formData.wallpaper.type === 'fill' && (
                          <ColorPicker
                            label="Background color"
                            value={formData.wallpaper.color || '#ffffff'}
                            onChange={(color) => updateWallpaper({ color })}
                          />
                        )}

                        {formData.wallpaper.type === 'gradient' && (
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <ColorPicker
                                label="Start color"
                                value={formData.wallpaper.gradientStart || '#667eea'}
                                onChange={(color) => updateWallpaper({ gradientStart: color })}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <ColorPicker
                                label="End color"
                                value={formData.wallpaper.gradientEnd || '#764ba2'}
                                onChange={(color) => updateWallpaper({ gradientEnd: color })}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="body2" sx={{ mb: 1 }}>Direction</Typography>
                              <Slider
                                value={formData.wallpaper.gradientDirection || 180}
                                onChange={(_, v) => updateWallpaper({ gradientDirection: v as number })}
                                min={0}
                                max={360}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(v) => `${v}°`}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <Box
                                sx={{
                                  height: 80,
                                  borderRadius: 2,
                                  background: `linear-gradient(${formData.wallpaper.gradientDirection || 180}deg, ${formData.wallpaper.gradientStart || '#667eea'} 0%, ${formData.wallpaper.gradientEnd || '#764ba2'} 100%)`,
                                }}
                              />
                            </Grid>
                          </Grid>
                        )}

                        {formData.wallpaper.type === 'pattern' && (
                          <>
                            <Box>
                              <Typography variant="body2" sx={{ mb: 1 }}>Pattern type</Typography>
                              <ToggleButtonGroup
                                value={formData.wallpaper.patternType || 'grid'}
                                exclusive
                                onChange={(_, v) => v && updateWallpaper({ patternType: v })}
                                size="small"
                              >
                                {PATTERN_OPTIONS.map((opt) => (
                                  <ToggleButton key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </ToggleButton>
                                ))}
                              </ToggleButtonGroup>
                            </Box>
                            <Grid container spacing={2}>
                              <Grid item xs={6}>
                                <ColorPicker
                                  label="Background color"
                                  value={formData.wallpaper.color || '#ffffff'}
                                  onChange={(color) => updateWallpaper({ color })}
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <ColorPicker
                                  label="Pattern color"
                                  value={formData.wallpaper.patternColor || '#e0e0e0'}
                                  onChange={(color) => updateWallpaper({ patternColor: color })}
                                />
                              </Grid>
                            </Grid>
                          </>
                        )}

                        {formData.wallpaper.type === 'blur' && (
                          <>
                            <ColorPicker
                              label="Background color"
                              value={formData.wallpaper.color || '#ffffff'}
                              onChange={(color) => updateWallpaper({ color })}
                            />
                            <Box>
                              <Typography variant="body2" sx={{ mb: 1 }}>Blur amount</Typography>
                              <Slider
                                value={formData.wallpaper.blur || 10}
                                onChange={(_, v) => updateWallpaper({ blur: v as number })}
                                min={0}
                                max={30}
                                valueLabelDisplay="auto"
                              />
                            </Box>
                          </>
                        )}

                        {/* Suggested colors */}
                        <Box>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                            Suggested colors
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {['#A29E8B', '#6A6253', '#958065', '#FFFFFF', '#000000', '#667eea', '#ff6b6b', '#48c6ef'].map((color) => (
                              <Box
                                key={color}
                                onClick={() => updateWallpaper({ color })}
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '50%',
                                  bgcolor: color,
                                  border: formData.wallpaper.color === color ? 3 : 1,
                                  borderColor: formData.wallpaper.color === color ? 'primary.main' : 'divider',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  '&:hover': { transform: 'scale(1.1)' },
                                }}
                              />
                            ))}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Colors suggested based on your profile image
                          </Typography>
                        </Box>
                      </Stack>
                    </CollapsibleSection>

                    {/* Text Section */}
                    <CollapsibleSection title="Text" id="text">
                      <Stack spacing={3}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={FONT_OPTIONS}
                              getOptionLabel={(option) => option.label}
                              value={FONT_OPTIONS.find(f => f.value === formData.text.titleFont) || FONT_OPTIONS[0]}
                              onChange={(_, newValue) => {
                                if (newValue) {
                                  updateText({ titleFont: newValue.value });
                                }
                              }}
                              renderInput={(params) => (
                                <TextField {...params} label="Title font" />
                              )}
                              renderOption={(props, option) => (
                                <li {...props} style={{ fontFamily: option.fontFamily }}>
                                  {option.label}
                                  {option.isPro && !canUseFontFamily(userTier, option.isPro).allowed && (
                                    <LockOutlinedIcon sx={{ ml: 1, fontSize: 14, verticalAlign: 'middle' }} />
                                  )}
                                </li>
                              )}
                              isOptionEqualToValue={(option, value) => option.value === value.value}
                              disableClearable
                              slotProps={{
                                popper: {
                                  style: { zIndex: 1200 },
                                  disablePortal: false,
                                  modifiers: [
                                    {
                                      name: 'sameWidth',
                                      enabled: true,
                                      phase: 'beforeWrite',
                                      requires: ['computeStyles'],
                                      fn: ({ state }) => {
                                        state.styles.popper.width = `${state.rects.reference.width}px`;
                                      },
                                      effect: ({ state }) => {
                                        const referenceElement = state.elements.reference as HTMLElement;
                                        state.elements.popper.style.width = `${referenceElement.offsetWidth}px`;
                                      },
                                    },
                                  ],
                                },
                              }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={FONT_OPTIONS}
                              getOptionLabel={(option) => option.label}
                              value={FONT_OPTIONS.find(f => f.value === formData.text.bodyFont) || FONT_OPTIONS[0]}
                              onChange={(_, newValue) => {
                                if (newValue) {
                                  updateText({ bodyFont: newValue.value });
                                }
                              }}
                              renderInput={(params) => (
                                <TextField {...params} label="Body font" />
                              )}
                              renderOption={(props, option) => (
                                <li {...props} style={{ fontFamily: option.fontFamily }}>
                                  {option.label}
                                  {option.isPro && !canUseFontFamily(userTier, option.isPro).allowed && (
                                    <LockOutlinedIcon sx={{ ml: 1, fontSize: 14, verticalAlign: 'middle' }} />
                                  )}
                                </li>
                              )}
                              isOptionEqualToValue={(option, value) => option.value === value.value}
                              disableClearable
                              slotProps={{
                                popper: {
                                  style: { zIndex: 1200 },
                                  disablePortal: false,
                                  modifiers: [
                                    {
                                      name: 'sameWidth',
                                      enabled: true,
                                      phase: 'beforeWrite',
                                      requires: ['computeStyles'],
                                      fn: ({ state }) => {
                                        state.styles.popper.width = `${state.rects.reference.width}px`;
                                      },
                                      effect: ({ state }) => {
                                        const referenceElement = state.elements.reference as HTMLElement;
                                        state.elements.popper.style.width = `${referenceElement.offsetWidth}px`;
                                      },
                                    },
                                  ],
                                },
                              }}
                            />
                          </Grid>
                        </Grid>

                        <Divider />

                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <ColorPicker
                              label="Title color"
                              value={formData.text.titleColor}
                              onChange={(color) => updateText({ titleColor: color })}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <ColorPicker
                              label="Page text color"
                              value={formData.text.pageTextColor}
                              onChange={(color) => updateText({ pageTextColor: color })}
                            />
                          </Grid>
                        </Grid>

                        <Divider />

                        <Box>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 2 }}>
                            Title size
                          </Typography>
                          <Grid container spacing={2}>
                            {['small', 'large'].map((size) => (
                              <Grid item xs={6} key={size}>
                                <Paper
                                  onClick={() => updateText({ titleSize: size as 'small' | 'large' })}
                                  sx={{
                                    p: 2,
                                    cursor: 'pointer',
                                    border: 2,
                                    borderColor: formData.text.titleSize === size ? 'primary.main' : 'transparent',
                                    '&:hover': {
                                      borderColor: 'primary.light',
                                    },
                                    textAlign: 'center',
                                    position: 'relative',
                                  }}
                                >
                                  <Typography variant="body2">
                                    {size.charAt(0).toUpperCase() + size.slice(1)}
                                  </Typography>
                                  {size === 'large' && (
                                    <Chip
                                      icon={<LockIcon sx={{ fontSize: 10 }} />}
                                      label="Pro"
                                      size="small"
                                      sx={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        fontSize: 8,
                                        height: 16,
                                      }}
                                    />
                                  )}
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        <Divider />

                        <Box>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 2 }}>
                            Text opacity
                          </Typography>
                          
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                              Username opacity: {Math.round((formData.text.usernameOpacity ?? 0.9) * 100)}%
                            </Typography>
                            <Slider
                              value={formData.text.usernameOpacity ?? 0.9}
                              onChange={(_, v) => updateText({ usernameOpacity: v as number })}
                              min={0}
                              max={1}
                              step={0.05}
                              valueLabelDisplay="auto"
                              valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
                            />
                          </Box>

                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                              Bio opacity: {Math.round((formData.text.bioOpacity ?? 0.8) * 100)}%
                            </Typography>
                            <Slider
                              value={formData.text.bioOpacity ?? 0.8}
                              onChange={(_, v) => updateText({ bioOpacity: v as number })}
                              min={0}
                              max={1}
                              step={0.05}
                              valueLabelDisplay="auto"
                              valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
                            />
                          </Box>

                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                              Footer opacity: {Math.round((formData.text.footerOpacity ?? 0.8) * 100)}%
                            </Typography>
                            <Slider
                              value={formData.text.footerOpacity ?? 0.8}
                              onChange={(_, v) => updateText({ footerOpacity: v as number })}
                              min={0}
                              max={1}
                              step={0.05}
                              valueLabelDisplay="auto"
                              valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
                            />
                          </Box>
                        </Box>
                      </Stack>
                    </CollapsibleSection>

                    {/* Buttons Section */}
                    <CollapsibleSection title="Buttons" id="buttons">
                      <Stack spacing={3}>
                        <Box>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 2}} >
                            Button style
                          </Typography>
                          <Grid container spacing={2}>
                            {[
                              { type: 'solid', label: 'Solid' },
                              { type: 'glass', label: 'Glass', pro: false },
                              { type: 'outline', label: 'Outline' },
                            ].map((style) => (
                              <Grid item xs={4} key={style.type}>
                                <Paper
                                  onClick={() => !style.pro && updateButtons({ type: style.type as ButtonStyle['type'] })}
                                  sx={{
                                    p: 2,
                                    cursor: style.pro ? 'not-allowed' : 'pointer',
                                    border: 2,
                                    borderColor: formData.buttons.type === style.type ? 'primary.main' : 'transparent',
                                    opacity: style.pro ? 0.6 : 1,
                                    textAlign: 'center',
                                    position: 'relative',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      height: 38,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        px: 2,
                                        py: 0.5,
                                        borderRadius: 0.5,
                                        fontSize: 12,
                                        ...(style.type === 'solid' && {
                                          bgcolor: (theme) => theme.palette.background.paper,
                                        }),
                                        ...(style.type === 'glass' && {
                                          bgcolor: (theme) => theme.palette.background.paper,
                                          border: '1px solid rgba(255,255,255,0.3)',
                                        }),
                                        ...(style.type === 'outline' && {
                                          bgcolor: (theme) => theme.palette.background.paper,
                                          border: '2px solid',
                                          borderColor: 'grey.400',
                                        }),
                                      }}
                                    >
                                      {style.label}
                                    </Box>
                                  </Box>
                                  {style.pro && (
                                    <Chip
                                      icon={<LockIcon sx={{ fontSize: 10 }} />}
                                      label="Pro"
                                      size="small"
                                      sx={{
                                        position: 'absolute',
                                        top: 4,
                                        right: 4,
                                        fontSize: 8,
                                        height: 16,
                                      }}
                                    />
                                  )}
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        <Divider />

                        <Box>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>Corners</Typography>
                          <Grid container spacing={2} sx={{ mb: 1 }}>
                            {[
                              { value: 'square', label: 'Square', borderRadius: 0 },
                              { value: 'rounded', label: 'Rounded', borderRadius: 1 },
                              { value: 'pill', label: 'Pill', borderRadius: 999 },
                            ].map(opt => (
                              <Grid item xs={4} key={opt.value}>
                                <Button
                                  fullWidth
                                  variant={formData.buttons.cornerRadius === opt.value ? 'contained' : 'outlined'}
                                  onClick={() => updateButtons({ cornerRadius: opt.value as any })}
                                  sx={{
                                    borderRadius: opt.borderRadius,
                                    height: 44,
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    fontSize: 15,
                                    bgcolor: formData.buttons.cornerRadius === opt.value ? 'primary.main' : 'background.paper',
                                    color: formData.buttons.cornerRadius === opt.value ? 'primary.contrastText' : 'text.primary',
                                    boxShadow: formData.buttons.cornerRadius === opt.value ? 2 : 0,
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  {opt.label}
                                </Button>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        <Box>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 2 }}>Shadows</Typography>
                          <Grid container spacing={1}>
                            {['none', 'subtle', 'strong', 'hard'].map((shadow) => (
                              <Grid item xs={3} key={shadow}>
                                <Paper
                                  onClick={() => updateButtons({ shadow: shadow as ButtonStyle['shadow'] })}
                                  sx={{
                                    p: 1.5,
                                    cursor: 'pointer',
                                    border: 2,
                                    borderColor: formData.buttons.shadow === shadow ? 'primary.main' : 'transparent',
                                    textAlign: 'center',
                                  }}
                                >
                                  <Typography variant="caption">
                                    {shadow.charAt(0).toUpperCase() + shadow.slice(1)}
                                  </Typography>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        <Box>
                          <Typography variant="body2" fontWeight={500} sx={{ mb: 2 }}>Hover effect</Typography>
                          <Grid container spacing={1}>
                            {['none', 'lift', 'glow', 'fill'].map((effect) => (
                              <Grid item xs={3} key={effect}>
                                <Paper
                                  onClick={() => updateButtons({ hoverEffect: effect as ButtonStyle['hoverEffect'] })}
                                  sx={{
                                    p: 1.5,
                                    cursor: 'pointer',
                                    border: 2,
                                    borderColor: formData.buttons.hoverEffect === effect ? 'primary.main' : 'transparent',
                                    textAlign: 'center',
                                  }}
                                >
                                  <Typography variant="caption">
                                    {effect.charAt(0).toUpperCase() + effect.slice(1)}
                                  </Typography>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>

                        <Divider />

                        <Typography variant="body2" fontWeight={500}>Colors</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <ColorPicker
                              label="Button color"
                              value={formData.buttons.backgroundColor}
                              onChange={(color) => updateButtons({ backgroundColor: color })}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <ColorPicker
                              label="Text color"
                              value={formData.buttons.textColor}
                              onChange={(color) => updateButtons({ textColor: color })}
                            />
                          </Grid>
                        </Grid>
                      </Stack>
                    </CollapsibleSection>

                    {/* Footer Section */}
                    <CollapsibleSection title="Footer" id="footer" defaultExpanded={false}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography variant="body2">Hide LinkToMe footer</Typography>
                            <Chip
                              icon={<LockIcon sx={{ fontSize: 10 }} />}
                              label="Pro"
                              size="small"
                              sx={{ fontSize: 10, height: 18 }}
                            />
                          </Box>
                          <Switch
                            checked={formData.hideFooter}
                            onChange={(e) => setFormData(prev => ({ ...prev, hideFooter: e.target.checked }))}
                          />
                        </Box>
                      </Paper>
                    </CollapsibleSection>

                    {/* Save Button */}
                    <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        type="submit"
                        disabled={updateAppearance.isPending}
                        size="large"
                      >
                        {updateAppearance.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => router.push('/admin/dashboard')}
                        size="large"
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Right Column - Fixed Phone Preview (Desktop) */}
            <Box
              sx={{
                width: 320,
                flexShrink: 0,
                display: { xs: 'none', md: 'block' },
                position: 'fixed',
                right: 32,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1,
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <PhoneIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" color="text.secondary">
                  Live Preview
                </Typography>
              </Box>

              <PhonePreview
                appearance={previewAppearance}
                links={activeLinks}
                displayName={formData.header.displayName}
                username={profileData?.username}
              />

              {activeLinks.length === 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', textAlign: 'center', mt: 2 }}
                >
                  Add links to see them in the preview
                </Typography>
              )}
            </Box>
          </Box>
        </Container>
      </AdminLayout>
      
      {/* Avatar Edit Dialog */}
      <Dialog open={editingAvatar} onClose={() => setEditingAvatar(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Avatar URL</DialogTitle>
        <DialogContent>
          <TextField
            label="Avatar Image URL"
            fullWidth
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            helperText="Enter the URL of your avatar image"
            sx={{ mt: 2 }}
          />
          {avatarUrl && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Preview:
              </Typography>
              <Avatar
                src={avatarUrl}
                sx={{ width: 80, height: 80, mx: 'auto', mt: 1 }}
              >
                {formData.header?.displayName?.charAt(0) || 'U'}
              </Avatar>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingAvatar(false)}>Cancel</Button>
          <Button onClick={handleAvatarUrlSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* No Pages Dialog */}
      <NoPageDialog 
        open={noPagesDialogOpen} 
        onClose={handleNoPagesDialogClose} 
      />
      
      {/* Upgrade Prompt Dialog */}
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
