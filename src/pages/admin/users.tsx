import { useState } from 'react';
import { useApiGet, useApiPost } from '@/hooks/useApiQuery';
import { useRbacContext } from '@/context/RbacContext';
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
import { useState as useReactState } from 'react';


interface CompanyUser {
  companyDisplayName: string;
  companyEmail: string;
  companyRole: string;
  userId: string;
  // Add any company-specific properties if needed
}


interface UserManagerRelationship {
  userId: string;
  role: string;
  state: string;
  created: string;
  updated: string;
}

interface CompanyUsersResponse {
  users: CompanyUser[];
}

interface UserManagerListResponse {
  managers: UserManagerRelationship[];
  managees: UserManagerRelationship[];
}


export default function UsersPage() {
  const { selectedContext } = useRbacContext();
  const { data: companyData, isLoading } = useApiGet<CompanyUsersResponse>({
    url: 'admin/GetCompanyUsers',
    queryKey: ['admin-company-users', selectedContext],
  });
  const users = companyData?.users || [];

  // Fetch user manager relationships
  const { data: userManagerList } = useApiGet<UserManagerListResponse>({
    url: 'admin/UserManagerList',
    queryKey: ['admin-user-manager-list', selectedContext],
  });
  const managers: UserManagerRelationship[] = userManagerList?.managers || [];
  const managedUsers: UserManagerRelationship[] = userManagerList?.managees || [];
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
  });
  const { companyMemberships, refreshAuth } = useAuthContext();
  // Assume only one company for now; otherwise, select active companyId from route or context
  const myCompany = companyMemberships && companyMemberships.length > 0 ? companyMemberships[0] : undefined;
  const isAdminOrOwner = myCompany?.role === 'company_owner' || myCompany?.role === 'admin';


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

  const handleUserAction = (userId: string, action: 'accept' | 'reject' | 'remove') => {
    setError('');
    setSuccess('');
    let url = '';
    if (action === 'accept') url = 'admin/UserManagementAccept';
    else if (action === 'reject') url = 'admin/UserManagementReject';
    else if (action === 'remove') url = 'admin/UserManagementRemove';
    userManagerAction.mutate({ url, data: { userId } });
  };

  return (
    <>
      <Head>
        <title>Company Members - LinkToMe</title>
      </Head>
      <AdminLayout>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
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

          {/* Company Members Table (existing) */}
          <Card sx={{ mt: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box mb={2}>
                {isAdminOrOwner && (
                  <Button variant="contained" onClick={() => {}} disabled>
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

          {/* --- User Management Section --- */}
          <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary" sx={{ mt: 6 }}>
            User Management
          </Typography>
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
                Users You Manage
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User ID</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {managedUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">No users</TableCell>
                    </TableRow>
                  )}
                  {managedUsers.map((um) => (
                    <TableRow key={um.userId}>
                      <TableCell>{um.userId}</TableCell>
                      <TableCell>{um.role}</TableCell>
                      <TableCell>{um.state}</TableCell>
                      <TableCell>
                        {um.state === 'pending' ? (
                          <>
                            <Button size="small" onClick={() => handleUserAction(um.userId, 'remove')} disabled={userManagerAction.isPending}>Cancel</Button>
                          </>
                        ) : (
                          <Button size="small" color="error" onClick={() => handleUserAction(um.userId, 'remove')} disabled={userManagerAction.isPending}>Remove</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Managers Table */}
              <Typography variant="h6" fontWeight={600} gutterBottom color="text.primary" sx={{ mt: 4 }}>
                Your Managers
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>User ID</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {managers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">No managers</TableCell>
                    </TableRow>
                  )}
                  {managers.map((um) => (
                    <TableRow key={um.userId}>
                      <TableCell>{um.userId}</TableCell>
                      <TableCell>{um.role}</TableCell>
                      <TableCell>{um.state}</TableCell>
                      <TableCell>
                        {um.state === 'pending' ? (
                          <>
                            <Button size="small" color="success" onClick={() => handleUserAction(um.userId, 'accept')} disabled={userManagerAction.isPending}>Accept</Button>
                            <Button size="small" color="error" onClick={() => handleUserAction(um.userId, 'reject')} disabled={userManagerAction.isPending}>Reject</Button>
                          </>
                        ) : (
                          <Button size="small" color="error" onClick={() => handleUserAction(um.userId, 'remove')} disabled={userManagerAction.isPending}>Remove</Button>
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
