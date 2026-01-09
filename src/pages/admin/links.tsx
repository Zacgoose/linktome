import { useState, useEffect, useMemo } from 'react';
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
  Avatar,
  Switch,
  Tooltip,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Add,
  DragIndicator,
  Edit,
  Delete,
  Share,
  Lock,
  MoreHoriz,
  ContentCopy,
  Archive,
  Folder,
  FolderOpen,
  ViewModule,
  Link as LinkIcon,
  Instagram,
  YouTube,
  Twitter,
  Email,
  MusicNote,
  OpenInNew,
  PhoneIphone as PhoneIcon,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from '@/layouts/AdminLayout';
import { useApiGet, useApiPut } from '@/hooks/useApiQuery';
import PhonePreview from '@/components/PhonePreview';
import LinkForm from '@/components/LinkForm';
import {
  Link,
  LinkGroup,
  LinksResponse,
  AppearanceData,
  DEFAULT_APPEARANCE,
  UpdateLinksRequest,
} from '@/types/links';
import { UserProfile } from '@/types/api';
import { useToast } from '@/context/ToastContext';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { getTierLimits } from '@/utils/tierValidation';
import { usePremiumValidation } from '@/hooks/usePremiumValidation';
import UpgradePrompt from '@/components/UpgradePrompt';
import { usePageContext } from '@/context/PageContext';

interface SortableLinkCardProps {
  link: Link;
  appearance: AppearanceData;
  onEdit: (link: Link) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onOpenSettings: (link: Link, setting: string) => void;
  onMoveToCollection: (linkId: string) => void;
  onRemoveFromCollection: (linkId: string) => void;
}

function SortableLinkCard({ link, onEdit, onDelete, onToggle, onOpenSettings, onMoveToCollection, onRemoveFromCollection }: SortableLinkCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const [shareAnchorEl, setShareAnchorEl] = useState<null | HTMLElement>(null);
  const [editAnchorEl, setEditAnchorEl] = useState<null | HTMLElement>(null);

  // Remove user theme for editable section
  const accentText = 'text.primary';
  const accentBg = '#e0e7ff15';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      elevation={isDragging ? 4 : 1}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'all 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <Box sx={{ display: 'flex' }}>
        {/* Drag Handle */}
        <Box
          {...attributes}
          {...listeners}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            bgcolor: accentBg,
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIndicator sx={{ color: accentText }} />
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: 1, p: 2 }}>
          {/* Title Row */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => onEdit(link)}
              >
                {link.title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <LinkIcon sx={{ fontSize: 14 }} />
                {link.url}
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Stack direction="row" spacing={0.5} sx={{ ml: 2 }}>
              <IconButton
                size="small"
                onClick={(e) => setShareAnchorEl(e.currentTarget)}
                sx={{}}
              >
                <Share fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => setEditAnchorEl(e.currentTarget)}
                sx={{}}
              >
                <Edit fontSize="small" />
              </IconButton>
              <Switch
                size="small"
                checked={link.active}
                onChange={(e) => onToggle(link.id, e.target.checked)}
                color="success"
              />
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Share Menu */}
      <Menu anchorEl={shareAnchorEl} open={Boolean(shareAnchorEl)} onClose={() => setShareAnchorEl(null)}>
        <MenuItem onClick={() => { navigator.clipboard.writeText(link.url); setShareAnchorEl(null); }}>
          <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
          <ListItemText>Copy link</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { window.open(link.url, '_blank'); setShareAnchorEl(null); }}>
          <ListItemIcon><OpenInNew fontSize="small" /></ListItemIcon>
          <ListItemText>Open in new tab</ListItemText>
        </MenuItem>
      </Menu>

      {/* Edit Menu */}
      <Menu anchorEl={editAnchorEl} open={Boolean(editAnchorEl)} onClose={() => setEditAnchorEl(null)}>
        <MenuItem onClick={() => { onEdit(link); setEditAnchorEl(null); }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Link</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onMoveToCollection(link.id); setEditAnchorEl(null); }}>
          <ListItemIcon><Folder fontSize="small" /></ListItemIcon>
          <ListItemText>{link.groupId ? 'Move to Another Collection' : 'Add to Collection'}</ListItemText>
        </MenuItem>
        {link.groupId && (
          <MenuItem onClick={() => { onRemoveFromCollection(link.id); setEditAnchorEl(null); }}>
            <ListItemIcon><FolderOpen fontSize="small" /></ListItemIcon>
            <ListItemText>Remove from Collection</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => { onDelete(link.id); setEditAnchorEl(null); }}>
          <ListItemIcon>
            <Delete fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
}

// Sortable Group Component
interface SortableGroupProps {
  group: LinkGroup;
  links: Link[];
  appearance: AppearanceData;
  onEditGroup: (group: LinkGroup) => void;
  onDeleteGroup: (id: string) => void;
  onToggleGroup: (id: string, active: boolean) => void;
  onAddLinkToGroup: (groupId: string) => void;
  onEditLink: (link: Link) => void;
  onDeleteLink: (id: string) => void;
  onToggleLink: (id: string, active: boolean) => void;
  onOpenSettings: (link: Link, setting: string) => void;
  onMoveToCollection: (linkId: string) => void;
  onRemoveFromCollection: (linkId: string) => void;
}

function SortableGroup({
  group,
  links,
  appearance,
  onEditGroup,
  onDeleteGroup,
  onToggleGroup,
  onAddLinkToGroup,
  onEditLink,
  onDeleteLink,
  onToggleLink,
  onOpenSettings,
  onMoveToCollection,
  onRemoveFromCollection,
}: SortableGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(group.collapsed || false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const groupLinks = links.filter(l => l.groupId === group.id).sort((a, b) => a.order - b.order);

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      elevation={isDragging ? 4 : 1}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'all 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      {/* Group Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          borderBottom: isCollapsed ? 'none' : '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          {...attributes}
          {...listeners}
          sx={{
            cursor: 'grab',
            mr: 1,
            '&:active': { cursor: 'grabbing' },
            color: 'grey.500',
          }}
        >
          <DragIndicator sx={{ color: 'grey.400' }} />
        </Box>

        <IconButton size="small" onClick={() => setIsCollapsed(!isCollapsed)} sx={{ mr: 1 }}>
          {isCollapsed ? <Folder /> : <FolderOpen />}
        </IconButton>

        <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
          {group.title}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Layout">
            <IconButton size="small">
              <ViewModule fontSize="small" />
            </IconButton>
          </Tooltip>

          <IconButton size="small" onClick={() => onEditGroup(group)}>
            <Edit fontSize="small" />
          </IconButton>

          <IconButton size="small" onClick={() => onAddLinkToGroup(group.id)}>
            <Add fontSize="small" />
          </IconButton>

          <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreHoriz fontSize="small" />
          </IconButton>

          <Switch
            size="small"
            checked={group.active}
            onChange={(e) => onToggleGroup(group.id, e.target.checked)}
            color="success"
          />
        </Stack>
      </Box>

      {/* Group Links */}
      <Collapse in={!isCollapsed}>
        <Box sx={{ p: 2, bgcolor: 'grey.25' }}>
          {groupLinks.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              No links in this collection
            </Typography>
          ) : (
            <Stack spacing={2}>
              {groupLinks.map((link) => (
                <SortableLinkCard
                  key={link.id}
                  link={link}
                  appearance={appearance}
                  onEdit={onEditLink}
                  onDelete={onDeleteLink}
                  onToggle={onToggleLink}
                  onOpenSettings={onOpenSettings}
                  onMoveToCollection={onMoveToCollection}
                  onRemoveFromCollection={onRemoveFromCollection}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Collapse>

      {/* Group Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { onDeleteGroup(group.id); setAnchorEl(null); }}>
          <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete collection</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
}

export default function LinksPage() {
  const { showToast } = useToast();
  const { canAccess, showUpgrade, upgradeInfo, closeUpgradePrompt, openUpgradePrompt, userTier } = useFeatureGate();
  const { validateFeatures } = usePremiumValidation({ userTier, openUpgradePrompt });
  const { currentPage } = usePageContext();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<LinkGroup | null>(null);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [collectionSelectorOpen, setCollectionSelectorOpen] = useState(false);
  const [linkToMove, setLinkToMove] = useState<string | null>(null);

  const maxLinkGroupsCheck = canAccess('maxLinkGroups');

  // Fetch links and groups for current page
  const { data: linksData, isLoading, refetch } = useApiGet<LinksResponse>({
    url: 'admin/GetLinks',
    queryKey: ['admin-links', currentPage?.id || 'none'],
    params: currentPage?.id ? { pageId: currentPage.id } : undefined,
    enabled: !!currentPage,
  });

  // Fetch appearance for preview
  const { data: appearanceData, refetch: refetchAppearance } = useApiGet<AppearanceData>({
    url: 'admin/GetAppearance',
    queryKey: ['admin-appearance', currentPage?.id || 'none'],
    params: currentPage?.id ? { pageId: currentPage.id } : undefined,
    enabled: !!currentPage,
  });
  
  // Appearance update mutation for footer toggle
  const updateAppearance = useApiPut<any, AppearanceData>({
    relatedQueryKeys: ['admin-appearance'],
    onSuccess: () => {
      showToast('Appearance updated', 'success');
      refetchAppearance();
    },
  });

  const { data: profileData } = useApiGet<UserProfile>({
    url: 'admin/GetProfile',
    queryKey: 'admin-profile',
  });

  const [links, setLinks] = useState<Link[]>([]);
  const [groups, setGroups] = useState<LinkGroup[]>([]);

  useEffect(() => {
    if (linksData) {
      setLinks(linksData.links || []);
      setGroups(linksData.groups || []);
    }
  }, [linksData]);

  const appearance = useMemo(() => {
    const source = appearanceData || DEFAULT_APPEARANCE;
    const { theme: _theme, customTheme: _customTheme, ...rest } = source;
    return rest as AppearanceData;
  }, [appearanceData]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Bulk update mutation for links and groups
  const updateLinks = useApiPut<any, UpdateLinksRequest>({
    relatedQueryKeys: [['admin-links', currentPage?.id]],
    onSuccess: () => {
      showToast('Changes saved', 'success');
      refetch();
    },
  });

  // Handlers
  const handleAddLink = () => {
    setSelectedLink(null);
    setSelectedGroupId(null);
    setFormOpen(true);
  };

  const handleAddLinkToGroup = (groupId: string) => {
    setSelectedLink(null);
    setSelectedGroupId(groupId);
    setFormOpen(true);
  };

  const handleEditLink = (link: Link) => {
    setSelectedLink(link);
    setSelectedGroupId(link.groupId || null);
    setFormOpen(true);
  };

  const handleSaveLink = (linkData: Partial<Link>) => {
    if (!currentPage?.id) return;
    
    if (selectedLink) {
      // Update existing link
      updateLinks.mutate({
        url: `admin/UpdateLinks?pageId=${currentPage.id}`,
        data: {
          links: [{
            operation: 'update',
            id: selectedLink.id,
            ...linkData,
            groupId: selectedGroupId,
          }],
        },
      });
    } else {
      // Add new link
      const maxOrder = links.length > 0 ? Math.max(...links.map(l => l.order)) : -1;
      updateLinks.mutate({
        url: `admin/UpdateLinks?pageId=${currentPage.id}`,
        data: {
          links: [{
            operation: 'add',
            ...linkData,
            order: maxOrder + 1,
            groupId: selectedGroupId,
            active: true,
            pageId: currentPage.id,
          }],
        },
      });
    }
    setFormOpen(false);
  };

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDeleteLink = (id: string) => {
    setPendingDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteLink = () => {
    if (pendingDeleteId && currentPage?.id) {
      updateLinks.mutate({
        url: `admin/UpdateLinks?pageId=${currentPage.id}`,
        data: {
          links: [{ operation: 'remove', id: pendingDeleteId }],
        },
      });
    }
    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
  };

  const handleCancelDeleteLink = () => {
    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
  };

  const handleToggleLink = (id: string, active: boolean) => {
    if (!currentPage?.id) return;
    
    updateLinks.mutate({
      url: `admin/UpdateLinks?pageId=${currentPage.id}`,
      data: {
        links: [{ operation: 'update', id, active }],
      },
    });
    // Optimistic update
    setLinks(prev => prev.map(l => l.id === id ? { ...l, active } : l));
  };

  const handleAddCollection = () => {
    // Check if user has reached link groups limit
    const currentGroupsCount = groups.length;
    const tierLimits = getTierLimits(userTier);
    const limit = tierLimits.maxLinkGroups;
    
    if (limit !== -1 && currentGroupsCount >= limit) {
      openUpgradePrompt('Link Collections', maxLinkGroupsCheck.requiredTier || userTier);
      return;
    }

    setSelectedGroup(null);
    setNewGroupTitle('New Collection');
    setGroupDialogOpen(true);
  };

  const handleEditGroup = (group: LinkGroup) => {
    setSelectedGroup(group);
    setNewGroupTitle(group.title);
    setGroupDialogOpen(true);
  };

  const handleSaveGroup = () => {
    if (!newGroupTitle.trim() || !currentPage?.id) return;

    if (selectedGroup) {
      // Update existing group
      updateLinks.mutate({
        url: `admin/UpdateLinks?pageId=${currentPage.id}`,
        data: {
          groups: [{
            operation: 'update',
            id: selectedGroup.id,
            title: newGroupTitle,
          }],
        },
      });
    } else {
      // Add new group
      const maxOrder = groups.length > 0 ? Math.max(...groups.map(g => g.order)) : -1;
      updateLinks.mutate({
        url: `admin/UpdateLinks?pageId=${currentPage.id}`,
        data: {
          groups: [{
            operation: 'add',
            title: newGroupTitle,
            order: maxOrder + 1,
            active: true,
            pageId: currentPage.id,
          }],
        },
      });
    }
    setGroupDialogOpen(false);
  };

  const handleDeleteGroup = (id: string) => {
    if (!currentPage?.id) return;
    
    if (confirm('Are you sure you want to delete this collection? Links inside will be moved out.')) {
      updateLinks.mutate({
        url: `admin/UpdateLinks?pageId=${currentPage.id}`,
        data: {
          groups: [{ operation: 'remove', id }],
        },
      });
    }
  };

  const handleToggleGroup = (id: string, active: boolean) => {
    if (!currentPage?.id) return;
    
    updateLinks.mutate({
      url: `admin/UpdateLinks?pageId=${currentPage.id}`,
      data: {
        groups: [{ operation: 'update', id, active }],
      },
    });
    // Optimistic update
    setGroups(prev => prev.map(g => g.id === id ? { ...g, active } : g));
  };
  
  const handleToggleFooter = (checked: boolean) => {
    // Validate if user is trying to enable hideFooter
    if (checked) {
      const isValid = validateFeatures([
        {
          featureKey: 'removeFooter',
          featureName: 'Remove Footer',
          isUsing: true,
        },
      ]);
      
      if (!isValid) {
        return; // Upgrade prompt will show, don't toggle
      }
    }
    
    // Update appearance with new hideFooter value
    if (appearanceData) {
      updateAppearance.mutate({
        url: 'admin/UpdateAppearance',
        data: { ...appearanceData, hideFooter: checked },
      });
    }
  };

  const handleOpenSettings = (link: Link, setting: string) => {
    setSelectedLink(link);
    setSelectedGroupId(link.groupId || null);
    setFormOpen(true);
  };

  const handleMoveToCollection = (linkId: string) => {
    setLinkToMove(linkId);
    setCollectionSelectorOpen(true);
  };

  const handleRemoveFromCollection = (linkId: string) => {
    if (!currentPage?.id) return;
    
    updateLinks.mutate({
      url: `admin/UpdateLinks?pageId=${currentPage.id}`,
      data: {
        links: [{
          operation: 'update',
          id: linkId,
          groupId: null,
        }],
      },
    });
  };

  const handleSelectCollection = (groupId: string | null) => {
    if (linkToMove && currentPage?.id) {
      updateLinks.mutate({
        url: `admin/UpdateLinks?pageId=${currentPage.id}`,
        data: {
          links: [{
            operation: 'update',
            id: linkToMove,
            groupId: groupId,
          }],
        },
      });
    }
    setCollectionSelectorOpen(false);
    setLinkToMove(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !currentPage?.id) return;

    const oldIndex = links.findIndex(l => l.id === active.id);
    const newIndex = links.findIndex(l => l.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newLinks = arrayMove(links, oldIndex, newIndex).map((link, idx) => ({
        ...link,
        order: idx,
      }));
      setLinks(newLinks);

      // Save new order via bulk update
      updateLinks.mutate({
        url: `admin/UpdateLinks?pageId=${currentPage.id}`,
        data: {
          links: newLinks.map(l => ({
            operation: 'update' as const,
            id: l.id,
            order: l.order,
          })),
        },
      });
    }
  };

  // Separate root links and grouped links
  const rootLinks = links.filter(l => !l.groupId).sort((a, b) => a.order - b.order);
  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);
  const activeLinks = links.filter(l => l.active).sort((a, b) => a.order - b.order);

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
        <title>Links - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Mobile Preview - Show at top on small screens */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PhoneIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" color="text.secondary">
                Live Preview
              </Typography>
            </Box>
            <PhonePreview
              appearance={appearance}
              links={activeLinks}
              groups={sortedGroups}
              profileImageUrl={appearance.profileImageUrl}
              displayName={appearance.header?.displayName}
              username={profileData?.username}
              bio={appearance.header?.bio}
              compact
            />
          </Box>

          {/* Main Content */}
          <Box sx={{ flex: 1, minWidth: 0, maxWidth: 640, mx: { xs: 'auto', md: 0 }, mr: { xs: 0, md: '360px' } }}>
            {/* Profile Header */}
            <Card sx={{ mb: 3, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={appearance.profileImageUrl}
                    sx={{ width: 64, height: 64 }}
                  >
                    {appearance.header?.displayName?.charAt(0) || 'U'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {appearance.header?.displayName || 'username'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {appearance.header?.bio || 'Your bio goes here'}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {[Instagram, YouTube, Twitter, Email, MusicNote].slice(0, 4).map((Icon, idx) => (
                        <IconButton
                          key={idx}
                          size="small"
                          sx={{color: 'text.secondary'}}
                        >
                          <Icon fontSize="small" />
                        </IconButton>
                      ))}
                      <IconButton
                        size="small"
                        sx={{color: 'text.secondary'}}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Add Link Button */}
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddLink}
              fullWidth
              size="large"
              sx={{
                borderRadius: 6,
                py: 1.5,
                mb: 3,
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              Add Link
            </Button>

            {/* Collection & Archive Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Folder />}
                onClick={handleAddCollection}
                sx={{ borderRadius: 2 }}
              >
                Add collection
              </Button>
              <Button
                variant="text"
                startIcon={<Archive />}
                sx={{ borderRadius: 2, color: 'text.secondary' }}
              >
                Archive
              </Button>
            </Box>

            {/* Links List */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={[...rootLinks.map(l => l.id), ...sortedGroups.map(g => g.id)]}
                strategy={verticalListSortingStrategy}
              >
                <Stack spacing={2}>
                  {/* Root Links */}
                  {rootLinks.map((link) => (
                    <SortableLinkCard
                      key={link.id}
                      link={link}
                      appearance={appearance}
                      onEdit={handleEditLink}
                      onDelete={handleDeleteLink}
                      onToggle={handleToggleLink}
                      onOpenSettings={handleOpenSettings}
                      onMoveToCollection={handleMoveToCollection}
                      onRemoveFromCollection={handleRemoveFromCollection}
                    />
                  ))}

                  {/* Groups */}
                  {sortedGroups.map((group) => (
                    <SortableGroup
                      key={group.id}
                      group={group}
                      links={links}
                      appearance={appearance}
                      onEditGroup={handleEditGroup}
                      onDeleteGroup={handleDeleteGroup}
                      onToggleGroup={handleToggleGroup}
                      onAddLinkToGroup={handleAddLinkToGroup}
                      onEditLink={handleEditLink}
                      onDeleteLink={handleDeleteLink}
                      onToggleLink={handleToggleLink}
                      onOpenSettings={handleOpenSettings}
                      onMoveToCollection={handleMoveToCollection}
                      onRemoveFromCollection={handleRemoveFromCollection}
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>

            {/* Empty State */}
            {rootLinks.length === 0 && sortedGroups.length === 0 && (
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderRadius: 3,
                  bgcolor: (theme) => theme.palette.background.paper,
                }}
              >
                <LinkIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No links yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Add your first link to get started
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleAddLink}
                >
                  Add your first link
                </Button>
              </Paper>
            )}

            {/* Footer Toggle */}
            <Card sx={{ mt: 3, borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1">LinkToMe footer</Typography>
                  <Chip
                    label="Pro"
                    size="small"
                    icon={<Lock sx={{ fontSize: 14 }} />}
                    sx={{ height: 20, fontSize: 10 }}
                  />
                </Box>
                <Switch
                  checked={appearanceData?.hideFooter || false}
                  onChange={(e) => handleToggleFooter(e.target.checked)}
                />
              </CardContent>
            </Card>
          </Box>

          {/* Fixed Preview on Right (Desktop) */}
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
              appearance={appearance}
              links={activeLinks}
              groups={sortedGroups}
              profileImageUrl={appearance.profileImageUrl}
              displayName={appearance.header?.displayName}
              username={profileData?.username}
              bio={appearance.header?.bio}
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
        </Container>
      </AdminLayout>

      {/* Link Form Dialog */}
      <LinkForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveLink}
        link={selectedLink}
      />

      {/* Delete Link Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDeleteLink} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Link</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this link?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDeleteLink}>Cancel</Button>
          <Button onClick={handleConfirmDeleteLink} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{selectedGroup ? 'Edit Collection' : 'New Collection'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Collection Name"
            value={newGroupTitle}
            onChange={(e) => setNewGroupTitle(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveGroup} variant="contained" disabled={!newGroupTitle.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Collection Selector Dialog */}
      <Dialog open={collectionSelectorOpen} onClose={() => setCollectionSelectorOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {linkToMove && links.find(l => l.id === linkToMove)?.groupId 
            ? 'Move Link to Collection' 
            : 'Add Link to Collection'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <Paper
              onClick={() => handleSelectCollection(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectCollection(null);
                }
              }}
              tabIndex={0}
              role="button"
              sx={{
                p: 2,
                cursor: 'pointer',
                border: 2,
                borderColor: 'transparent',
                '&:hover': { borderColor: 'primary.light' },
                '&:focus': { borderColor: 'primary.main', outline: 'none' },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <FolderOpen />
                <Typography variant="body2">No Collection (Root Level)</Typography>
              </Stack>
            </Paper>
            {sortedGroups.map((group) => (
              <Paper
                key={group.id}
                onClick={() => handleSelectCollection(group.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectCollection(group.id);
                  }
                }}
                tabIndex={0}
                role="button"
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: 2,
                  borderColor: 'transparent',
                  '&:hover': { borderColor: 'primary.light' },
                  '&:focus': { borderColor: 'primary.main', outline: 'none' },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Folder />
                  <Typography variant="body2">{group.title}</Typography>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCollectionSelectorOpen(false)}>Cancel</Button>
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