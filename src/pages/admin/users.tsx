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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import { Search, Add, Delete, ShoppingCart } from '@mui/icons-material';
import AdminLayout from '../../layouts/AdminLayout';
import { useAuthContext } from '@/providers/AuthProvider';
import { useState as useReactState } from 'react';
import type { SubAccountsResponse, CreateSubAccountRequest, PurchaseUserPackRequest, PurchaseUserPackResponse } from '@/types/api';


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
  const { user, refreshAuth } = useAuthContext();
  
  // Fetch user manager relationships
  const { data: userManagerList, isLoading } = useApiGet<UserManagerListResponse>({
    url: 'admin/UserManagerList',
    queryKey: 'admin-user-manager-list',
  });
  
  // Fetch sub-accounts if user has permission
  const canManageSubAccounts = user?.permissions?.includes('manage:subaccounts') || false;
  const { data: subAccountsData, isLoading: isLoadingSubAccounts } = useApiGet<SubAccountsResponse>({
    url: 'admin/GetSubAccounts',
    queryKey: 'admin-sub-accounts',
    enabled: canManageSubAccounts,
  });
  
  // With backend fixed, managers = users who manage me, managees = users I manage
  const managers: UserManagerRelationship[] = userManagerList?.managers || [];
  const managees: UserManagerRelationship[] = userManagerList?.managees || [];
  const subAccounts = subAccountsData?.subAccounts || [];
  const subAccountLimits = subAccountsData?.limits;
  
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useReactState('');
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const [manageeSearchTerm, setManageeSearchTerm] = useState('');
  const [subAccountSearchTerm, setSubAccountSearchTerm] = useState('');
  
  // User pack management state
  const [packDialogOpen, setPackDialogOpen] = useState(false);
  const [userPackRequest, setUserPackRequest] = useState<PurchaseUserPackRequest>({
    packType: 'starter',
    billingCycle: 'monthly',
  });
  
  // Sub-account creation dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSubAccount, setNewSubAccount] = useState<CreateSubAccountRequest>({
    username: '',
    displayName: '',
  });
  
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

  // User pack mutation
  const purchaseUserPack = useApiPost<PurchaseUserPackResponse>({
    onSuccess: (data) => {
      setSuccess(data.message);
      setPackDialogOpen(false);
      refreshAuth(); // Refresh to get new permissions
    },
    onError: (err: unknown) => {
      if (typeof err === 'string') setError(err);
      else if (err instanceof Error) setError(err.message);
      else setError('Failed to purchase user pack');
    },
    relatedQueryKeys: ['admin-sub-accounts'],
  });

  // Sub-account mutations
  const createSubAccount = useApiPost({
    onSuccess: () => {
      setSuccess('Sub-account created successfully!');
      setCreateDialogOpen(false);
      setNewSubAccount({ username: '', displayName: '' });
      refreshAuth(); // Refresh to get new permissions
    },
    onError: (err: unknown) => {
      if (typeof err === 'string') setError(err);
      else if (err instanceof Error) setError(err.message);
      else setError('Failed to create sub-account');
    },
    relatedQueryKeys: ['admin-sub-accounts'],
  });

  const deleteSubAccount = useApiPost({
    onSuccess: () => {
      setSuccess('Sub-account deleted successfully!');
      refreshAuth(); // Refresh to get new permissions
    },
    onError: (err: unknown) => {
      if (typeof err === 'string') setError(err);
      else if (err instanceof Error) setError(err.message);
      else setError('Failed to delete sub-account');
    },
    relatedQueryKeys: ['admin-sub-accounts'],
  });

  if (isLoading || (canManageSubAccounts && isLoadingSubAccounts)) {
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

  // --- Sub-Account Handlers ---
  const handlePurchaseUserPack = () => {
    setError('');
    setSuccess('');
    purchaseUserPack.mutate({
      url: 'admin/PurchaseUserPack',
      data: userPackRequest as unknown as Record<string, unknown>,
    });
  };

  const handleCreateSubAccount = () => {
    setError('');
    setSuccess('');
    createSubAccount.mutate({
      url: 'admin/CreateSubAccount',
      data: newSubAccount as unknown as Record<string, unknown>,
    });
  };

  const handleDeleteSubAccount = (userId: string) => {
    if (!confirm('Are you sure you want to delete this sub-account? This action cannot be undone.')) {
      return;
    }
    setError('');
    setSuccess('');
    deleteSubAccount.mutate({
      url: 'admin/DeleteSubAccount',
      data: { userId },
    });
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

          {/* User Pack Management Section */}
          {!user?.IsSubAccount && user?.permissions?.includes('write:subscription') && (
            <Card sx={{ mt: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Box>
                    <Typography variant="h6" fontWeight={600} color="text.primary">
                      Agency User Packs
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Purchase a user pack to create and manage sub-accounts
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<ShoppingCart />}
                    onClick={() => setPackDialogOpen(true)}
                    disabled={purchaseUserPack.isPending}
                  >
                    {canManageSubAccounts ? 'Manage Pack' : 'Purchase Pack'}
                  </Button>
                </Box>

                {canManageSubAccounts && subAccountLimits && (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Current Pack: <strong>{subAccountLimits.userPackType || 'None'}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {subAccountLimits.usedSubAccounts} / {subAccountLimits.maxSubAccounts === -1 ? '∞' : subAccountLimits.maxSubAccounts} sub-accounts
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={
                        subAccountLimits.maxSubAccounts === -1 
                          ? 0 
                          : (subAccountLimits.usedSubAccounts / subAccountLimits.maxSubAccounts) * 100
                      }
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                    {subAccountLimits.userPackExpired && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        Your user pack has expired. Please renew to create new sub-accounts.
                      </Alert>
                    )}
                  </Box>
                )}

                {!canManageSubAccounts && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Choose a user pack to get started:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                      <Paper sx={{ p: 2, flex: '1 1 200px', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" fontWeight={600}>Starter</Typography>
                        <Typography variant="h6" color="primary" sx={{ my: 1 }}>3 Sub-Accounts</Typography>
                        <Typography variant="body2" color="text.secondary">$15/month</Typography>
                      </Paper>
                      <Paper sx={{ p: 2, flex: '1 1 200px', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" fontWeight={600}>Business</Typography>
                        <Typography variant="h6" color="primary" sx={{ my: 1 }}>10 Sub-Accounts</Typography>
                        <Typography variant="body2" color="text.secondary">$50/month</Typography>
                      </Paper>
                      <Paper sx={{ p: 2, flex: '1 1 200px', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" fontWeight={600}>Enterprise</Typography>
                        <Typography variant="h6" color="primary" sx={{ my: 1 }}>Custom Limit</Typography>
                        <Typography variant="body2" color="text.secondary">Contact us</Typography>
                      </Paper>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sub-Accounts Section */}
          {canManageSubAccounts && (
            <Card sx={{ mt: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Box>
                    <Typography variant="h6" fontWeight={600} color="text.primary">
                      Sub-Accounts
                    </Typography>
                    {subAccountLimits && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {subAccountLimits.usedSubAccounts} of {subAccountLimits.maxSubAccounts === -1 ? 'Unlimited' : subAccountLimits.maxSubAccounts} sub-accounts used
                        {subAccountLimits.userPackType && ` (${subAccountLimits.userPackType} pack)`}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                    disabled={
                      createSubAccount.isPending ||
                      deleteSubAccount.isPending ||
                      subAccountLimits?.userPackExpired ||
                      (subAccountLimits?.maxSubAccounts !== -1 && 
                       (subAccountLimits?.usedSubAccounts || 0) >= (subAccountLimits?.maxSubAccounts || 0))
                    }
                  >
                    Create Sub-Account
                  </Button>
                </Box>

                {subAccountLimits && subAccountLimits.remainingSubAccounts === 0 && subAccountLimits.maxSubAccounts !== -1 && !subAccountLimits.userPackExpired && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    You have reached your sub-account limit. Upgrade your user pack to create more sub-accounts.
                  </Alert>
                )}

                {subAccountLimits?.userPackExpired && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Your user pack has expired. Please renew to create new sub-accounts. Existing sub-accounts remain accessible.
                  </Alert>
                )}

                <Box sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder="Search sub-accounts..."
                    value={subAccountSearchTerm}
                    onChange={(e) => setSubAccountSearchTerm(e.target.value)}
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
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>Display Name</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>Pages</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>Links</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>Created</TableCell>
                        <TableCell sx={{ fontWeight: 600, py: 2 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(() => {
                        const filteredSubAccounts = subAccounts.filter(sa =>
                          sa.username?.toLowerCase().includes(subAccountSearchTerm.toLowerCase()) ||
                          sa.displayName?.toLowerCase().includes(subAccountSearchTerm.toLowerCase())
                        );
                        if (filteredSubAccounts.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                {subAccountSearchTerm ? 'No sub-accounts found' : 'No sub-accounts yet. Create one to get started!'}
                              </TableCell>
                            </TableRow>
                          );
                        }
                        return filteredSubAccounts.map((sa) => (
                          <TableRow key={sa.userId} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                            <TableCell sx={{ py: 2 }}>{sa.username}</TableCell>
                            <TableCell sx={{ py: 2 }}>{sa.displayName || '-'}</TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Chip 
                                label={sa.status} 
                                size="small" 
                                color={sa.status === 'active' ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>{sa.pagesCount ?? '-'}</TableCell>
                            <TableCell sx={{ py: 2 }}>{sa.linksCount ?? '-'}</TableCell>
                            <TableCell sx={{ py: 2 }}>
                              {sa.createdAt ? new Date(sa.createdAt).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell sx={{ py: 2 }}>
                              <Button 
                                size="small" 
                                color="error" 
                                startIcon={<Delete />}
                                onClick={() => handleDeleteSubAccount(sa.userId)} 
                                disabled={deleteSubAccount.isPending || createSubAccount.isPending}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Create Sub-Account Dialog */}
          <Dialog 
            open={createDialogOpen} 
            onClose={() => !createSubAccount.isPending && setCreateDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Create Sub-Account</DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <Alert severity="info">
                  Notifications for sub-accounts will be sent to your parent account email address.
                </Alert>
                <TextField
                  label="Username"
                  value={newSubAccount.username}
                  onChange={(e) => setNewSubAccount({ ...newSubAccount, username: e.target.value })}
                  placeholder="client-brand"
                  required
                  fullWidth
                  disabled={createSubAccount.isPending}
                  helperText="3-30 characters, alphanumeric, hyphens, and underscores only"
                />
                <TextField
                  label="Display Name (optional)"
                  value={newSubAccount.displayName}
                  onChange={(e) => setNewSubAccount({ ...newSubAccount, displayName: e.target.value })}
                  placeholder="Client Brand Name"
                  fullWidth
                  disabled={createSubAccount.isPending}
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => setCreateDialogOpen(false)} 
                disabled={createSubAccount.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateSubAccount}
                variant="contained"
                disabled={!newSubAccount.username || createSubAccount.isPending}
              >
                {createSubAccount.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Purchase User Pack Dialog */}
          <Dialog 
            open={packDialogOpen} 
            onClose={() => !purchaseUserPack.isPending && setPackDialogOpen(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {canManageSubAccounts ? 'Manage User Pack' : 'Purchase User Pack'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <Alert severity="info">
                  {canManageSubAccounts 
                    ? 'Upgrade, downgrade, or cancel your user pack. You must delete all sub-accounts before cancelling.'
                    : 'Purchase a user pack to create and manage sub-accounts. Your account will be upgraded to Agency Admin.'}
                </Alert>
                
                <FormControl fullWidth>
                  <InputLabel>Pack Type</InputLabel>
                  <Select
                    value={userPackRequest.packType}
                    label="Pack Type"
                    onChange={(e) => setUserPackRequest({ 
                      ...userPackRequest, 
                      packType: e.target.value as any,
                      customLimit: e.target.value === 'enterprise' ? userPackRequest.customLimit : undefined
                    })}
                    disabled={purchaseUserPack.isPending}
                  >
                    <MenuItem value="starter">Starter (3 sub-accounts) - $15/mo</MenuItem>
                    <MenuItem value="business">Business (10 sub-accounts) - $50/mo</MenuItem>
                    <MenuItem value="enterprise">Enterprise (Custom limit) - Contact us</MenuItem>
                    {canManageSubAccounts && (
                      <MenuItem value="none">Cancel Pack</MenuItem>
                    )}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Billing Cycle</InputLabel>
                  <Select
                    value={userPackRequest.billingCycle}
                    label="Billing Cycle"
                    onChange={(e) => setUserPackRequest({ 
                      ...userPackRequest, 
                      billingCycle: e.target.value as any 
                    })}
                    disabled={purchaseUserPack.isPending || userPackRequest.packType === 'none'}
                  >
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="annual">Annual (Save 15%)</MenuItem>
                  </Select>
                </FormControl>

                {userPackRequest.packType === 'enterprise' && (
                  <TextField
                    label="Custom Limit"
                    type="number"
                    value={userPackRequest.customLimit || ''}
                    onChange={(e) => setUserPackRequest({ 
                      ...userPackRequest, 
                      customLimit: parseInt(e.target.value) || undefined 
                    })}
                    placeholder="Enter number of sub-accounts"
                    fullWidth
                    disabled={purchaseUserPack.isPending}
                    helperText="Enter -1 for unlimited sub-accounts"
                  />
                )}

                {userPackRequest.packType === 'none' && (
                  <Alert severity="warning">
                    Cancelling your user pack will downgrade your account to a regular user. You must delete all sub-accounts before cancelling.
                  </Alert>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => setPackDialogOpen(false)} 
                disabled={purchaseUserPack.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handlePurchaseUserPack}
                variant="contained"
                color={userPackRequest.packType === 'none' ? 'error' : 'primary'}
                disabled={purchaseUserPack.isPending}
              >
                {purchaseUserPack.isPending ? 'Processing...' : userPackRequest.packType === 'none' ? 'Cancel Pack' : 'Purchase'}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </AdminLayout>
    </>
  );
}
