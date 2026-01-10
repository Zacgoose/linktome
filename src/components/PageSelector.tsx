import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem as MuiMenuItem,
  Typography,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Star,
  Add,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { usePageContext } from '@/context/PageContext';

interface PageSelectorProps {
  compact?: boolean; // For smaller displays
}

export default function PageSelector({ compact = false }: PageSelectorProps) {
  const router = useRouter();
  const { currentPage, pages, isLoading, setCurrentPage } = usePageContext();

  const handleSelectPage = (pageId: string) => {
    if (pageId === '__manage__') {
      router.push('/admin/pages');
      return;
    }
    const page = pages.find(p => p.id === pageId);
    if (page) {
      setCurrentPage(page);
    }
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
    <FormControl size="small" sx={{ minWidth: 220, mr: 2 }}>
      <InputLabel id="page-selector-label">Pages</InputLabel>
      <Select
        labelId="page-selector-label"
        value={currentPage?.id || ''}
        label="Pages"
        onChange={(e) => handleSelectPage(e.target.value)}
        MenuProps={{ PaperProps: { style: { maxHeight: 350 } } }}
      >
        {pages.map((page) => (
          <MuiMenuItem key={page.id} value={page.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2">{page.name}</Typography>
              </Box>
              {page.isDefault && (
                <Chip
                  icon={<Star sx={{ fontSize: 14 }} />}
                  label="Default"
                  size="small"
                  sx={{ height: 20, fontSize: 10 }}
                />
              )}
            </Box>
          </MuiMenuItem>
        ))}
        <Divider sx={{ my: 0.5 }} />
        <MuiMenuItem value="__manage__">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add fontSize="small" />
            <Typography variant="body2">Manage Pages</Typography>
          </Box>
        </MuiMenuItem>
      </Select>
    </FormControl>
  );
}
