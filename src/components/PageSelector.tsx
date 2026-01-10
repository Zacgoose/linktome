import { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Chip,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  KeyboardArrowDown,
  Add,
  Star,
  Check,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { usePageContext } from '@/context/PageContext';

interface PageSelectorProps {
  compact?: boolean; // For smaller displays
}

export default function PageSelector({ compact = false }: PageSelectorProps) {
  const router = useRouter();
  const { currentPage, pages, isLoading, setCurrentPage } = usePageContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectPage = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (page) {
      setCurrentPage(page);
    }
    handleClose();
  };

  const handleManagePages = () => {
    router.push('/admin/pages');
    handleClose();
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (!currentPage) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleClick}
        endIcon={<KeyboardArrowDown />}
        sx={{
          color: 'text.primary',
          textTransform: 'none',
          px: 2,
          py: 1,
          borderRadius: 2,
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!compact && (
            <Typography variant="body2" color="text.secondary">
              Page:
            </Typography>
          )}
          <Typography variant="body2" fontWeight={600}>
            {currentPage.name}
          </Typography>
          {currentPage.isDefault && !compact && (
            <Star sx={{ fontSize: 16, color: 'primary.main' }} />
          )}
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: 240,
            mt: 1,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            SELECT PAGE
          </Typography>
        </Box>

        {pages.map((page) => (
          <MenuItem
            key={page.id}
            onClick={() => handleSelectPage(page.id)}
            selected={page.id === currentPage?.id}
          >
            <ListItemText>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">{page.name}</Typography>
                {page.isDefault && (
                  <Chip
                    label="Default"
                    size="small"
                    sx={{ height: 20, fontSize: 10 }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                /{page.slug}
              </Typography>
            </ListItemText>
            {page.id === currentPage?.id && (
              <ListItemIcon sx={{ minWidth: 'auto', ml: 1 }}>
                <Check fontSize="small" color="primary" />
              </ListItemIcon>
            )}
          </MenuItem>
        ))}

        <Divider sx={{ my: 1 }} />

        <MenuItem onClick={handleManagePages}>
          <ListItemIcon>
            <Add fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2">Manage Pages</Typography>
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
