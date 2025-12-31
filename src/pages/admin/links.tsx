import { useState, useEffect } from 'react';
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
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  DragIndicator as DragIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  Schedule as ScheduleIcon,
  Lock as LockIcon,
  Image as ImageIcon,
  BarChart as AnalyticsIcon,
  MoreHoriz as MoreIcon,
  ContentCopy as CopyIcon,
  Archive as ArchiveIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  ViewModule as LayoutIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Link as LinkIcon,
  Instagram,
  YouTube,
  Twitter,
  Email,
  MusicNote,
  OpenInNew as OpenIcon,
  ShortcutOutlined as RedirectIcon,
  Animation as AnimationIcon,
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
} from '@/types/links';
import { useToast } from '@/context/ToastContext';

// Operation types for bulk API
interface LinkOperation extends Partial<Link> {
  operation: 'add' | 'update' | 'remove';
}

interface GroupOperation extends Partial<LinkGroup> {
  operation: 'add' | 'update' | 'remove';
}

interface UpdateLinksRequest {
  links?: LinkOperation[];
  groups?: GroupOperation[];
}

interface SortableLinkCardProps {
  link: Link;
  onEdit: (link: Link) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onOpenSettings: (link: Link, setting: string) => void;
}

function SortableLinkCard({ link, onEdit, onDelete, onToggle, onOpenSettings }: SortableLinkCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getTrendIcon = () => {
    if (link.clicksTrend === 'up') {
      return <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />;
    } else if (link.clicksTrend === 'down') {
      return <TrendingDownIcon sx={{ fontSize: 14, color: 'text.secondary' }} />;
    }
    return null;
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
            bgcolor: 'grey.50',
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIcon sx={{ color: 'grey.400' }} />
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
              <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <ShareIcon fontSize="small" />
              </IconButton>
              <Switch
                size="small"
                checked={link.active}
                onChange={(e) => onToggle(link.id, e.target.checked)}
                color="success"
              />
            </Stack>
          </Box>

          {/* Quick Actions Row */}
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Tooltip title="Layout">
              <IconButton
                size="small"
                onClick={() => onOpenSettings(link, 'layout')}
                sx={{
                  bgcolor: link.layout && link.layout !== 'classic' ? 'primary.50' : 'grey.100',
                  '&:hover': { bgcolor: 'grey.200' },
                }}
              >
                <LayoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Redirect">
              <IconButton
                size="small"
                onClick={() => onOpenSettings(link, 'redirect')}
                sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
              >
                <RedirectIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Thumbnail">
              <IconButton
                size="small"
                onClick={() => onOpenSettings(link, 'thumbnail')}
                sx={{
                  bgcolor: link.thumbnail ? 'primary.50' : 'grey.100',
                  '&:hover': { bgcolor: 'grey.200' },
                }}
              >
                <ImageIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Animation">
              <IconButton
                size="small"
                onClick={() => onOpenSettings(link, 'animation')}
                sx={{
                  bgcolor: link.animation && link.animation !== 'none' ? 'primary.50' : 'grey.100',
                  '&:hover': { bgcolor: 'grey.200' },
                }}
              >
                <AnimationIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Schedule">
              <IconButton
                size="small"
                onClick={() => onOpenSettings(link, 'schedule')}
                sx={{
                  bgcolor: link.schedule?.enabled ? 'warning.50' : 'grey.100',
                  '&:hover': { bgcolor: 'grey.200' },
                }}
              >
                <ScheduleIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Lock">
              <IconButton
                size="small"
                onClick={() => onOpenSettings(link, 'lock')}
                sx={{
                  bgcolor: link.lock?.enabled ? 'error.50' : 'grey.100',
                  '&:hover': { bgcolor: 'grey.200' },
                }}
              >
                <LockIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Analytics">
              <Badge
                badgeContent={
                  link.clicks !== undefined ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      {link.clicks}
                      {getTrendIcon()}
                    </Box>
                  ) : null
                }
                color="default"
                sx={{
                  '& .MuiBadge-badge': {
                    bgcolor: 'grey.200',
                    color: 'text.primary',
                    fontSize: 10,
                    minWidth: 'auto',
                    height: 16,
                    px: 0.5,
                  },
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => onOpenSettings(link, 'analytics')}
                  sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
                >
                  <AnalyticsIcon fontSize="small" />
                </IconButton>
              </Badge>
            </Tooltip>

            <IconButton
              size="small"
              onClick={() => onDelete(link.id)}
              sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'error.50' } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      </Box>

      {/* Share Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { navigator.clipboard.writeText(link.url); setAnchorEl(null); }}>
          <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Copy link</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { window.open(link.url, '_blank'); setAnchorEl(null); }}>
          <ListItemIcon><OpenIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Open in new tab</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
}

// Sortable Group Component
interface SortableGroupProps {
  group: LinkGroup;
  links: Link[];
  onEditGroup: (group: LinkGroup) => void;
  onDeleteGroup: (id: string) => void;
  onToggleGroup: (id: string, active: boolean) => void;
  onAddLinkToGroup: (groupId: string) => void;
  onEditLink: (link: Link) => void;
  onDeleteLink: (id: string) => void;
  onToggleLink: (id: string, active: boolean) => void;
  onOpenSettings: (link: Link, setting: string) => void;
}

function SortableGroup({
  group,
  links,
  onEditGroup,
  onDeleteGroup,
  onToggleGroup,
  onAddLinkToGroup,
  onEditLink,
  onDeleteLink,
  onToggleLink,
  onOpenSettings,
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
          bgcolor: 'grey.50',
          borderBottom: isCollapsed ? 'none' : '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          {...attributes}
          {...listeners}
          sx={{ cursor: 'grab', mr: 1, '&:active': { cursor: 'grabbing' } }}
        >
          <DragIcon sx={{ color: 'grey.400' }} />
        </Box>

        <IconButton size="small" onClick={() => setIsCollapsed(!isCollapsed)} sx={{ mr: 1 }}>
          {isCollapsed ? <FolderIcon /> : <FolderOpenIcon />}
        </IconButton>

        <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
          {group.title}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Layout">
            <IconButton size="small" sx={{ bgcolor: 'white' }}>
              <LayoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <IconButton size="small" onClick={() => onEditGroup(group)}>
            <EditIcon fontSize="small" />
          </IconButton>

          <IconButton size="small" onClick={() => onAddLinkToGroup(group.id)}>
            <AddIcon fontSize="small" />
          </IconButton>

          <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreIcon fontSize="small" />
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
                  onEdit={onEditLink}
                  onDelete={onDeleteLink}
                  onToggle={onToggleLink}
                  onOpenSettings={onOpenSettings}
                />
              ))}
            </Stack>
          )}
        </Box>
      </Collapse>

      {/* Group Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { onDeleteGroup(group.id); setAnchorEl(null); }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete collection</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
}

export default function LinksPage() {
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<LinkGroup | null>(null);
  const [newGroupTitle, setNewGroupTitle] = useState('');

  // Fetch links and groups
  const { data: linksData, isLoading, refetch } = useApiGet<LinksResponse>({
    url: 'admin/GetLinks',
    queryKey: 'admin-links',
  });

  // Fetch appearance for preview
  const { data: appearanceData } = useApiGet<AppearanceData>({
    url: 'admin/GetAppearance',
    queryKey: 'admin-appearance',
  });

  const [links, setLinks] = useState<Link[]>([]);
  const [groups, setGroups] = useState<LinkGroup[]>([]);

  useEffect(() => {
    if (linksData) {
      setLinks(linksData.links || []);
      setGroups(linksData.groups || []);
    }
  }, [linksData]);

  const appearance = appearanceData || DEFAULT_APPEARANCE;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Bulk update mutation for links and groups
  const updateLinks = useApiPut<any, UpdateLinksRequest>({
    relatedQueryKeys: ['admin-links'],
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
    if (selectedLink) {
      // Update existing link
      updateLinks.mutate({
        url: 'admin/UpdateLinks',
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
        url: 'admin/UpdateLinks',
        data: {
          links: [{
            operation: 'add',
            ...linkData,
            order: maxOrder + 1,
            groupId: selectedGroupId,
            active: true,
          }],
        },
      });
    }
    setFormOpen(false);
  };

  const handleDeleteLink = (id: string) => {
    if (confirm('Are you sure you want to delete this link?')) {
      updateLinks.mutate({
        url: 'admin/UpdateLinks',
        data: {
          links: [{ operation: 'remove', id }],
        },
      });
    }
  };

  const handleToggleLink = (id: string, active: boolean) => {
    updateLinks.mutate({
      url: 'admin/UpdateLinks',
      data: {
        links: [{ operation: 'update', id, active }],
      },
    });
    // Optimistic update
    setLinks(prev => prev.map(l => l.id === id ? { ...l, active } : l));
  };

  const handleAddCollection = () => {
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
    if (!newGroupTitle.trim()) return;

    if (selectedGroup) {
      // Update existing group
      updateLinks.mutate({
        url: 'admin/UpdateLinks',
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
        url: 'admin/UpdateLinks',
        data: {
          groups: [{
            operation: 'add',
            title: newGroupTitle,
            order: maxOrder + 1,
            active: true,
          }],
        },
      });
    }
    setGroupDialogOpen(false);
  };

  const handleDeleteGroup = (id: string) => {
    if (confirm('Are you sure you want to delete this collection? Links inside will be moved out.')) {
      updateLinks.mutate({
        url: 'admin/UpdateLinks',
        data: {
          groups: [{ operation: 'remove', id }],
        },
      });
    }
  };

  const handleToggleGroup = (id: string, active: boolean) => {
    updateLinks.mutate({
      url: 'admin/UpdateLinks',
      data: {
        groups: [{ operation: 'update', id, active }],
      },
    });
    // Optimistic update
    setGroups(prev => prev.map(g => g.id === id ? { ...g, active } : g));
  };

  const handleOpenSettings = (link: Link, setting: string) => {
    setSelectedLink(link);
    setSelectedGroupId(link.groupId || null);
    setFormOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

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
        url: 'admin/UpdateLinks',
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
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 4 }}>
            {/* Main Content */}
            <Box sx={{ flex: 1, minWidth: 0, maxWidth: 640, mx: { xs: 'auto', lg: 0 } }}>
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
                        {appearance.header?.displayName || '@username'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {appearance.header?.bio || 'Your bio goes here'}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {[Instagram, YouTube, Twitter, Email, MusicNote].slice(0, 4).map((Icon, idx) => (
                          <IconButton
                            key={idx}
                            size="small"
                            sx={{
                              color: 'grey.400',
                              '&:hover': { color: 'grey.600', bgcolor: 'grey.100' },
                            }}
                          >
                            <Icon fontSize="small" />
                          </IconButton>
                        ))}
                        <IconButton
                          size="small"
                          sx={{
                            bgcolor: 'grey.100',
                            '&:hover': { bgcolor: 'grey.200' },
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Add Link Button */}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
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
                  startIcon={<FolderIcon />}
                  onClick={handleAddCollection}
                  sx={{ borderRadius: 2 }}
                >
                  Add collection
                </Button>
                <Button
                  variant="text"
                  startIcon={<ArchiveIcon />}
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
                        onEdit={handleEditLink}
                        onDelete={handleDeleteLink}
                        onToggle={handleToggleLink}
                        onOpenSettings={handleOpenSettings}
                      />
                    ))}

                    {/* Groups */}
                    {sortedGroups.map((group) => (
                      <SortableGroup
                        key={group.id}
                        group={group}
                        links={links}
                        onEditGroup={handleEditGroup}
                        onDeleteGroup={handleDeleteGroup}
                        onToggleGroup={handleToggleGroup}
                        onAddLinkToGroup={handleAddLinkToGroup}
                        onEditLink={handleEditLink}
                        onDeleteLink={handleDeleteLink}
                        onToggleLink={handleToggleLink}
                        onOpenSettings={handleOpenSettings}
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
                    startIcon={<AddIcon />}
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
                      icon={<LockIcon sx={{ fontSize: 14 }} />}
                      sx={{ height: 20, fontSize: 10 }}
                    />
                  </Box>
                  <Switch disabled />
                </CardContent>
              </Card>
            </Box>

            {/* Preview */}
            <Box
              sx={{
                display: { xs: 'none', lg: 'block' },
                width: 320,
                position: 'sticky',
                top: 100,
                alignSelf: 'flex-start',
              }}
            >
              <PhonePreview
                appearance={appearance}
                links={activeLinks}
                groups={sortedGroups}
                profileImageUrl={appearance.profileImageUrl}
                displayName={appearance.header?.displayName}
                username="username"
                bio={appearance.header?.bio}
              />
            </Box>
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
    </>
  );
}