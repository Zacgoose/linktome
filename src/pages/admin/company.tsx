import React, { useState } from 'react';
import { useApiGet } from '@/hooks/useApiQuery';
import Head from 'next/head';
import {
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuthContext } from '@/providers/AuthProvider';


interface CompanyPropertiesResponse {
  name: string;
  logo: string;
  description: string;
  integrations?: string;
  // Add any other company properties as needed
}


export default function CompanyPage() {
  const { data, isLoading } = useApiGet<CompanyPropertiesResponse>({
    url: 'admin/GetCompany',
    queryKey: 'admin-company-properties',
  });
  const [success, setSuccess] = useState('');
  const { companyMemberships } = useAuthContext();
  // Assume only one company for now; otherwise, select active companyId from route or context
  const myCompany = companyMemberships && companyMemberships.length > 0 ? companyMemberships[0] : undefined;
  const isOwner = myCompany?.role === 'company_owner' || myCompany?.role === 'admin';


  if (isLoading || !data) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  const company = data;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('Company properties updated!');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <>
      <Head>
        <title>Company Properties - LinkToMe</title>
      </Head>
      <AdminLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Company Properties
          </Typography>

          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={3}>
                  <TextField
                    fullWidth
                    label="Company Name"
                    value={company.name ?? ''}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Logo URL"
                    value={company.logo ?? ''}
                    required
                  />
                  <TextField
                    fullWidth
                    label="Description"
                    value={company.description ?? ''}
                    multiline
                    rows={3}
                  />
                  <TextField
                    fullWidth
                    label="Integrations"
                    value={company.integrations ?? ''}
                    helperText="Comma-separated list of integrations"
                  />
                  {isOwner && (
                    <Button variant="contained" type="submit">
                      Save Changes
                    </Button>
                  )}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </AdminLayout>
    </>
  );
}
