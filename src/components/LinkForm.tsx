import { useState } from 'react';
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
} from '@mui/material';

interface Link {
  id?: string;
  title: string;
  url: string;
  order?: number;
  active?: boolean;
  icon?: string;
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
  const [icon, setIcon] = useState(link?.icon || '');
  const [active, setActive] = useState(link?.active !== undefined ? link.active : true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const linkData: Link = {
      ...(link?.id && { id: link.id }),
      title,
      url,
      active,
      ...(icon && { icon }),
      ...(link?.order !== undefined && { order: link.order }),
    };
    
    onSave(linkData);
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setUrl('');
    setIcon('');
    setActive(true);
    onClose();
  };

  // Reset form when dialog fully closes
  const handleExited = () => {
    if (link) {
      setTitle(link.title);
      setUrl(link.url);
      setIcon(link.icon || '');
      setActive(link.active !== undefined ? link.active : true);
    } else {
      setTitle('');
      setUrl('');
      setIcon('');
      setActive(true);
    }
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
            
            <TextField
              fullWidth
              label="Icon URL (optional)"
              type="url"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              margin="normal"
              placeholder="https://example.com/icon.png"
              helperText="Add an icon to display with your link"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  color="primary"
                />
              }
              label="Active (visible on profile)"
              sx={{ mt: 2 }}
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
