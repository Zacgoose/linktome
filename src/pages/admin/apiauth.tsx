import { useState } from 'react';
import Head from 'next/head';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Skeleton,
  Snackbar,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Key as KeyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useApiGet, useApiPost, useApiDelete, useApiPut } from '@/hooks/useApiQuery';
import AdminLayout from '@/layouts/AdminLayout';

interface ApiKey {
  keyId: string;
  name: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt: string | null;
  lastUsedIP: string | null;
}

interface ApiKeysResponse {
  keys: ApiKey[];
  availablePermissions: string[];
  tier: string;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  usage: {
    dailyUsed: number;
    dailyRemaining: number;
    perKey: Record<string, { minuteUsed: number; minuteRemaining: number }>;
  };
}

interface CreateKeyResponse {
  message: string;
  key: {
    keyId: string;
    key: string;
    name: string;
    permissions: string[];
    createdAt: string;
  };
}

function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isHigh = percentage > 80;
  const isMedium = percentage > 50;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {used.toLocaleString()} / {total.toLocaleString()}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        color={isHigh ? 'error' : isMedium ? 'warning' : 'primary'}
        sx={{ height: 8, borderRadius: 1 }}
      />
    </Box>
  );
}

export default function ApiKeysPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);

  const [newKeyName, setNewKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const { data, isLoading, refetch } = useApiGet<ApiKeysResponse>({
    url: 'admin/apikeyslist',
    queryKey: 'api-keys',
    staleTime: 30000,
  });

  const createMutation = useApiPost<CreateKeyResponse>({
    relatedQueryKeys: ['api-keys'],
    onSuccess: (response) => {
      setCreateDialogOpen(false);
      setNewKeyName('');
      setSelectedPermissions([]);
      setNewlyCreatedKey(response.key.key);
      setNewKeyDialogOpen(true);
    },
  });

  const updateMutation = useApiPut({
    relatedQueryKeys: ['api-keys'],
    onSuccess: () => {
      setEditDialogOpen(false);
      setSelectedKey(null);
      setSelectedPermissions([]);
    },
  });

  const deleteMutation = useApiDelete({
    relatedQueryKeys: ['api-keys'],
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setSelectedKey(null);
    },
  });

  const handleCreateKey = () => {
    createMutation.mutate({
      url: 'admin/apikeyscreate',
      data: {
        name: newKeyName,
        permissions: selectedPermissions,
      },
    });
  };

  const handleUpdateKey = () => {
    if (!selectedKey) return;
    updateMutation.mutate({
      url: `admin/apikeysupdate?keyId=${selectedKey.keyId}`,
      data: {
        permissions: selectedPermissions,
      },
    });
  };

  const handleDeleteKey = () => {
    if (!selectedKey) return;
    deleteMutation.mutate({
      url: `admin/apikeysdelete?keyId=${selectedKey.keyId}`,
    });
  };

  const handleEditClick = (key: ApiKey) => {
    setSelectedKey(key);
    setSelectedPermissions(key.permissions);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (key: ApiKey) => {
    setSelectedKey(key);
    setDeleteDialogOpen(true);
  };

  const handleCopyKey = async () => {
    if (newlyCreatedKey) {
      await navigator.clipboard.writeText(newlyCreatedKey);
      setCopySuccess(true);
    }
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminLayout>
      <Head>
        <title>API Keys - LinkToMe</title>
      </Head>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              API Keys
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Manage your API keys for programmatic access
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedPermissions([]);
              setNewKeyName('');
              setCreateDialogOpen(true);
            }}
          >
            Create Key
          </Button>
        </Box>

        {/* Usage & Limits Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">Usage & Limits</Typography>
                <Chip
                  label={data?.tier || 'free'}
                  color="primary"
                  size="small"
                  sx={{ textTransform: 'capitalize' }}
                />
              </Box>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={() => refetch()}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {isLoading ? (
              <Skeleton variant="rectangular" height={60} />
            ) : data ? (
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box sx={{ flex: 1 }}>
                  <UsageBar
                    used={data.usage?.dailyUsed || 0}
                    total={data.rateLimits.requestsPerDay}
                    label="Daily Requests (all keys combined)"
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Per-key limit
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {data.rateLimits.requestsPerMinute} / minute
                  </Typography>
                </Box>
              </Box>
            ) : null}
          </CardContent>
        </Card>

        {/* Keys Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Key ID</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell>Usage (min)</TableCell>
                <TableCell>Last Used</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton width={120} /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton width={200} /></TableCell>
                    <TableCell><Skeleton width={60} /></TableCell>
                    <TableCell><Skeleton width={100} /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                  </TableRow>
                ))
              ) : data?.keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <KeyIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                      <Typography color="text.secondary">
                        No API keys yet. Create one to get started.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                data?.keys.map((key) => {
                  const keyUsage = data.usage?.perKey?.[key.keyId];
                  return (
                    <TableRow key={key.keyId} hover>
                      <TableCell>
                        <Typography fontWeight={500}>{key.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                        >
                          {key.keyId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {key.permissions.length === 0 ? (
                            <Chip label="No permissions" size="small" variant="outlined" />
                          ) : (
                            key.permissions.slice(0, 3).map((perm) => (
                              <Chip
                                key={perm}
                                label={perm}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))
                          )}
                          {key.permissions.length > 3 && (
                            <Chip
                              label={`+${key.permissions.length - 3}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {keyUsage ? (
                          <Tooltip title={`${keyUsage.minuteRemaining} remaining this minute`}>
                            <Typography variant="body2">
                              {keyUsage.minuteUsed} / {data.rateLimits.requestsPerMinute}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(key.lastUsedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit permissions">
                          <IconButton size="small" onClick={() => handleEditClick(key)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete key">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(key)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="Key Name"
              placeholder="e.g., Production App, CI/CD"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              margin="normal"
            />

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Permissions
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
              <FormGroup>
                {data?.availablePermissions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No permissions available
                  </Typography>
                ) : (
                  data?.availablePermissions.map((perm) => (
                    <FormControlLabel
                      key={perm}
                      control={
                        <Checkbox
                          checked={selectedPermissions.includes(perm)}
                          onChange={() => togglePermission(perm)}
                          size="small"
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{perm}</Typography>}
                    />
                  ))
                )}
              </FormGroup>
            </Paper>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleCreateKey}
              disabled={!newKeyName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Key'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit: {selectedKey?.name}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Update permissions for this key.
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
              <FormGroup>
                {data?.availablePermissions.map((perm) => (
                  <FormControlLabel
                    key={perm}
                    control={
                      <Checkbox
                        checked={selectedPermissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{perm}</Typography>}
                  />
                ))}
              </FormGroup>
            </Paper>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleUpdateKey} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete API Key</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This action cannot be undone.
            </Alert>
            <Typography>
              Delete <strong>{selectedKey?.name}</strong>? Applications using this key will lose access immediately.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" color="error" onClick={handleDeleteKey} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* New Key Created Dialog */}
        <Dialog
          open={newKeyDialogOpen}
          onClose={() => {
            setNewKeyDialogOpen(false);
            setNewlyCreatedKey(null);
            setShowKey(false);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <KeyIcon color="success" />
              API Key Created
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <strong>Save this key now!</strong> You won&apos;t be able to see it again.
            </Alert>

            <Paper
              variant="outlined"
              sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, bgcolor: (theme) => theme.palette.background.paper }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  flex: 1,
                  wordBreak: 'break-all',
                  filter: showKey ? 'none' : 'blur(4px)',
                  userSelect: showKey ? 'text' : 'none',
                }}
              >
                {newlyCreatedKey}
              </Typography>
              <IconButton size="small" onClick={() => setShowKey(!showKey)}>
                {showKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
              <IconButton size="small" onClick={handleCopyKey} color="primary">
                <CopyIcon />
              </IconButton>
            </Paper>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Use in the <code>Authorization</code> header:
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, mt: 1, bgcolor: 'grey.900' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'grey.100', fontSize: '0.8rem' }}>
                Authorization: Bearer {'<your-key>'}
              </Typography>
            </Paper>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              onClick={() => {
                setNewKeyDialogOpen(false);
                setNewlyCreatedKey(null);
                setShowKey(false);
              }}
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>

        {/* Copy Success Snackbar */}
        <Snackbar
          open={copySuccess}
          autoHideDuration={2000}
          onClose={() => setCopySuccess(false)}
          message="Copied to clipboard"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
      </Container>
    </AdminLayout>
  );
}