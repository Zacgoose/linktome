import { useState } from 'react';
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
  IconButton,
  Paper,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Link as LinkIcon,
  Star,
  StarBorder,
  ContentCopy,
  Launch,
} from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet, useApiPost, useApiPut, useApiDelete } from '@/hooks/useApiQuery';
import { Page, PagesResponse, CreatePageRequest, UpdatePageRequest, validatePageSlug, generateSlug } from '@/types/pages';
import { useToast } from '@/context/ToastContext';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { getTierLimits } from '@/utils/tierValidation';
import UpgradePrompt from '@/components/UpgradePrompt';

interface PageCardProps {
  page: Page;
  onEdit: (page: Page) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onCopyUrl: (page: Page) => void;
  username?: string;
}

function PageCard({ page, onEdit, onDelete, onSetDefault, onCopyUrl, username }: PageCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const pageUrl = page.isDefault 
    ? `${window.location.origin}/public/${username}`
    : `${window.location.origin}/public/${username}/${page.slug}`;

  return (
    <Paper elevation={1} sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6" fontWeight={600}>
                {page.name}
              </Typography>
              {page.isDefault && (
                <Chip
                  icon={<Star sx={{ fontSize: 16 }} />}
                  label="Default"
                  size="small"
                  color="primary"
                  sx={{ height: 24 }}
                />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              /{page.slug}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<Launch />}
                onClick={() => window.open(pageUrl, '_blank')}
                sx={{ textTransform: 'none' }}
              >
                View Page
              </Button>
              <Button
                size="small"
                startIcon={<ContentCopy />}
                onClick={() => onCopyUrl(page)}
                sx={{ textTransform: 'none' }}
              >
                Copy Link
              </Button>
            </Box>
          </Box>

          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
            <MoreVert />
          </IconButton>
        </Box>
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { onEdit(page); setAnchorEl(null); }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Page</ListItemText>
        </MenuItem>
        {!page.isDefault && (
          <MenuItem onClick={() => { onSetDefault(page.id); setAnchorEl(null); }}>
            <ListItemIcon><Star fontSize="small" /></ListItemIcon>
            <ListItemText>Set as Default</ListItemText>
          </MenuItem>
        )}
        <MenuItem 
          onClick={() => { onDelete(page.id); setAnchorEl(null); }}
          disabled={page.isDefault}
        >
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: page.isDefault ? 'text.disabled' : 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete Page</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
}

export default function PagesPage() {
  const { showToast } = useToast();
  const { canAccess, showUpgrade, upgradeInfo, closeUpgradePrompt, openUpgradePrompt, userTier } = useFeatureGate();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', isDefault: false });
  const [slugError, setSlugError] = useState<string | undefined>();

  // Fetch pages
  const { data: pagesData, isLoading, refetch } = useApiGet<PagesResponse>({
    url: 'admin/GetPages',
    queryKey: 'admin-pages',
  });

  // Fetch user profile for username
  const { data: profileData } = useApiGet<{ username: string }>({
    url: 'admin/GetProfile',
    queryKey: 'admin-profile',
  });

  const pages = pagesData?.pages || [];
  const tierLimits = getTierLimits(userTier);
  const maxPagesCheck = canAccess('maxPages');

  // Create page mutation
  const createPage = useApiPost<any, CreatePageRequest>({
    onSuccess: () => {
      showToast('Page created successfully', 'success');
      refetch();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      showToast(`Failed to create page: ${error.message}`, 'error');
    },
  });

  // Update page mutation
  const updatePage = useApiPut<any, UpdatePageRequest>({
    onSuccess: () => {
      showToast('Page updated successfully', 'success');
      refetch();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      showToast(`Failed to update page: ${error.message}`, 'error');
    },
  });

  // Delete page mutation
  const deletePage = useApiDelete({
    onSuccess: () => {
      showToast('Page deleted successfully', 'success');
      refetch();
    },
    onError: (error) => {
      showToast(`Failed to delete page: ${error.message}`, 'error');
    },
  });

  const resetForm = () => {
    setFormData({ name: '', slug: '', isDefault: false });
    setSelectedPage(null);
    setSlugError(undefined);
  };

  const handleAddPage = () => {
    // Check page limit
    const currentPagesCount = pages.length;
    const limit = tierLimits.maxPages;
    
    if (limit !== -1 && currentPagesCount >= limit) {
      openUpgradePrompt('Multiple Pages', maxPagesCheck.requiredTier || userTier);
      return;
    }

    resetForm();
    setDialogOpen(true);
  };

  const handleEditPage = (page: Page) => {
    setSelectedPage(page);
    setFormData({ name: page.name, slug: page.slug, isDefault: page.isDefault });
    setDialogOpen(true);
  };

  const handleDeletePage = (id: string) => {
    const page = pages.find(p => p.id === id);
    if (page?.isDefault) {
      showToast('Cannot delete the default page', 'error');
      return;
    }

    if (confirm('Are you sure you want to delete this page? All links and appearance settings will be lost.')) {
      deletePage.mutate({ url: `admin/DeletePage?id=${id}` });
    }
  };

  const handleSetDefault = (id: string) => {
    const page = pages.find(p => p.id === id);
    if (!page) return;

    updatePage.mutate({
      url: 'admin/UpdatePage',
      data: { id, isDefault: true },
    });
  };

  const handleCopyUrl = (page: Page) => {
    const pageUrl = page.isDefault 
      ? `${window.location.origin}/public/${profileData?.username}`
      : `${window.location.origin}/public/${profileData?.username}/${page.slug}`;
    
    navigator.clipboard.writeText(pageUrl);
    showToast('Page URL copied to clipboard', 'success');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({ 
      ...prev, 
      name,
      // Auto-generate slug when creating new page
      slug: selectedPage ? prev.slug : generateSlug(name)
    }));
  };

  const handleSlugChange = (slug: string) => {
    setFormData(prev => ({ ...prev, slug }));
    
    // Validate slug
    const validation = validatePageSlug(slug);
    setSlugError(validation.valid ? undefined : validation.error);
  };

  const handleSave = () => {
    // Validate slug
    const validation = validatePageSlug(formData.slug);
    if (!validation.valid) {
      setSlugError(validation.error);
      return;
    }

    if (!formData.name.trim()) {
      showToast('Please enter a page name', 'error');
      return;
    }

    if (selectedPage) {
      // Update existing page
      updatePage.mutate({
        url: 'admin/UpdatePage',
        data: {
          id: selectedPage.id,
          name: formData.name,
          slug: formData.slug,
          isDefault: formData.isDefault,
        },
      });
    } else {
      // Create new page
      createPage.mutate({
        url: 'admin/CreatePage',
        data: {
          name: formData.name,
          slug: formData.slug,
          isDefault: formData.isDefault,
        },
      });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Pages - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Pages
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Create multiple link pages for different purposes
            </Typography>
            {tierLimits.maxPages !== -1 && (
              <Chip
                label={`${pages.length} / ${tierLimits.maxPages} pages used`}
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Box>

          {/* Feature Info */}
          {userTier === 'free' && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Upgrade to Pro to create multiple pages for different audiences, purposes, or brands.
            </Alert>
          )}

          {/* Add Page Button */}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddPage}
            size="large"
            sx={{ mb: 3, borderRadius: 2 }}
          >
            Create New Page
          </Button>

          {/* Pages List */}
          <Stack spacing={3}>
            {pages.map((page) => (
              <PageCard
                key={page.id}
                page={page}
                username={profileData?.username}
                onEdit={handleEditPage}
                onDelete={handleDeletePage}
                onSetDefault={handleSetDefault}
                onCopyUrl={handleCopyUrl}
              />
            ))}

            {pages.length === 0 && (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <LinkIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No pages yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create your first page to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddPage}
                >
                  Create Your First Page
                </Button>
              </Paper>
            )}
          </Stack>
        </Container>
      </AdminLayout>

      {/* Page Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedPage ? 'Edit Page' : 'Create New Page'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Page Name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Main Links, Music, Business"
              helperText="A friendly name to identify this page"
            />
            
            <TextField
              fullWidth
              label="Page Slug"
              value={formData.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="e.g., main, music, business"
              error={!!slugError}
              helperText={slugError || "URL-friendly identifier (lowercase, hyphens allowed)"}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isDefault}
                  onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                />
              }
              label="Set as default page"
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              {formData.isDefault 
                ? `This page will be shown at /public/${profileData?.username}`
                : `This page will be shown at /public/${profileData?.username}/${formData.slug}`
              }
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={!formData.name.trim() || !formData.slug.trim() || !!slugError}
          >
            {selectedPage ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upgrade Prompt */}
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
