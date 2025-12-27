import { Card, CardContent, Box, Typography, IconButton, Stack, Avatar, Chip } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, DragIndicator as DragIcon } from '@mui/icons-material';

interface Link {
  id: string;
  title: string;
  url: string;
  order: number;
  active: boolean;
  icon?: string;
}

interface LinkCardProps {
  link: Link;
  onEdit: (link: Link) => void;
  onDelete: (linkId: string) => void;
}

export default function LinkCard({ link, onEdit, onDelete }: LinkCardProps) {
  return (
    <Card elevation={1} sx={{ '&:hover': { boxShadow: 3 }, opacity: link.active ? 1 : 0.6 }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <DragIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
          
          {link.icon && (
            <Avatar 
              src={link.icon} 
              sx={{ width: 32, height: 32 }}
              variant="rounded"
            />
          )}
          
          <Box flex={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body1" fontWeight={600}>
                {link.title}
              </Typography>
              {!link.active && (
                <Chip label="Inactive" size="small" color="default" />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              {link.url}
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={1}>
            <IconButton 
              size="small" 
              color="primary"
              onClick={() => onEdit(link)}
            >
              <EditIcon />
            </IconButton>
            <IconButton 
              size="small" 
              color="error"
              onClick={() => onDelete(link.id)}
            >
              <DeleteIcon />
            </IconButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
