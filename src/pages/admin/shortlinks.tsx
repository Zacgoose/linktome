import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Stack,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add,
  ContentCopy,
  Edit,
  Delete,
  MoreVert,
  Link as LinkIcon,
  TrendingUp,
  OpenInNew,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet, useApiPut } from '@/hooks/useApiQuery';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { useToast } from '@/context/ToastContext';
import UpgradePrompt from '@/components/UpgradePrompt';
import TierBadge from '@/components/TierBadge';
import { getTierLimits } from '@/utils/tierValidation';
import { UserTier } from '@/types/tiers';
import type {
  ShortLink,
  ShortLinksResponse,
  UpdateShortLinksRequest,
  UpdateShortLinksResponse,
} from '@/types/api';

export default function ShortLinksPage() {
  const { showToast } = useToast();
  const { userTier, canAccess, showUpgrade, upgradeInfo, openUpgradePrompt, closeUpgradePrompt } = useFeatureGate();
  
  // Check if user can access short links feature
  const shortLinksAccess = canAccess('maxShortLinks');
  const tierLimits = getTierLimits(userTier);
  const maxShortLinks = tierLimits.maxShortLinks;

  // Fetch short links
  const { data: shortLinksData, isLoading, refetch } = useApiGet<ShortLinksResponse>({
    url: 'admin/getShortLinks',
    queryKey: 'short-links',
    enabled: shortLinksAccess.allowed,
  });

  const shortLinks = shortLinksData?.shortLinks || [];
  const total = shortLinksData?.total || 0;

  // Mutations
  const updateShortLinks = useApiPut<UpdateShortLinksResponse, UpdateShortLinksRequest>({
    onSuccess: (data) => {
      refetch();
      if (data.created && data.created.length > 0) {
        const newLink = data.created[0];
        showToast(`Short link created: ${newLink.slug}`, 'success');
      } else {
        showToast('Short link updated successfully', 'success');
      }
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      
      // Handle tier upgrade required
      if (errorData?.upgradeRequired) {
        openUpgradePrompt('Short Links', UserTier.PRO);
        return;
      }
      
      // Handle limit exceeded
      if (errorData?.currentCount !== undefined && errorData?.limit !== undefined) {
        showToast(errorData.error || 'Short link limit exceeded', 'error');
        return;
      }
      
      // Generic error
      showToast(errorData?.error || 'Failed to update short link', 'error');
    },
  });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null);
  
  // Form states
  const [targetUrl, setTargetUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<{ el: HTMLElement; link: ShortLink } | null>(null);

  // Handle create
  const handleOpenCreate = () => {
    if (!shortLinksAccess.allowed) {
      openUpgradePrompt('Short Links', UserTier.PRO);
      return;
    }
    
    // Check limit
    if (maxShortLinks !== -1 && total >= maxShortLinks) {
      showToast(`You have reached your limit of ${maxShortLinks} short links. Upgrade to create more.`, 'warning');
      openUpgradePrompt('Short Links', userTier === UserTier.PRO ? UserTier.PREMIUM : UserTier.PRO);
      return;
    }
    
    setTargetUrl('');
    setTitle('');
    setIsActive(true);
    setCreateDialogOpen(true);
  };

  const handleCreate = () => {
    if (!targetUrl.trim()) {
      showToast('Please enter a target URL', 'error');
      return;
    }

    updateShortLinks.mutate({
      url: 'admin/updateShortLinks',
      data: {
        shortLinks: [{
          operation: 'add',
          targetUrl: targetUrl.trim(),
          title: title.trim(),
          active: isActive,
        }],
      },
    });
    
    setCreateDialogOpen(false);
  };

  // Handle edit
  const handleOpenEdit = (link: ShortLink) => {
    setSelectedLink(link);
    setTargetUrl(link.targetUrl);
    setTitle(link.title);
    setIsActive(link.active);
    setEditDialogOpen(true);
    setMenuAnchorEl(null);
  };

  const handleEdit = () => {
    if (!selectedLink || !targetUrl.trim()) {
      showToast('Please enter a target URL', 'error');
      return;
    }

    updateShortLinks.mutate({
      url: 'admin/updateShortLinks',
      data: {
        shortLinks: [{
          operation: 'update',
          slug: selectedLink.slug,
          targetUrl: targetUrl.trim(),
          title: title.trim(),
          active: isActive,
        }],
      },
    });
    
    setEditDialogOpen(false);
    setSelectedLink(null);
  };

  // Handle delete
  const handleOpenDelete = (link: ShortLink) => {
    setSelectedLink(link);
    setDeleteDialogOpen(true);
    setMenuAnchorEl(null);
  };

  const handleDelete = () => {
    if (!selectedLink) return;

    updateShortLinks.mutate({
      url: 'admin/updateShortLinks',
      data: {
        shortLinks: [{
          operation: 'remove',
          slug: selectedLink.slug,
        }],
      },
    });
    
    setDeleteDialogOpen(false);
    setSelectedLink(null);
  };

  // Handle toggle active
  const handleToggleActive = (link: ShortLink) => {
    updateShortLinks.mutate({
      url: 'admin/updateShortLinks',
      data: {
        shortLinks: [{
          operation: 'update',
          slug: link.slug,
          active: !link.active,
        }],
      },
    });
  };

  // Handle copy link
  const handleCopyLink = (slug: string) => {
    const shortUrl = `${window.location.origin}/l/${slug}`;
    navigator.clipboard.writeText(shortUrl);
    showToast('Short link copied to clipboard', 'success');
    setMenuAnchorEl(null);
  };

  // Handle open link
  const handleOpenLink = (targetUrl: string) => {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    setMenuAnchorEl(null);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Truncate URL
  const truncateUrl = (url: string, maxLength = 50) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  if (!shortLinksAccess.allowed) {
    return (
      <>
        <Head>
          <title>Short Links - LinkToMe</title>
        </Head>
        
        <AdminLayout>
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <LinkIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h4" gutterBottom fontWeight={600} color="text.primary">
                Short Links
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Short links are not available on the Free plan.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Upgrade to Pro or higher to create short links and track analytics.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => openUpgradePrompt('Short Links', UserTier.PRO)}
                sx={{ mt: 2 }}
              >
                Upgrade to Pro
              </Button>
            </Box>
          </Container>
        </AdminLayout>

        {showUpgrade && upgradeInfo && (
          <UpgradePrompt
            open={showUpgrade}
            onClose={closeUpgradePrompt}
            feature={upgradeInfo.feature}
            requiredTier={upgradeInfo.requiredTier || UserTier.PRO}
            currentTier={upgradeInfo.currentTier}
          />
        )}
      </>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Short Links - LinkToMe</title>
      </Head>
      
      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Box>
                <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
                  Short Links
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create and manage URL shortener links
                </Typography>
              </Box>
              <TierBadge tier={userTier} size="small" />
            </Stack>

            {/* Usage Info */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Short Links Usage
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {total} {maxShortLinks === -1 ? '/ Unlimited' : `/ ${maxShortLinks}`}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleOpenCreate}
                  disabled={maxShortLinks !== -1 && total >= maxShortLinks}
                >
                  Create Short Link
                </Button>
              </Stack>
              {maxShortLinks !== -1 && total >= maxShortLinks && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  You have reached your limit of {maxShortLinks} short links. Upgrade to create more.
                </Alert>
              )}
            </Paper>
          </Box>

          {/* Short Links Table */}
          {shortLinks.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <LinkIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No short links yet
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Create your first short link to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenCreate}
              >
                Create Short Link
              </Button>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Slug</TableCell>
                    <TableCell>Target URL</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell align="center">Clicks</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Last Clicked</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shortLinks.map((link) => (
                    <TableRow key={link.slug} hover>
                      <TableCell>
                        <Tooltip title="Click to copy link">
                          <Chip
                            label={link.slug}
                            size="small"
                            onClick={() => handleCopyLink(link.slug)}
                            sx={{ 
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={link.targetUrl}>
                          <Typography variant="body2" sx={{ maxWidth: 300 }}>
                            {truncateUrl(link.targetUrl)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {link.title || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={link.clicks}
                          size="small"
                          color={link.clicks > 0 ? 'primary' : 'default'}
                          icon={<TrendingUp />}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={link.active}
                          onChange={() => handleToggleActive(link)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(link.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(link.lastClickedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => setMenuAnchorEl({ el: e.currentTarget, link })}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Container>
      </AdminLayout>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchorEl?.el}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
      >
        <MenuItem onClick={() => menuAnchorEl && handleCopyLink(menuAnchorEl.link.slug)}>
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy Link</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuAnchorEl && handleOpenLink(menuAnchorEl.link.targetUrl)}>
          <ListItemIcon>
            <OpenInNew fontSize="small" />
          </ListItemIcon>
          <ListItemText>Open Target URL</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuAnchorEl && handleOpenEdit(menuAnchorEl.link)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuAnchorEl && handleOpenDelete(menuAnchorEl.link)}>
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Short Link</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              The slug will be automatically generated (6 characters)
            </Alert>
            <TextField
              label="Target URL"
              fullWidth
              required
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com/your-long-url"
              helperText="The URL where users will be redirected"
            />
            <TextField
              label="Title (Optional)"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Link"
              helperText="Optional title for easier identification"
              inputProps={{ maxLength: 100 }}
            />
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2">Active</Typography>
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Inactive links will return a 410 Gone status
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={!targetUrl.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Short Link</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedLink && (
              <Alert severity="info" sx={{ mb: 1 }}>
                Slug: <strong>{selectedLink.slug}</strong> (cannot be changed)
              </Alert>
            )}
            <TextField
              label="Target URL"
              fullWidth
              required
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com/your-long-url"
            />
            <TextField
              label="Title (Optional)"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Link"
              inputProps={{ maxLength: 100 }}
            />
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2">Active</Typography>
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Inactive links will return a 410 Gone status
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleEdit}
            variant="contained"
            disabled={!targetUrl.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Short Link?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete the short link <strong>{selectedLink?.slug}</strong>?
            This action cannot be undone.
          </Typography>
          {selectedLink && selectedLink.clicks > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This link has been clicked {selectedLink.clicks} times. Deleting it will break
              existing links.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upgrade Prompt */}
      {showUpgrade && upgradeInfo && (
        <UpgradePrompt
          open={showUpgrade}
          onClose={closeUpgradePrompt}
          feature={upgradeInfo.feature}
          requiredTier={upgradeInfo.requiredTier || UserTier.PRO}
          currentTier={upgradeInfo.currentTier}
        />
      )}
    </>
  );
}
