import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

interface NoPageDialogProps {
  open: boolean;
  onClose: () => void;
}

// No-op function - dialog should only be closed via the button
const NOOP = () => {};

/**
 * Dialog that appears when user tries to access features that require a page
 * but they haven't created any pages yet.
 */
export default function NoPageDialog({ open, onClose }: NoPageDialogProps) {
  return (
    <Dialog 
      open={open} 
      onClose={NOOP} // Prevent closing via backdrop or ESC key
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle>Create a Page First</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          Before you can add links, you need to create at least one page. Pages are like different link collections that you can share with different audiences.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          For example, you might have one page for personal links and another for business links.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose} 
          variant="contained" 
          fullWidth
        >
          Go to Pages
        </Button>
      </DialogActions>
    </Dialog>
  );
}
