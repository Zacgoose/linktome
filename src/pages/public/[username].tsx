import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  Box, 
  Container, 
  Card, 
  CardContent, 
  Avatar, 
  Typography, 
  Button,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Collapse,
} from '@mui/material';
import {
  Lock,
  ExpandMore,
  ExpandLess,
  Warning,
} from '@mui/icons-material';
import { useState } from 'react';
import { useApiGet, useApiPost } from '@/hooks/useApiQuery';
import {
  getFontFamily,
  getBackgroundStyle,
  getButtonStyle,
  getAnimationStyle,
  getSocialIcon,
  isDarkBackground,
  getLinkLayoutProps,
  ANIMATION_KEYFRAMES,
} from '@/utils/appearanceUtils';
import type { 
  WallpaperStyle, 
  ButtonStyle, 
  TextStyle, 
  HeaderStyle,
} from '@/types/links';

// Types for public profile response
interface LinkLock {
  enabled: boolean;
  type?: 'code' | 'age' | 'sensitive';
  message?: string;
}

interface Link {
  id: string;
  title: string;
  url: string;
  order?: number;
  icon?: string;
  thumbnail?: string;
  thumbnailType?: 'icon' | 'image' | 'emoji';
  layout?: 'classic' | 'featured' | 'thumbnail-left' | 'thumbnail-right';
  animation?: 'none' | 'shake' | 'pulse' | 'bounce' | 'glow';
  groupId?: string | null;
  lock?: LinkLock;
  active?: boolean;
}

interface LinkGroup {
  id: string;
  title: string;
  order: number;
  layout?: 'stack' | 'grid' | 'carousel';
  collapsed?: boolean;
}

interface SocialIcon {
  id: string;
  platform: string;
  url: string;
  order: number;
}

interface Appearance {
  theme: string;
  header: HeaderStyle;
  wallpaper: WallpaperStyle;
  buttons: ButtonStyle;
  text: TextStyle;
  hideFooter: boolean;
  // Legacy support
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

interface PublicProfile {
  username: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  appearance: Appearance;
  socialIcons: SocialIcon[];
  links: Link[];
  groups: LinkGroup[];
}

// Link Button Component
interface LinkButtonProps {
  link: Link;
  buttons: ButtonStyle;
  bodyFontFamily: string;
  onLinkClick: (link: Link, e: React.MouseEvent) => void;
}

const LinkButton: React.FC<LinkButtonProps> = ({ link, buttons, bodyFontFamily, onLinkClick }) => {
  const buttonStyle = getButtonStyle(buttons);
  const animationStyle = getAnimationStyle(link.animation);
  const { isFeatured, hasThumbnail, thumbnailPosition } = getLinkLayoutProps(link);
  
  return (
    <Button
      variant="contained"
      size="large"
      fullWidth
      onClick={(e) => onLinkClick(link, e)}
      sx={{
        ...buttonStyle,
        ...animationStyle,
        color: `${buttons.textColor || 'inherit'} !important`,
        fontFamily: bodyFontFamily,
        py: isFeatured ? 3 : 1.5,
        px: 3,
        textTransform: 'none',
        justifyContent: thumbnailPosition ? 'flex-start' : 'center',
        flexDirection: thumbnailPosition === 'right' ? 'row-reverse' : 'row',
        gap: 2,
        '& .MuiSvgIcon-root': { color: buttons.textColor || 'inherit' },
        '& .MuiTypography-root': { color: buttons.textColor || 'inherit' },
        '& .MuiButton-startIcon > *:not(style), & .MuiButton-endIcon > *:not(style)': {
          color: buttons.textColor || 'inherit',
        },
        '&:hover': {
          opacity: 0.9,
          transform: buttons.hoverEffect === 'lift' ? 'translateY(-2px)' : 
                     buttonStyle.boxShadow?.includes('4px 4px') ? 'translate(2px, 2px)' : undefined,
        },
      }}
    >
      {/* Left thumbnail/icon */}
      {hasThumbnail && thumbnailPosition !== 'right' && (
        <Avatar 
          src={link.thumbnail || link.icon} 
          sx={{ width: isFeatured ? 48 : 32, height: isFeatured ? 48 : 32 }}
          variant="rounded"
        >
          {link.thumbnailType === 'emoji' ? link.thumbnail : undefined}
        </Avatar>
      )}
      
      {/* Lock icon */}
      {link.lock?.enabled && !hasThumbnail && (
        <Lock fontSize="small" />
      )}
      
      {/* Title */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: thumbnailPosition ? 'flex-start' : 'center',
        flex: thumbnailPosition ? 1 : undefined,
      }}>
        <Typography 
          variant={isFeatured ? 'h6' : 'body1'} 
          fontWeight={600}
          sx={{ color: 'inherit' }}
        >
          {link.title}
        </Typography>
      </Box>
      
      {/* Right thumbnail */}
      {hasThumbnail && thumbnailPosition === 'right' && (
        <Avatar 
          src={link.thumbnail || link.icon} 
          sx={{ width: isFeatured ? 48 : 32, height: isFeatured ? 48 : 32 }}
          variant="rounded"
        >
          {link.thumbnailType === 'emoji' ? link.thumbnail : undefined}
        </Avatar>
      )}
    </Button>
  );
};

export default function PublicProfile() {
  const router = useRouter();
  const { username } = router.query;
  
  const [lockDialog, setLockDialog] = useState<{ open: boolean; link: Link | null; code: string }>({
    open: false,
    link: null,
    code: '',
  });
  const [ageVerified, setAgeVerified] = useState(false);
  const [sensitiveAcknowledged, setSensitiveAcknowledged] = useState<Set<string>>(new Set());
  const [codeUnlocked, setCodeUnlocked] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { data: profile, isLoading } = useApiGet<PublicProfile>({
    url: 'public/GetUserProfile',
    queryKey: `public-profile-${username}`,
    params: { username: username as string },
    enabled: !!username,
  });

  // Mutation for tracking link clicks
  const trackClick = useApiPost({
    onError: (error) => console.error('Failed to track link click:', error),
  });

  // Mutation for verifying link codes
  const verifyCode = useApiPost<{ success: boolean }>({
    onError: (error) => console.error('Invalid code:', error),
  });

  const handleLinkClick = async (link: Link, e: React.MouseEvent) => {
    e.preventDefault();
    
    // Check for lock
    if (link.lock?.enabled) {
      switch (link.lock.type) {
        case 'code':
          if (!codeUnlocked.has(link.id)) {
            setLockDialog({ open: true, link, code: '' });
            return;
          }
          break;
        case 'age':
          if (!ageVerified) {
            setLockDialog({ open: true, link, code: '' });
            return;
          }
          break;
        case 'sensitive':
          if (!sensitiveAcknowledged.has(link.id)) {
            setLockDialog({ open: true, link, code: '' });
            return;
          }
          break;
      }
    }
    
    // Track the click (fire and forget)
    trackClick.mutate({
      url: 'public/TrackLinkClick',
      data: {
        linkId: link.id,
        username: username as string,
      },
    });
    
    // Navigate to the URL
    window.open(link.url, '_blank', 'noopener,noreferrer');
  };

  const handleUnlock = async () => {
    if (!lockDialog.link) return;
    
    const link = lockDialog.link;
    
    if (link.lock?.type === 'age') {
      setAgeVerified(true);
      setLockDialog({ open: false, link: null, code: '' });
      // Re-trigger click
      handleLinkClick(link, { preventDefault: () => {} } as React.MouseEvent);
    } else if (link.lock?.type === 'sensitive') {
      setSensitiveAcknowledged(prev => new Set(prev).add(link.id));
      setLockDialog({ open: false, link: null, code: '' });
      handleLinkClick(link, { preventDefault: () => {} } as React.MouseEvent);
    } else if (link.lock?.type === 'code') {
      // Verify code with API
      verifyCode.mutate(
        {
          url: 'public/VerifyLinkCode',
          data: {
            linkId: link.id,
            code: lockDialog.code,
          },
        },
        {
          onSuccess: (data) => {
            if (data.success) {
              setCodeUnlocked(prev => new Set(prev).add(link.id));
              setLockDialog({ open: false, link: null, code: '' });
              // Open the link directly since we just verified
              window.open(link.url, '_blank', 'noopener,noreferrer');
              // Track the click
              trackClick.mutate({
                url: 'public/TrackLinkClick',
                data: {
                  linkId: link.id,
                  username: username as string,
                },
              });
            }
          },
        }
      );
    }
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Don't render until router is ready and data is loaded
  if (!router.isReady || isLoading || !username) {
    return null;
  }

  // Show "not found" only after data fetch is complete and no profile exists
  if (!profile) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Container maxWidth="sm">
          <Card>
            <CardContent sx={{ p: 5, textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom>
                Profile Not Found
              </Typography>
              <Typography color="text.secondary" paragraph>
                The profile you are looking for does not exist.
              </Typography>
              <Button variant="contained" onClick={() => router.push('/')}>
                Go Home
              </Button>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  const { appearance, links, groups, socialIcons } = profile;
  const backgroundStyle = getBackgroundStyle(appearance.wallpaper, appearance.customGradient);
  const isLayoutCard = appearance.layoutStyle === 'card';
  const darkBg = isDarkBackground(appearance.wallpaper);
  const textColor = appearance.text?.pageTextColor || (darkBg ? '#ffffff' : '#010101');
  const titleFontFamily = getFontFamily(appearance.text?.titleFont);
  const bodyFontFamily = getFontFamily(appearance.text?.bodyFont);
  const usernameOpacity = appearance.text?.usernameOpacity ?? 0.9;
  const bioOpacity = appearance.text?.bioOpacity ?? 0.8;
  const footerOpacity = appearance.text?.footerOpacity ?? 0.8;
  
  // Separate links into grouped and ungrouped
  const ungroupedLinks = links.filter(link => !link.groupId);
  const groupedLinks = (groupId: string) => links.filter(link => link.groupId === groupId);
  
  // Sort groups by order
  const sortedGroups = [...(groups || [])].sort((a, b) => a.order - b.order);

  return (
    <>
      <Head>
        <title>{profile.displayName} - LinkToMe</title>
        <meta name="description" content={profile.bio || `Check out ${profile.displayName}'s links`} />
        <meta name="theme-color" content={appearance.wallpaper?.color || '#667eea'} />
        <style dangerouslySetInnerHTML={{ __html: ANIMATION_KEYFRAMES }} />
      </Head>
      
      {/* Video background */}
      {appearance.wallpaper?.type === 'video' && appearance.wallpaper.videoUrl && (
        <Box
          component="video"
          autoPlay
          loop
          muted
          playsInline
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: -1,
            opacity: appearance.wallpaper.opacity || 1,
          }}
        >
          <source src={appearance.wallpaper.videoUrl} type="video/mp4" />
        </Box>
      )}
      
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          py: 4,
          fontFamily: bodyFontFamily,
          ...backgroundStyle,
        }}
      >
        <Container maxWidth="sm">
          {isLayoutCard ? (
            <Card elevation={4}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <ProfileContent 
                  profile={profile}
                  appearance={appearance}
                  textColor={appearance.text?.pageTextColor || '#010101'}
                  titleFontFamily={titleFontFamily}
                  bodyFontFamily={bodyFontFamily}
                  usernameOpacity={usernameOpacity}
                  bioOpacity={bioOpacity}
                  footerOpacity={footerOpacity}
                  socialIcons={socialIcons}
                  ungroupedLinks={ungroupedLinks}
                  sortedGroups={sortedGroups}
                  groupedLinks={groupedLinks}
                  collapsedGroups={collapsedGroups}
                  toggleGroup={toggleGroup}
                  handleLinkClick={handleLinkClick}
                />
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <ProfileContent 
                profile={profile}
                appearance={appearance}
                textColor={textColor}
                titleFontFamily={titleFontFamily}
                bodyFontFamily={bodyFontFamily}
                usernameOpacity={usernameOpacity}
                bioOpacity={bioOpacity}
                footerOpacity={footerOpacity}
                socialIcons={socialIcons}
                ungroupedLinks={ungroupedLinks}
                sortedGroups={sortedGroups}
                groupedLinks={groupedLinks}
                collapsedGroups={collapsedGroups}
                toggleGroup={toggleGroup}
                handleLinkClick={handleLinkClick}
              />
            </Box>
          )}
          
          {/* Footer */}
          {!appearance.hideFooter && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography 
                variant="caption" 
                sx={{ color: isLayoutCard ? 'text.secondary' : textColor, opacity: isLayoutCard ? 1 : footerOpacity }}
              >
                Powered by LinkToMe
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
      
      {/* Lock Dialog */}
      <Dialog open={lockDialog.open} onClose={() => setLockDialog({ open: false, link: null, code: '' })}>
        <DialogTitle>
          {lockDialog.link?.lock?.type === 'code' && 'Enter Access Code'}
          {lockDialog.link?.lock?.type === 'age' && 'Age Verification Required'}
          {lockDialog.link?.lock?.type === 'sensitive' && 'Content Warning'}
        </DialogTitle>
        <DialogContent>
          {lockDialog.link?.lock?.type === 'code' && (
            <>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {lockDialog.link.lock.message || 'This content requires an access code.'}
              </Typography>
              <TextField
                fullWidth
                label="Access Code"
                value={lockDialog.code}
                onChange={(e) => setLockDialog(prev => ({ ...prev, code: e.target.value }))}
                type="password"
                autoFocus
              />
            </>
          )}
          {lockDialog.link?.lock?.type === 'age' && (
            <Typography>
              {lockDialog.link.lock.message || 'You must be 18 or older to view this content.'}
            </Typography>
          )}
          {lockDialog.link?.lock?.type === 'sensitive' && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Warning color="warning" />
              <Typography>
                {lockDialog.link.lock.message || 'This content may be sensitive. Proceed with caution.'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLockDialog({ open: false, link: null, code: '' })}>
            Cancel
          </Button>
          <Button onClick={handleUnlock} variant="contained">
            {lockDialog.link?.lock?.type === 'code' && 'Submit'}
            {lockDialog.link?.lock?.type === 'age' && 'I am 18 or older'}
            {lockDialog.link?.lock?.type === 'sensitive' && 'Continue'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// Profile content component to avoid duplication
interface ProfileContentProps {
  profile: PublicProfile;
  appearance: Appearance;
  textColor: string;
  titleFontFamily: string;
  bodyFontFamily: string;
  usernameOpacity: number;
  bioOpacity: number;
  footerOpacity: number;
  socialIcons: SocialIcon[];
  ungroupedLinks: Link[];
  sortedGroups: LinkGroup[];
  groupedLinks: (groupId: string) => Link[];
  collapsedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
  handleLinkClick: (link: Link, e: React.MouseEvent) => void;
}

const ProfileContent: React.FC<ProfileContentProps> = ({
  profile,
  appearance,
  textColor,
  titleFontFamily,
  bodyFontFamily,
  usernameOpacity,
  bioOpacity,
  footerOpacity,
  socialIcons,
  ungroupedLinks,
  sortedGroups,
  groupedLinks,
  collapsedGroups,
  toggleGroup,
  handleLinkClick,
}) => {
  const isHeroLayout = appearance.header?.profileImageLayout === 'hero';
  
  return (
    <>
      {/* Profile Image */}
      {isHeroLayout ? (
        <Box
          sx={{
            width: '100%',
            height: 200,
            mb: 3,
            borderRadius: 2,
            overflow: 'hidden',
            backgroundImage: `url(${profile.avatar})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : (
        <Avatar
          src={profile.avatar}
          alt={profile.displayName}
          sx={{ 
            width: 100, 
            height: 100, 
            mx: 'auto', 
            mb: 2,
            border: 3,
            borderColor: textColor === '#ffffff' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)',
          }}
        />
      )}
      
      {/* Display Name / Logo */}
      {appearance.header?.titleStyle === 'logo' && appearance.header.logoUrl ? (
        <Box
          component="img"
          src={appearance.header.logoUrl}
          alt={profile.displayName}
          sx={{ 
            maxHeight: appearance.text?.titleSize === 'large' ? 60 : 40,
            maxWidth: '80%',
            mx: 'auto',
            mb: 1,
          }}
        />
      ) : (
        <Typography 
          variant={appearance.text?.titleSize === 'large' ? 'h4' : 'h5'} 
          fontWeight={700} 
          gutterBottom 
          sx={{ 
            color: appearance.text?.titleColor || textColor,
            fontFamily: titleFontFamily,
          }}
        >
          {profile.displayName}
        </Typography>
      )}
      
      <Typography 
        variant="body2" 
        sx={{ color: textColor, fontFamily: bodyFontFamily, opacity: usernameOpacity }} 
        gutterBottom
      >
        @{profile.username}
      </Typography>
      
      {/* Bio */}
      {profile.bio && (
        <Typography 
          variant="body2" 
          sx={{ 
            color: textColor,
            opacity: bioOpacity, 
            mt: 1, 
            mb: 3,
            maxWidth: '90%',
            mx: 'auto',
            fontFamily: bodyFontFamily,
          }}
        >
          {profile.bio}
        </Typography>
      )}
      
      {/* Social Icons */}
      {socialIcons && socialIcons.length > 0 && (
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 3 }}>
          {socialIcons.map((icon) => (
            <IconButton
              key={icon.id}
              href={icon.url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              sx={{ 
                color: textColor,
                '&:hover': { opacity: 0.7 },
              }}
            >
              {getSocialIcon(icon.platform, 'medium')}
            </IconButton>
          ))}
        </Stack>
      )}
      
      {/* Ungrouped Links */}
      <Stack spacing={2}>
        {ungroupedLinks.map((link) => (
          <LinkButton 
            key={link.id} 
            link={link} 
            buttons={appearance.buttons}
            bodyFontFamily={bodyFontFamily}
            onLinkClick={handleLinkClick}
          />
        ))}
      </Stack>
      
      {/* Grouped Links */}
      {sortedGroups.map((group) => {
        const groupLinks = groupedLinks(group.id);
        if (groupLinks.length === 0) return null;
        
        const isCollapsed = collapsedGroups.has(group.id) || group.collapsed;
        
        return (
          <Box key={group.id} sx={{ mt: 3 }}>
            <Button
              fullWidth
              onClick={() => toggleGroup(group.id)}
              sx={{
                justifyContent: 'space-between',
                color: textColor,
                mb: 1,
                textTransform: 'none',
                fontFamily: bodyFontFamily,
              }}
              endIcon={isCollapsed ? <ExpandMore /> : <ExpandLess />}
            >
              <Typography variant="subtitle1" fontWeight={600}>
                {group.title}
              </Typography>
            </Button>
            
            <Collapse in={!isCollapsed}>
              <Stack 
                spacing={2}
                direction={group.layout === 'grid' ? 'row' : 'column'}
                flexWrap={group.layout === 'grid' ? 'wrap' : 'nowrap'}
                sx={group.layout === 'grid' ? {
                  '& > *': { 
                    flex: '1 1 calc(50% - 8px)',
                    minWidth: 'calc(50% - 8px)',
                  },
                } : undefined}
              >
                {groupLinks.map((link) => (
                  <LinkButton 
                    key={link.id} 
                    link={link} 
                    buttons={appearance.buttons}
                    bodyFontFamily={bodyFontFamily}
                    onLinkClick={handleLinkClick}
                  />
                ))}
              </Stack>
            </Collapse>
          </Box>
        );
      })}
    </>
  );
};
