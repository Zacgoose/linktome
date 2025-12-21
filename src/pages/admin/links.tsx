import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';

interface Link {
  id: string;
  title: string;
  url: string;
  order: number;
}

export default function LinksPage() {
  const router = useRouter();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchLinks();
  }, [router]);

  const fetchLinks = async () => {
    try {
      const data = await apiGet('admin/GetLinks');
      setLinks(data.links || []);
    } catch (err) {
      setError('Failed to load links');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLink = async (link: Link) => {
    try {
      if (link.id) {
        await apiPut(`admin/UpdateLink?id=${link.id}`, link);
        setSuccess('Link updated successfully');
      } else {
        await apiPost('admin/CreateLink', link);
        setSuccess('Link created successfully');
      }
      fetchLinks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save link');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      await apiDelete(`admin/DeleteLink?id=${linkId}`);
      setSuccess('Link deleted successfully');
      fetchLinks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete link');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEditClick = (link: Link) => {
    setEditingLink(link);
    setFormOpen(true);
  };

  const handleAddClick = () => {
    setEditingLink(null);
    setFormOpen(true);
  };

  if (loading) {
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
            <Typography variant="h4" fontWeight={700}>
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
