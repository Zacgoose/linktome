import { useState } from 'react';
import Head from 'next/head';
import {
  Container,
  Typography,
  Button,
  Box,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import AdminLayout from '@/layouts/AdminLayout';
import LinkCard from '@/components/LinkCard';
import LinkForm from '@/components/LinkForm';
import { useApiGet, useApiPost } from '@/hooks/useApiQuery';

// Using operation-based bulk updates (add, update, remove) to match backend API structure

interface Link {
  id: string;
  title: string;
  url: string;
  order: number;
  active: boolean;
  icon?: string;
}

interface LinksResponse {
  links: Link[];
}

export default function LinksPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data, isLoading } = useApiGet<LinksResponse>({
    url: 'admin/GetLinks',
    queryKey: 'admin-links',
  });

  const createLink = useApiPost({
    relatedQueryKeys: ['admin-links'],
    onSuccess: () => {
      setSuccess('Link created successfully');
      setTimeout(() => setSuccess(''), 3000);
      setFormOpen(false);
      setEditingLink(null);
    },
    onError: (error) => {
      setError(error);
      setTimeout(() => setError(''), 5000);
    },
  });

  const updateLink = useApiPost({
    relatedQueryKeys: ['admin-links'],
    onSuccess: () => {
      setSuccess('Link updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      setFormOpen(false);
      setEditingLink(null);
    },
    onError: (error) => {
      setError(error);
      setTimeout(() => setError(''), 5000);
    },
  });

  const deleteLink = useApiPost({
    relatedQueryKeys: ['admin-links'],
    onSuccess: () => {
      setSuccess('Link deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error);
      setTimeout(() => setError(''), 5000);
    },
  });

  const links = data?.links || [];

  const handleSaveLink = (link: { id?: string; title: string; url: string; order?: number; active?: boolean; icon?: string }) => {
    // Determine the next order - use max existing order + 1 to avoid gaps
    const nextOrder = link.order !== undefined 
      ? link.order 
      : Math.max(...links.map(l => l.order || 0), 0) + 1;
    
    if (link.id) {
      // Update existing link
      updateLink.mutate({ 
        url: 'admin/UpdateLinks', 
        data: { 
          links: [{
            operation: 'update',
            id: link.id,
            title: link.title,
            url: link.url,
            order: nextOrder,
            active: link.active !== undefined ? link.active : true,
            ...(link.icon && { icon: link.icon }),
          }]
        } 
      });
    } else {
      // Add new link
      createLink.mutate({ 
        url: 'admin/UpdateLinks', 
        data: { 
          links: [{
            operation: 'add',
            title: link.title,
            url: link.url,
            order: nextOrder,
            active: true,
            ...(link.icon && { icon: link.icon }),
          }]
        } 
      });
    }
  };

  const handleDeleteLink = (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;
    deleteLink.mutate({ 
      url: 'admin/UpdateLinks', 
      data: { 
        links: [{
          operation: 'remove',
          id: linkId,
        }]
      } 
    });
  };

  const handleEditClick = (link: Link) => {
    setEditingLink(link);
    setFormOpen(true);
  };

  const handleAddClick = () => {
    setEditingLink(null);
    setFormOpen(true);
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
        <title>Manage Links - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              Manage Links
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddClick}
            >
              Add Link
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {links.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No links yet
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Add your first link to get started
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick}>
                Add Link
              </Button>
            </Box>
          ) : (
            <Stack spacing={2}>
              {links
                .sort((a, b) => a.order - b.order)
                .map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteLink}
                  />
                ))}
            </Stack>
          )}

          <LinkForm
            open={formOpen}
            link={editingLink}
            onClose={() => {
              setFormOpen(false);
              setEditingLink(null);
            }}
            onSave={handleSaveLink}
          />
        </Container>
      </AdminLayout>
    </>
  );
}
