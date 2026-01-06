import { useState } from 'react';
import { useApiGet, useApiPost } from '@/hooks/useApiQuery';
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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuthContext } from '@/providers/AuthProvider';
import { useState as useReactState } from 'react';


interface UserManagerRelationship {
  UserId: string;
  username: string;
  email: string;
  role: string;
  state: string;
  created: string;
  updated: string;
}

interface UserManagerListResponse {
  managers: UserManagerRelationship[];
  managees: UserManagerRelationship[];
}


export default function UsersPage() {
  // Fetch user manager relationships
  const { data: userManagerList, isLoading } = useApiGet<UserManagerListResponse>({
    url: 'admin/UserManagerList',
    queryKey: 'admin-user-manager-list',
  });
  // With backend fixed, managers = users who manage me, managees = users I manage
  const managers: UserManagerRelationship[] = userManagerList?.managers || [];
  const managees: UserManagerRelationship[] = userManagerList?.managees || [];
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useReactState('');
  const inviteRole = 'user_manager';
  const inviteUserManager = useApiPost({
    onSuccess: () => {
      setSuccess('User invite sent!');
      setInviteEmail('');
      refreshAuth();
    },
    onError: (err: unknown) => {
      if (typeof err === 'string') setError(err);
      else if (err instanceof Error) setError(err.message);
      else setError('Failed to send invite');
    },
    relatedQueryKeys: ['admin-user-manager-list'],
  });
  const { refreshAuth } = useAuthContext();


  const userManagerAction = useApiPost({
    onSuccess: () => {
      setSuccess('Action successful!');
      refreshAuth();
    },
    onError: (err: unknown) => {
      if (typeof err === 'string') setError(err);
      else if (err instanceof Error) setError(err.message);
      else setError('Failed to perform action');
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  // --- User Management Handlers ---
  const handleUserInvite = () => {
    setError('');
    setSuccess('');
    inviteUserManager.mutate({
      url: 'admin/UserManagerInvite',
      data: { email: inviteEmail, role: inviteRole },
    });
  };

  const handleUserAction = (UserId: string, action: 'accept' | 'reject' | 'remove') => {
    setError('');
    setSuccess('');
    let url = '';
    let data: any = {};
    if (action === 'accept' || action === 'reject') {
      url = 'admin/UserManagerRespond';
      data = { FromUserId: UserId, State: action === 'accept' ? 'accepted' : 'rejected' };
    } else if (action === 'remove') {
      url = 'admin/UserManagerRemove';
      data = { UserId };
    }
    userManagerAction.mutate({ url, data });
    
  };

  return (
    <>
      <Head>
        <title>User Management - LinkToMe</title>
      </Head>
      <AdminLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
            User Management
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

          {/* User Management Section */}
          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ p: 4 }}>
              <Box mb={2} display="flex" gap={2} alignItems="center">
                <input
                  type="email"
                  placeholder="Invite user by email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  style={{ padding: 8, fontSize: 16, flex: 2 }}
                  disabled={inviteUserManager.isPending || userManagerAction.isPending}
                />
                <Button
                  variant="contained"
                  onClick={handleUserInvite}
                  disabled={!inviteEmail || inviteUserManager.isPending || userManagerAction.isPending}
                >
                  {inviteUserManager.isPending ? 'Inviting...' : 'Invite User Manager'}
                </Button>
              </Box>

              {/* Managed Users Table */}
              <Typography variant="h6" fontWeight={600} gutterBottom color="text.primary" sx={{ mt: 2 }}>
                Your Managers
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>User ID</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {managers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">No managers</TableCell>
                    </TableRow>
                  )}
                  {managers.map((um) => (
                    <TableRow key={um.UserId}>
                      <TableCell>{um.username || '-'}</TableCell>
                      <TableCell>{um.email || '-'}</TableCell>
                      <TableCell>{um.UserId}</TableCell>
                      <TableCell>{um.role}</TableCell>
                      <TableCell>{um.state}</TableCell>
                      <TableCell>
                        <Button size="small" color="error" onClick={() => handleUserAction(um.UserId, 'remove')} disabled={userManagerAction.isPending}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Managees Table */}
              <Typography variant="h6" fontWeight={600} gutterBottom color="text.primary" sx={{ mt: 4 }}>
                Users You Manage
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>User ID</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {managees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">No users</TableCell>
                    </TableRow>
                  )}
                  {managees.map((um) => (
                    <TableRow key={um.UserId}>
                      <TableCell>{um.username || '-'}</TableCell>
                      <TableCell>{um.email || '-'}</TableCell>
                      <TableCell>{um.UserId}</TableCell>
                      <TableCell>{um.role}</TableCell>
                      <TableCell>{um.state}</TableCell>
                      <TableCell>
                        {um.state === 'pending' ? (
                          <>
                            <Button size="small" color="success" onClick={() => handleUserAction(um.UserId, 'accept')} disabled={userManagerAction.isPending}>Accept</Button>
                            <Button size="small" color="error" onClick={() => handleUserAction(um.UserId, 'reject')} disabled={userManagerAction.isPending}>Reject</Button>
                          </>
                        ) : (
                          <Button size="small" color="error" onClick={() => handleUserAction(um.UserId, 'remove')} disabled={userManagerAction.isPending}>Remove</Button>
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
