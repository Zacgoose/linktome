import { Box, Card, CardContent, Avatar, Typography, Stack, Button, IconButton } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { Link, LinkGroup, AppearanceData, ButtonStyle } from '@/types/links';
import {
  getFontFamily,
  getBackgroundStyle,
  getButtonStyle,
  getAnimationStyle,
  getSocialIcon,
  isDarkBackground,
  getLinkLayoutProps,
  ANIMATION_KEYFRAMES,
  DEFAULT_WALLPAPER,
  DEFAULT_BUTTONS,
  DEFAULT_TEXT,
} from '@/utils/appearanceUtils';

interface PhonePreviewProps {
  appearance: Partial<AppearanceData>;
  links?: Link[];
  groups?: LinkGroup[];
  profileImageUrl?: string;
  displayName?: string;
  username?: string;
  bio?: string;
  compact?: boolean;
  className?: string;
}

// Link Button Component for preview
interface PreviewLinkButtonProps {
  link: Link;
  buttons: ButtonStyle;
  bodyFontFamily: string;
  compact: boolean;
}

function PreviewLinkButton({ link, buttons, bodyFontFamily, compact }: PreviewLinkButtonProps) {
  const { isFeatured, hasThumbnail, thumbnailPosition } = getLinkLayoutProps(link);
  const animationStyle = getAnimationStyle(link.animation);
  const buttonStyle = getButtonStyle(buttons);
  
  return (
    <Button
      variant="contained"
      size={compact ? 'small' : 'medium'}
      fullWidth
      sx={{
        ...buttonStyle,
        ...animationStyle,
        color: `${buttons.textColor || 'inherit'} !important`,
        fontFamily: bodyFontFamily,
        fontSize: compact ? '0.7rem' : '0.8rem',
        py: isFeatured ? (compact ? 1.5 : 2) : (compact ? 0.75 : 1),
        px: 2,
        textTransform: 'none',
        justifyContent: thumbnailPosition ? 'flex-start' : 'center',
        flexDirection: thumbnailPosition === 'right' ? 'row-reverse' : 'row',
        gap: 1,
        '& .MuiSvgIcon-root': { color: buttons.textColor || 'inherit' },
        '& .MuiTypography-root': { color: buttons.textColor || 'inherit' },
        '&:hover': {
          opacity: 0.9,
          transform: buttonStyle.boxShadow?.includes('4px 4px') ? 'translate(2px, 2px)' : undefined,
        },
      }}
    >
      {/* Thumbnail/Icon */}
      {hasThumbnail && thumbnailPosition !== 'right' && (
        <Avatar
          src={link.thumbnail || link.icon}
          sx={{ 
            width: isFeatured ? 32 : 24, 
            height: isFeatured ? 32 : 24,
            fontSize: '0.8rem',
          }}
          variant="rounded"
        >
          {link.thumbnailType === 'emoji' ? link.thumbnail : undefined}
        </Avatar>
      )}
      
      {/* Lock icon for locked links */}
      {link.lock?.enabled && !hasThumbnail && (
        <Lock sx={{ fontSize: compact ? 14 : 16, mr: 0.5 }} />
      )}
      
      {/* Title */}
      <Typography
        variant={isFeatured ? 'body1' : 'body2'}
        fontWeight={isFeatured ? 600 : 500}
        sx={{ 
          color: 'inherit',
          flex: thumbnailPosition ? 1 : undefined,
          textAlign: thumbnailPosition ? 'left' : 'center',
        }}
      >
        {link.title}
      </Typography>
      
      {/* Right thumbnail */}
      {hasThumbnail && thumbnailPosition === 'right' && (
        <Avatar
          src={link.thumbnail || link.icon}
          sx={{ 
            width: isFeatured ? 32 : 24, 
            height: isFeatured ? 32 : 24,
            fontSize: '0.8rem',
          }}
          variant="rounded"
        >
          {link.thumbnailType === 'emoji' ? link.thumbnail : undefined}
        </Avatar>
      )}
    </Button>
  );
}

export default function PhonePreview({
  appearance,
  links = [],
  groups = [],
  profileImageUrl,
  displayName = 'Your Name',
  username = '@username',
  bio,
  compact = false,
  className,
}: PhonePreviewProps) {
  const { theme: _theme, customTheme: _customTheme, ...appearanceProps } = appearance || {};

  const wallpaper = appearanceProps.wallpaper || DEFAULT_WALLPAPER;
  const buttons = appearanceProps.buttons || DEFAULT_BUTTONS;
  const text = appearanceProps.text || DEFAULT_TEXT;
  const header = appearanceProps.header || {
    profileImageLayout: 'classic',
    titleStyle: 'text',
    displayName: displayName,
  };
  const socialIcons = appearanceProps.socialIcons || [];
  const layoutStyle = appearanceProps.layoutStyle || 'centered';
  const customGradient = appearanceProps.customGradient;

  const activeLinks = links.filter(link => link.active).sort((a, b) => a.order - b.order);
  const backgroundStyle = getBackgroundStyle(wallpaper, customGradient);
  const buttonStyleObj = getButtonStyle(buttons);
  const titleFontFamily = getFontFamily(text.titleFont);
  const bodyFontFamily = getFontFamily(text.bodyFont);
  const darkBg = isDarkBackground(wallpaper);

  // Phone dimensions
  const phoneWidth = compact ? 240 : 280;
  const phoneHeight = compact ? 500 : 580;
  const borderWidth = compact ? 6 : 8;
  const notchWidth = compact ? 100 : 120;
  const notchHeight = compact ? 24 : 28;
  const borderRadius = compact ? '32px' : '36px';

  const isHeroLayout = header.profileImageLayout === 'hero';

  // Separate links into grouped and ungrouped
  const ungroupedLinks = activeLinks.filter(link => !link.groupId);
  const getGroupLinks = (groupId: string) => activeLinks.filter(link => link.groupId === groupId);
  const activeGroups = groups.filter(g => g.active).sort((a, b) => a.order - b.order);

  return (
    <Box className={className}>
      {/* Inject animation keyframes */}
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_KEYFRAMES }} />
      
      {/* Phone Frame */}
      <Box
        sx={{
          width: phoneWidth,
          height: phoneHeight,
          borderRadius: borderRadius,
          border: `${borderWidth}px solid #1a1a1a`,
          bgcolor: '#1a1a1a',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          mx: 'auto',
        }}
      >
        {/* Notch */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: notchWidth,
            height: notchHeight,
            bgcolor: '#1a1a1a',
            borderBottomLeftRadius: notchHeight / 2,
            borderBottomRightRadius: notchHeight / 2,
            zIndex: 10,
          }}
        />

        {/* Video Background */}
        {wallpaper.type === 'video' && wallpaper.videoUrl && (
          <Box
            component="video"
            autoPlay
            loop
            muted
            playsInline
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0,
              opacity: wallpaper.opacity || 1,
            }}
          >
            <source src={wallpaper.videoUrl} type="video/mp4" />
          </Box>
        )}

        {/* Screen Content */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: `calc(${borderRadius} - ${borderWidth}px)`,
            overflow: 'hidden',
            position: 'relative',
            ...backgroundStyle,
          }}
        >
          {/* Scrollable Content Area */}
          <Box
            sx={{
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              pt: `${notchHeight + 8}px`,
              pb: 4,
              px: compact ? 1.5 : 2,
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
            }}
          >
            {layoutStyle === 'card' ? (
              /* Card Layout */
              <>
                <Card 
                  elevation={3} 
                  sx={{ 
                    borderRadius: 3, 
                    mx: compact ? 0 : 0.5,
                    overflow: 'visible',
                    bgcolor: '#ffffff',
                  }}
                >
                  <CardContent sx={{ p: compact ? 2 : 2.5, textAlign: 'center' }}>
                  {/* Hero Image */}
                  {isHeroLayout ? (
                    <Box
                      sx={{
                        width: '100%',
                        height: compact ? 60 : 80,
                        mb: 2,
                        borderRadius: 2,
                        overflow: 'hidden',
                        backgroundImage: `url(${profileImageUrl || appearance.profileImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        bgcolor: 'grey.200',
                      }}
                    />
                  ) : (
                    <Avatar
                      src={profileImageUrl || appearance.profileImageUrl}
                      sx={{
                        width: compact ? 48 : 64,
                        height: compact ? 48 : 64,
                        mx: 'auto',
                        mb: 1.5,
                        bgcolor: 'grey.300',
                        border: 2,
                        borderColor: text.titleColor || 'primary.main',
                      }}
                    >
                      {(header.displayName || displayName).charAt(0).toUpperCase()}
                    </Avatar>
                  )}

                  {/* Logo or Name */}
                  {header.titleStyle === 'logo' && header.logoUrl ? (
                    <Box
                      component="img"
                      src={header.logoUrl}
                      alt={header.displayName || displayName}
                      sx={{
                        maxHeight: compact ? 24 : 32,
                        maxWidth: '80%',
                        mx: 'auto',
                        mb: 0.5,
                      }}
                    />
                  ) : (
                    <Typography
                      variant={compact ? 'body1' : 'subtitle1'}
                      fontWeight={700}
                      sx={{
                        color: text.titleColor,
                        fontFamily: titleFontFamily,
                        fontSize: text.titleSize === 'large' ? (compact ? '1rem' : '1.1rem') : undefined,
                      }}
                    >
                      {header.displayName || displayName}
                    </Typography>
                  )}

                  <Typography variant="caption" color="text.secondary" display="block">
                    {username}
                  </Typography>

                  {(bio || header.bio) && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, mb: 2, display: 'block', fontFamily: bodyFontFamily }}
                    >
                      {bio || header.bio}
                    </Typography>
                  )}

                  {/* Social Icons */}
                  {socialIcons.length > 0 && (
                    <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mb: 2 }}>
                      {socialIcons.filter(s => s.active).slice(0, 5).map((social, idx) => (
                        <IconButton key={idx} size="small" sx={{ color: text.pageTextColor }}>
                          {getSocialIcon(social.platform)}
                        </IconButton>
                      ))}
                    </Stack>
                  )}

                  {/* Links */}
                  <Stack spacing={compact ? 1 : 1.5}>
                    {ungroupedLinks.length > 0 ? (
                      ungroupedLinks.slice(0, compact ? 3 : 5).map((link) => (
                        <PreviewLinkButton
                          key={link.id}
                          link={link}
                          buttons={buttons}
                          bodyFontFamily={bodyFontFamily}
                          compact={compact}
                        />
                      ))
                    ) : (
                      <>
                        <Button 
                          variant="contained" 
                          size="small" 
                          fullWidth 
                          sx={{ 
                            ...buttonStyleObj, 
                            color: `${buttons.textColor || 'inherit'} !important`,
                            textTransform: 'none',
                          }}
                        >
                          Sample Link 1
                        </Button>
                        <Button 
                          variant="contained" 
                          size="small" 
                          fullWidth 
                          sx={{ 
                            ...buttonStyleObj,
                            color: `${buttons.textColor || 'inherit'} !important`, 
                            textTransform: 'none',
                          }}
                        >
                          Sample Link 2
                        </Button>
                      </>
                    )}
                  </Stack>

                  </CardContent>
                </Card>

                {/* Footer mirrors public page placement (outside card) */}
                {!appearance.hideFooter && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      mt: compact ? 2 : 3,
                      textAlign: 'center',
                      display: 'block',
                    }}
                  >
                    Powered by LinkToMe
                  </Typography>
                )}
              </>
            ) : (
              /* Centered Layout */
              <Box sx={{ textAlign: 'center', px: compact ? 0 : 0.5 }}>
                {/* Hero Image */}
                {isHeroLayout ? (
                  <Box
                    sx={{
                      width: '100%',
                      height: compact ? 80 : 100,
                      mb: 2,
                      borderRadius: 2,
                      overflow: 'hidden',
                      backgroundImage: `url(${profileImageUrl || appearance.profileImageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      bgcolor: darkBg ? 'rgba(255,255,255,0.1)' : 'grey.200',
                    }}
                  />
                ) : (
                  <Avatar
                    src={profileImageUrl || appearance.profileImageUrl}
                    sx={{
                      width: compact ? 56 : 72,
                      height: compact ? 56 : 72,
                      mx: 'auto',
                      mb: 1.5,
                      bgcolor: darkBg ? 'rgba(255,255,255,0.9)' : 'grey.300',
                      border: darkBg ? 3 : 0,
                      borderColor: '#ffffff',
                      fontSize: compact ? '1.25rem' : '1.5rem',
                      color: 'text.secondary',
                    }}
                  >
                    {(header.displayName || displayName).charAt(0).toUpperCase()}
                  </Avatar>
                )}

                {/* Logo or Name */}
                {header.titleStyle === 'logo' && header.logoUrl ? (
                  <Box
                    component="img"
                    src={header.logoUrl}
                    alt={header.displayName || displayName}
                    sx={{
                      maxHeight: compact ? 28 : 36,
                      maxWidth: '80%',
                      mx: 'auto',
                      mb: 0.5,
                      filter: darkBg ? 'brightness(0) invert(1)' : undefined,
                    }}
                  />
                ) : (
                  <Typography
                    variant={compact ? 'body1' : 'subtitle1'}
                    fontWeight={700}
                    gutterBottom
                    sx={{
                      color: darkBg ? '#ffffff' : text.titleColor,
                      fontFamily: titleFontFamily,
                      fontSize: text.titleSize === 'large' ? (compact ? '1rem' : '1.25rem') : undefined,
                    }}
                  >
                    {header.displayName || displayName}
                  </Typography>
                )}

                <Typography
                  variant="caption"
                  sx={{
                    color: darkBg ? 'rgba(255,255,255,0.9)' : text.pageTextColor,
                    fontFamily: bodyFontFamily,
                  }}
                  display="block"
                >
                  {username}
                </Typography>

                {(bio || header.bio) && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: darkBg ? 'rgba(255,255,255,0.8)' : text.pageTextColor,
                      mt: 0.5,
                      mb: 2,
                      display: 'block',
                      fontFamily: bodyFontFamily,
                    }}
                  >
                    {bio || header.bio}
                  </Typography>
                )}

                {/* Social Icons */}
                {socialIcons.length > 0 && (
                  <Stack direction="row" spacing={0.5} justifyContent="center" sx={{ mb: 2 }}>
                    {socialIcons.filter(s => s.active).slice(0, 5).map((social, idx) => (
                      <IconButton
                        key={idx}
                        size="small"
                        sx={{ color: darkBg ? 'rgba(255,255,255,0.9)' : text.pageTextColor }}
                      >
                        {getSocialIcon(social.platform)}
                      </IconButton>
                    ))}
                  </Stack>
                )}

                {/* Links */}
                <Stack spacing={compact ? 1 : 1.5}>
                  {ungroupedLinks.length > 0 ? (
                    ungroupedLinks.slice(0, compact ? 3 : 5).map((link) => (
                      <PreviewLinkButton
                        key={link.id}
                        link={link}
                        buttons={buttons}
                        bodyFontFamily={bodyFontFamily}
                        compact={compact}
                      />
                    ))
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        size={compact ? 'small' : 'medium'}
                        fullWidth
                        sx={{
                          ...buttonStyleObj,
                          color: `${buttons.textColor || 'inherit'} !important`,
                          fontSize: compact ? '0.75rem' : '0.8rem',
                          py: compact ? 0.75 : 1,
                          textTransform: 'none',
                          boxShadow: buttons.shadow === 'none' ? '0 4px 12px rgba(0,0,0,0.1)' : buttonStyleObj.boxShadow,
                        }}
                      >
                        Sample Link 1
                      </Button>
                      <Button
                        variant="contained"
                        size={compact ? 'small' : 'medium'}
                        fullWidth
                        sx={{
                          ...buttonStyleObj,
                          color: `${buttons.textColor || 'inherit'} !important`,
                          fontSize: compact ? '0.75rem' : '0.8rem',
                          py: compact ? 0.75 : 1,
                          textTransform: 'none',
                          boxShadow: buttons.shadow === 'none' ? '0 4px 12px rgba(0,0,0,0.1)' : buttonStyleObj.boxShadow,
                        }}
                      >
                        Sample Link 2
                      </Button>
                    </>
                  )}

                  {/* Groups */}
                  {!compact && activeGroups.slice(0, 2).map((group) => {
                    const groupLinks = getGroupLinks(group.id);
                    if (groupLinks.length === 0) return null;
                    
                    return (
                      <Box key={group.id} sx={{ mt: 1 }}>
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{ color: darkBg ? 'rgba(255,255,255,0.9)' : text.pageTextColor, mb: 1, display: 'block' }}
                        >
                          {group.title}
                        </Typography>
                        <Stack spacing={1}>
                          {groupLinks.slice(0, 2).map((link) => (
                            <PreviewLinkButton
                              key={link.id}
                              link={link}
                              buttons={buttons}
                              bodyFontFamily={bodyFontFamily}
                              compact={compact}
                            />
                          ))}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>

                {/* Footer */}
                {!appearance.hideFooter && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: darkBg ? 'rgba(255,255,255,0.7)' : text.pageTextColor,
                      opacity: darkBg ? 0.8 : 0.6,
                      mt: 3,
                      display: 'block',
                      fontFamily: bodyFontFamily,
                    }}
                  >
                    Powered by LinkToMe
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Home Indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: compact ? 6 : 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: compact ? 80 : 100,
            height: 4,
            bgcolor: '#fff',
            borderRadius: 2,
            opacity: 0.6,
          }}
        />
      </Box>
    </Box>
  );
}
