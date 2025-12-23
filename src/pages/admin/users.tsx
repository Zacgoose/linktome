import { useState } from 'react';
import { useApiGet } from '@/hooks/useApiQuery';
import Head from 'next/head';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Alert,
  CircularProgress,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuthContext } from '@/providers/AuthProvider';


interface CompanyUser {
  companyDisplayName: string;
  companyEmail: string;
  companyRole: string;
  userId: string;
  // Add any company-specific properties if needed
}

interface CompanyUsersResponse {
  users: CompanyUser[];
}


export default function UsersPage() {
  const { data, isLoading } = useApiGet<CompanyUsersResponse>({
    url: 'admin/GetCompanyUsers',
    queryKey: 'admin-company-users',
  });
  const users = data?.users || [];
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { companyMemberships } = useAuthContext();
  // Assume only one company for now; otherwise, select active companyId from route or context
  const myCompany = companyMemberships && companyMemberships.length > 0 ? companyMemberships[0] : undefined;
  const isAdminOrOwner = myCompany?.role === 'company_owner' || myCompany?.role === 'admin';

  if (isLoading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  const handleInvite = () => {
    setSuccess('Invite sent!');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <>
      <Head>
        <title>Company Members - LinkToMe</title>
      </Head>
      <AdminLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Company Members
          </Typography>

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

          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box mb={2}>
                {isAdminOrOwner && (
                  <Button variant="contained" onClick={handleInvite}>
                    Invite Member
                  </Button>
                )}
              </Box>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Company Role</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>{user.companyDisplayName}</TableCell>
                      <TableCell>{user.companyEmail}</TableCell>
                      <TableCell>{user.companyRole}</TableCell>
                      <TableCell>
                        {isAdminOrOwner && user.companyRole !== 'company_owner' && (
                          <Stack direction="row" spacing={1}>
                            <Button variant="outlined" size="small">Change Role</Button>
                            <Button variant="outlined" size="small" color="error">Remove</Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Container>
      </AdminLayout>
    </>
  );
}
