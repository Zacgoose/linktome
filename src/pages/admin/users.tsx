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
  TextField,
  InputAdornment,
  TableContainer,
  Paper,
} from '@mui/material';
import { Search } from '@mui/icons-material';
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
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [manageeSearchTerm, setManageeSearchTerm] = useState('');
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
              <Box sx={{ mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search managers..."
                  value={managerSearchTerm}
                  onChange={(e) => setManagerSearchTerm(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Username</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>User ID</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const filteredManagers = managers.filter(um =>
                        um.username?.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
                        um.email?.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
                        um.UserId.toLowerCase().includes(managerSearchTerm.toLowerCase())
                      );
                      if (filteredManagers.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                              {managerSearchTerm ? 'No managers found' : 'No managers'}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return filteredManagers.map((um) => (
                        <TableRow key={um.UserId} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell sx={{ py: 2 }}>{um.username || '-'}</TableCell>
                          <TableCell sx={{ py: 2 }}>{um.email || '-'}</TableCell>
                          <TableCell sx={{ py: 2 }}>{um.UserId}</TableCell>
                          <TableCell sx={{ py: 2 }}>{um.role}</TableCell>
                          <TableCell sx={{ py: 2 }}>{um.state}</TableCell>
                          <TableCell sx={{ py: 2 }}>
                            <Button size="small" color="error" onClick={() => handleUserAction(um.UserId, 'remove')} disabled={userManagerAction.isPending}>Remove</Button>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Managees Table */}
              <Typography variant="h6" fontWeight={600} gutterBottom color="text.primary" sx={{ mt: 4 }}>
                Users You Manage
              </Typography>
              <Box sx={{ mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search users..."
                  value={manageeSearchTerm}
                  onChange={(e) => setManageeSearchTerm(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Username</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>User ID</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, py: 2 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const filteredManagees = managees.filter(um =>
                        um.username?.toLowerCase().includes(manageeSearchTerm.toLowerCase()) ||
                        um.email?.toLowerCase().includes(manageeSearchTerm.toLowerCase()) ||
                        um.UserId.toLowerCase().includes(manageeSearchTerm.toLowerCase())
                      );
                      if (filteredManagees.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                              {manageeSearchTerm ? 'No users found' : 'No users'}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return filteredManagees.map((um) => (
                        <TableRow key={um.UserId} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell sx={{ py: 2 }}>{um.username || '-'}</TableCell>
                          <TableCell sx={{ py: 2 }}>{um.email || '-'}</TableCell>
                          <TableCell sx={{ py: 2 }}>{um.UserId}</TableCell>
                          <TableCell sx={{ py: 2 }}>{um.role}</TableCell>
                          <TableCell sx={{ py: 2 }}>{um.state}</TableCell>
                          <TableCell sx={{ py: 2 }}>
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
                      ));
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Container>
      </AdminLayout>
    </>
  );
}
