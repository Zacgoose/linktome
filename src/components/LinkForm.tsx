import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';

interface Link {
  id?: string;
  title: string;
  url: string;
  order?: number;
}

interface LinkFormProps {
  open: boolean;
  link?: Link | null;
  onClose: () => void;
  onSave: (link: Link) => void;
}

export default function LinkForm({ open, link, onClose, onSave }: LinkFormProps) {
  const [title, setTitle] = useState(link?.title || '');
  const [url, setUrl] = useState(link?.url || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const linkData: Link = {
      ...(link?.id && { id: link.id }),
      title,
      url,
      ...(link?.order && { order: link.order }),
    };
    
    onSave(linkData);
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setUrl('');
    onClose();
  };

  // Reset form when dialog opens with new data
  const handleExited = () => {
    setTitle(link?.title || '');
    setUrl(link?.url || '');
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      TransitionProps={{
        onExited: handleExited,
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {link ? 'Edit Link' : 'Add New Link'}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              margin="normal"
              placeholder="My Website"
            />
            
            <TextField
              fullWidth
              label="URL"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              margin="normal"
              placeholder="https://example.com"
            />
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {link ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
