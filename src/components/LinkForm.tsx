import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControlLabel,
  Switch,
  Typography,
  Tabs,
  Tab,
  Grid,
  Paper,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Image as ImageIcon,
  Schedule as ScheduleIcon,
  Lock as LockIcon,
  Star as StarIcon,
  ViewModule as LayoutIcon,
  Link as LinkIcon,
  EmojiEmotions as EmojiIcon,
  Delete as DeleteIcon,
  LockOutlined as LockOutlinedIcon,
} from '@mui/icons-material';
import { Link } from '@/types/links';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import UpgradePrompt from './UpgradePrompt';

interface LinkFormProps {
  open: boolean;
  link?: Link | null;
  onClose: () => void;
  onSave: (link: Partial<Link>) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const ANIMATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'shake', label: 'Shake' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'glow', label: 'Glow' },
];

const LAYOUT_OPTIONS = [
  { value: 'classic', label: 'Classic', description: 'Standard link button' },
  { value: 'featured', label: 'Featured', description: 'Larger, highlighted button' },
  { value: 'thumbnail-left', label: 'Thumbnail Left', description: 'Image on left side' },
  { value: 'thumbnail-right', label: 'Thumbnail Right', description: 'Image on right side' },
];

const LOCK_TYPES = [
  { value: 'code', label: 'Access Code', description: 'Require a code to view' },
  { value: 'age', label: 'Age Verification', description: 'Confirm user is 18+' },
  { value: 'sensitive', label: 'Sensitive Content', description: 'Show content warning' },
];

export default function LinkForm({ open, link, onClose, onSave }: LinkFormProps) {
  const [tabValue, setTabValue] = useState(0);
  const { canAccess, openUpgradePrompt, showUpgrade, upgradeInfo, closeUpgradePrompt, userTier } = useFeatureGate();
  
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    active: true,
    icon: '',
    thumbnail: '',
    thumbnailType: 'image' as 'icon' | 'image' | 'emoji',
    layout: 'classic' as Link['layout'],
    animation: 'none' as Link['animation'],
    schedule: {
      enabled: false,
      startDate: '',
      endDate: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    lock: {
      enabled: false,
      type: 'code' as 'code' | 'age' | 'sensitive',
      code: '',
      message: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (link) {
        setFormData({
          title: link.title || '',
          url: link.url || '',
          active: link.active !== undefined ? link.active : true,
          icon: link.icon || '',
          thumbnail: link.thumbnail || '',
          thumbnailType: link.thumbnailType || 'image',
          layout: link.layout || 'classic',
          animation: link.animation || 'none',
          schedule: {
            enabled: link.schedule?.enabled || false,
            startDate: link.schedule?.startDate || '',
            endDate: link.schedule?.endDate || '',
            timezone: link.schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          lock: {
            enabled: link.lock?.enabled || false,
            type: link.lock?.type || 'code',
            code: link.lock?.code || '',
            message: link.lock?.message || '',
          },
        });
      } else {
        setFormData({
          title: '',
          url: '',
          active: true,
          icon: '',
          thumbnail: '',
          thumbnailType: 'image',
          layout: 'classic',
          animation: 'none',
          schedule: {
            enabled: false,
            startDate: '',
            endDate: '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          lock: {
            enabled: false,
            type: 'code',
            code: '',
            message: '',
          },
        });
      }
      setTabValue(0);
    }
  }, [open, link]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is trying to use premium features they don't have access to
    const premiumFeaturesUsed: { feature: string; requiredTier: any }[] = [];
    
    // Check custom layouts
    if (formData.layout !== 'classic') {
      const access = canAccess('customLayouts');
      if (!access.allowed && access.requiredTier) {
        premiumFeaturesUsed.push({ feature: 'Custom Link Layout', requiredTier: access.requiredTier });
      }
    }
    
    // Check animations
    if (formData.animation !== 'none') {
      const access = canAccess('linkAnimations');
      if (!access.allowed && access.requiredTier) {
        premiumFeaturesUsed.push({ feature: 'Link Animations', requiredTier: access.requiredTier });
      }
    }
    
    // Check scheduling
    if (formData.schedule.enabled) {
      const access = canAccess('linkScheduling');
      if (!access.allowed && access.requiredTier) {
        premiumFeaturesUsed.push({ feature: 'Link Scheduling', requiredTier: access.requiredTier });
      }
    }
    
    // Check locking
    if (formData.lock.enabled) {
      const access = canAccess('linkLocking');
      if (!access.allowed && access.requiredTier) {
        premiumFeaturesUsed.push({ feature: 'Link Locking', requiredTier: access.requiredTier });
      }
    }
    
    // If premium features are used without access, show upgrade prompt
    if (premiumFeaturesUsed.length > 0) {
      // Show prompt for the first premium feature (or you could combine them)
      const firstFeature = premiumFeaturesUsed[0];
      openUpgradePrompt(firstFeature.feature, firstFeature.requiredTier);
      return; // Don't save
    }
    
    const linkData: Partial<Link> = {
      ...(link?.id && { id: link.id }),
      title: formData.title,
      url: formData.url,
      active: formData.active,
      layout: formData.layout,
      animation: formData.animation,
      ...(formData.icon && { icon: formData.icon }),
      ...(formData.thumbnail && { thumbnail: formData.thumbnail, thumbnailType: formData.thumbnailType }),
      ...(formData.schedule.enabled && { schedule: formData.schedule }),
      ...(formData.lock.enabled && { lock: formData.lock }),
      ...(link?.order != null && { order: link.order }),
    };

    onSave(linkData);
    onClose();
  };

  const updateSchedule = (updates: Partial<typeof formData.schedule>) => {
    setFormData(prev => ({
      ...prev,
      schedule: { ...prev.schedule, ...updates },
    }));
  };

  const updateLock = (updates: Partial<typeof formData.lock>) => {
    setFormData(prev => ({
      ...prev,
      lock: { ...prev.lock, ...updates },
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0 }}>
        <Typography variant="h6" fontWeight={600}>
          {link ? 'Edit Link' : 'Add New Link'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<LinkIcon />} label="Basic" iconPosition="start" sx={{ minHeight: 48 }} />
          <Tab icon={<ImageIcon />} label="Thumbnail" iconPosition="start" sx={{ minHeight: 48 }} />
          <Tab icon={<LayoutIcon />} label="Layout" iconPosition="start" sx={{ minHeight: 48 }} />
          <Tab icon={<StarIcon />} label="Effects" iconPosition="start" sx={{ minHeight: 48 }} />
          <Tab icon={<ScheduleIcon />} label="Schedule" iconPosition="start" sx={{ minHeight: 48 }} />
          <Tab icon={<LockIcon />} label="Lock" iconPosition="start" sx={{ minHeight: 48 }} />
        </Tabs>
      </Box>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 0 }}>
          {/* Basic Tab */}
          <TabPanel value={tabValue} index={0}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="My Website"
                helperText="The text displayed on your link button"
              />

              <TextField
                fullWidth
                label="URL"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
                placeholder="https://example.com"
                helperText="Where visitors will be redirected when they click"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    color="success"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      Active
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Show this link on your profile
                    </Typography>
                  </Box>
                }
              />
            </Stack>
          </TabPanel>

          {/* Thumbnail Tab */}
          <TabPanel value={tabValue} index={1}>
            <Stack spacing={3}>
              <Typography variant="body2" color="text.secondary">
                Add an image or icon to make your link stand out
              </Typography>

              <Box>
                <Typography variant="body2" fontWeight={500} sx={{ mb: 1.5 }}>
                  Thumbnail type
                </Typography>
                <Grid container spacing={1}>
                  {[
                    { value: 'image', label: 'Image', icon: <ImageIcon /> },
                    { value: 'icon', label: 'Icon', icon: <LinkIcon /> },
                    { value: 'emoji', label: 'Emoji', icon: <EmojiIcon /> },
                  ].map((type) => (
                    <Grid item xs={4} key={type.value}>
                      <Paper
                        onClick={() => setFormData({ ...formData, thumbnailType: type.value as typeof formData.thumbnailType })}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          border: 2,
                          borderColor: formData.thumbnailType === type.value ? 'primary.main' : 'transparent',
                          textAlign: 'center',
                          '&:hover': { borderColor: 'primary.light' },
                        }}
                      >
                        {type.icon}
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {type.label}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {formData.thumbnailType === 'image' && (
                <TextField
                  fullWidth
                  label="Image URL"
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  helperText="Direct link to an image file"
                />
              )}

              {formData.thumbnailType === 'emoji' && (
                <TextField
                  fullWidth
                  label="Emoji"
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  placeholder="🎉"
                  helperText="Enter a single emoji"
                />
              )}

              {formData.thumbnail && formData.thumbnailType === 'image' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    component="img"
                    src={formData.thumbnail}
                    sx={{
                      width: 60,
                      height: 60,
                      objectFit: 'cover',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => setFormData({ ...formData, thumbnail: '' })}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Stack>
          </TabPanel>

          {/* Layout Tab */}
          <TabPanel value={tabValue} index={2}>
            <Stack spacing={3}>
              <Typography variant="body2" color="text.secondary">
                Choose how your link appears on your profile
              </Typography>

              {!canAccess('customLayouts').allowed && (
                <Alert severity="info" icon={<LockOutlinedIcon />}>
                  Custom layouts are a premium feature. You can select them, but you'll need to upgrade to save.
                </Alert>
              )}

              <Grid container spacing={2}>
                {LAYOUT_OPTIONS.map((layout) => {
                  const isPremium = layout.value !== 'classic';
                  const access = canAccess('customLayouts');
                  const isLocked = isPremium && !access.allowed;
                  
                  return (
                    <Grid item xs={6} key={layout.value}>
                      <Paper
                        onClick={() => {
                          setFormData({ ...formData, layout: layout.value as typeof formData.layout });
                        }}
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          border: 2,
                          borderColor: formData.layout === layout.value ? 'primary.main' : 'transparent',
                          '&:hover': { borderColor: 'primary.light' },
                          opacity: isLocked ? 0.8 : 1,
                          position: 'relative',
                        }}
                      >
                        {isLocked && (
                          <Chip
                            icon={<LockOutlinedIcon />}
                            label="Premium"
                            size="small"
                            color="warning"
                            sx={{ position: 'absolute', top: 8, right: 8 }}
                          />
                        )}
                        <Typography variant="body2" fontWeight={500}>
                          {layout.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {layout.description}
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>

              {(formData.layout === 'featured' || formData.layout?.includes('thumbnail')) && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This layout works best with a thumbnail image
                </Alert>
              )}
            </Stack>
          </TabPanel>

          {/* Effects Tab */}
          <TabPanel value={tabValue} index={3}>
            <Stack spacing={3}>
              <Typography variant="body2" color="text.secondary">
                Add animation to draw attention to your link
              </Typography>

              {!canAccess('linkAnimations').allowed && (
                <Alert severity="info" icon={<LockOutlinedIcon />}>
                  Link animations are a premium feature. You can select them, but you'll need to upgrade to save.
                </Alert>
              )}

              <FormControl fullWidth>
                <InputLabel>Animation</InputLabel>
                <Select
                  value={formData.animation}
                  onChange={(e) => {
                    const newValue = e.target.value as typeof formData.animation;
                    setFormData({ ...formData, animation: newValue });
                  }}
                  label="Animation"
                >
                  {ANIMATION_OPTIONS.map((anim) => (
                    <MenuItem key={anim.value} value={anim.value}>
                      {anim.label}
                      {anim.value !== 'none' && !canAccess('linkAnimations').allowed && (
                        <LockOutlinedIcon sx={{ ml: 1, fontSize: 16, color: 'warning.main' }} />
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {formData.animation !== 'none' && (
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50' }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Preview
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{
                      animation: formData.animation === 'shake' ? 'shake 0.5s infinite' :
                        formData.animation === 'pulse' ? 'pulse 2s infinite' :
                        formData.animation === 'bounce' ? 'bounce 1s infinite' :
                        formData.animation === 'glow' ? 'glow 2s infinite' : 'none',
                      '@keyframes shake': {
                        '0%, 100%': { transform: 'translateX(0)' },
                        '25%': { transform: 'translateX(-5px)' },
                        '75%': { transform: 'translateX(5px)' },
                      },
                      '@keyframes pulse': {
                        '0%, 100%': { transform: 'scale(1)' },
                        '50%': { transform: 'scale(1.05)' },
                      },
                      '@keyframes bounce': {
                        '0%, 100%': { transform: 'translateY(0)' },
                        '50%': { transform: 'translateY(-10px)' },
                      },
                      '@keyframes glow': {
                        '0%, 100%': { boxShadow: '0 0 5px rgba(102, 126, 234, 0.5)' },
                        '50%': { boxShadow: '0 0 20px rgba(102, 126, 234, 0.8)' },
                      },
                    }}
                  >
                    {formData.title || 'Sample Link'}
                  </Button>
                </Paper>
              )}
            </Stack>
          </TabPanel>

          {/* Schedule Tab */}
          <TabPanel value={tabValue} index={4}>
            <Stack spacing={3}>
              {!canAccess('linkScheduling').allowed && (
                <Alert severity="info" icon={<LockOutlinedIcon />}>
                  Link scheduling is a premium feature. You can enable it, but you'll need to upgrade to save.
                </Alert>
              )}
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.schedule.enabled}
                    onChange={(e) => {
                      updateSchedule({ enabled: e.target.checked });
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      Enable scheduling
                      {!canAccess('linkScheduling').allowed && (
                        <LockOutlinedIcon sx={{ ml: 1, fontSize: 16, verticalAlign: 'middle', color: 'warning.main' }} />
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Show this link only during specific dates/times
                    </Typography>
                  </Box>
                }
              />

              {formData.schedule.enabled && (
                <>
                  <TextField
                    fullWidth
                    label="Start Date & Time"
                    type="datetime-local"
                    value={formData.schedule.startDate}
                    onChange={(e) => updateSchedule({ startDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    helperText="When the link becomes visible"
                  />

                  <TextField
                    fullWidth
                    label="End Date & Time"
                    type="datetime-local"
                    value={formData.schedule.endDate}
                    onChange={(e) => updateSchedule({ endDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    helperText="When the link becomes hidden (optional)"
                  />

                  <Alert severity="info">
                    Links will be shown in your timezone: {formData.schedule.timezone}
                  </Alert>
                </>
              )}
            </Stack>
          </TabPanel>

          {/* Lock Tab */}
          <TabPanel value={tabValue} index={5}>
            <Stack spacing={3}>
              {!canAccess('linkLocking').allowed && (
                <Alert severity="info" icon={<LockOutlinedIcon />}>
                  Link locking is a premium feature. You can enable it, but you'll need to upgrade to save.
                </Alert>
              )}
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.lock.enabled}
                    onChange={(e) => {
                      updateLock({ enabled: e.target.checked });
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      Lock this link
                      {!canAccess('linkLocking').allowed && (
                        <LockOutlinedIcon sx={{ ml: 1, fontSize: 16, verticalAlign: 'middle', color: 'warning.main' }} />
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Require visitors to take an action before viewing
                    </Typography>
                  </Box>
                }
              />

              {formData.lock.enabled && (
                <>
                  <Box>
                    <Typography variant="body2" fontWeight={500} sx={{ mb: 1.5 }}>
                      Lock type
                    </Typography>
                    <Grid container spacing={1}>
                      {LOCK_TYPES.map((type) => (
                        <Grid item xs={12} key={type.value}>
                          <Paper
                            onClick={() => updateLock({ type: type.value as typeof formData.lock.type })}
                            sx={{
                              p: 2,
                              cursor: 'pointer',
                              border: 2,
                              borderColor: formData.lock.type === type.value ? 'primary.main' : 'transparent',
                              '&:hover': { borderColor: 'primary.light' },
                            }}
                          >
                            <Typography variant="body2" fontWeight={500}>
                              {type.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {type.description}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>

                  {formData.lock.type === 'code' && (
                    <TextField
                      fullWidth
                      label="Access Code"
                      value={formData.lock.code}
                      onChange={(e) => updateLock({ code: e.target.value })}
                      placeholder="Enter a code"
                      helperText="Visitors must enter this code to view the link"
                    />
                  )}

                  <TextField
                    fullWidth
                    label="Custom Message (optional)"
                    value={formData.lock.message}
                    onChange={(e) => updateLock({ message: e.target.value })}
                    placeholder="Enter the code to unlock this content"
                    multiline
                    rows={2}
                    helperText="Message shown to visitors before they unlock"
                  />
                </>
              )}
            </Stack>
          </TabPanel>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button type="submit" variant="contained">
            {link ? 'Update Link' : 'Add Link'}
          </Button>
        </DialogActions>
      </form>
      
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
    </Dialog>
  );
}