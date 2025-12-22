import { Card, CardContent, Box, Typography, IconButton, Stack } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, DragIndicator as DragIcon } from '@mui/icons-material';

interface Link {
  id: string;
  title: string;
  url: string;
  order: number;
}

interface LinkCardProps {
  link: Link;
  onEdit: (link: Link) => void;
  onDelete: (linkId: string) => void;
}

export default function LinkCard({ link, onEdit, onDelete }: LinkCardProps) {
  return (
    <Card elevation={1} sx={{ '&:hover': { boxShadow: 3 } }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <DragIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
          
          <Box flex={1}>
            <Typography variant="body1" fontWeight={600}>
              {link.title}
            </Typography>
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
