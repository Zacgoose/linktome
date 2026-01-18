import { useState } from 'react';
import Head from 'next/head';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
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
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useApiGet, useApiPost } from '@/hooks/useApiQuery';
import AdminLayout from '@/layouts/AdminLayout';
import { Timer, ListTimersResponse, RunTimerResponse, RunTimerRequest } from '@/types/api';
import { useToast } from '@/context/ToastContext';

export default function TimersPage() {
  const { showToast } = useToast();
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<Timer | null>(null);

  const { data, isLoading, refetch } = useApiGet<ListTimersResponse>({
    url: 'siteadmin/timers',
    queryKey: 'siteadmin-timers',
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  const runTimerMutation = useApiPost<RunTimerResponse, RunTimerRequest>({
    relatedQueryKeys: ['siteadmin-timers'],
    onSuccess: (data) => {
      showToast(`Timer ${data.command} executed successfully`, 'success');
      setRunDialogOpen(false);
      setSelectedTimer(null);
      refetch();
    },
  });

  const handleRunTimer = (timer: Timer) => {
    setSelectedTimer(timer);
    setRunDialogOpen(true);
  };

  const confirmRunTimer = () => {
    if (selectedTimer) {
      runTimerMutation.mutate({
        url: 'siteadmin/runtimer',
        data: { timerId: selectedTimer.id },
      });
    }
  };

  const handleCloseDialog = () => {
    if (!runTimerMutation.isPending) {
      setRunDialogOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'running':
      case 'started':
        return 'info';
      case 'failed':
        return 'error';
      case 'not yet run':
        return 'default';
      default:
        return 'warning';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon fontSize="small" />;
      case 'running':
      case 'started':
        return <CircularProgress size={16} />;
      case 'failed':
        return <ErrorIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <>
      <Head>
        <title>Timer Management - Site Admin - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Timer Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Monitor and manage system timer functions
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </Box>

          {/* Timers List */}
          <Card>
            <CardContent>
              {isLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                  <CircularProgress />
                </Box>
              ) : !data?.timers || data.timers.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    No timers configured
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Timer</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Schedule</TableCell>
                        <TableCell>Last Run</TableCell>
                        <TableCell>Next Run</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.timers.map((timer) => (
                        <TableRow key={timer.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {timer.command}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {timer.description}
                              </Typography>
                              {timer.isSystem && (
                                <Chip
                                  label="System"
                                  size="small"
                                  sx={{ ml: 1, height: 20 }}
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                              {timer.manuallyTriggered && (
                                <Tooltip
                                  title={`Last triggered by ${timer.manuallyTriggeredBy} (${timer.manuallyTriggeredByRole}) at ${formatDate(
                                    timer.manuallyTriggeredAt
                                  )}`}
                                >
                                  <Chip
                                    label="Manual"
                                    size="small"
                                    sx={{ ml: 1, height: 20 }}
                                    color="info"
                                    variant="outlined"
                                  />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={timer.status}
                              color={getStatusColor(timer.status)}
                              size="small"
                              icon={getStatusIcon(timer.status)}
                            />
                            {timer.errorMsg && (
                              <Tooltip title={timer.errorMsg}>
                                <IconButton size="small" color="error">
                                  <WarningIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {timer.cron}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontSize="0.875rem">
                              {formatDate(timer.lastOccurrence)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontSize="0.875rem">
                              {formatDate(timer.nextOccurrence)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={timer.priority} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Run Now">
                              <IconButton
                                color="primary"
                                onClick={() => handleRunTimer(timer)}
                                disabled={
                                  timer.status.toLowerCase() === 'running' ||
                                  timer.status.toLowerCase() === 'started' ||
                                  runTimerMutation.isPending
                                }
                                size="small"
                              >
                                <PlayIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          {data?.timers && data.timers.length > 0 && (
            <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Paper sx={{ p: 2, flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Timers
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {data.count}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Running
                </Typography>
                <Typography variant="h5" fontWeight={600} color="info.main">
                  {
                    data.timers.filter(
                      (t) => t.status.toLowerCase() === 'running' || t.status.toLowerCase() === 'started'
                    ).length
                  }
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Failed
                </Typography>
                <Typography variant="h5" fontWeight={600} color="error.main">
                  {data.timers.filter((t) => t.status.toLowerCase() === 'failed').length}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  System Timers
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {data.timers.filter((t) => t.isSystem).length}
                </Typography>
              </Paper>
            </Box>
          )}
        </Container>

        {/* Run Timer Confirmation Dialog */}
        <Dialog open={runDialogOpen} onClose={handleCloseDialog}>
          <DialogTitle>Run Timer Manually</DialogTitle>
          <DialogContent>
            {selectedTimer && (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This will execute the timer function immediately, bypassing the normal schedule.
                </Alert>
                <Typography variant="body2" gutterBottom>
                  <strong>Command:</strong> {selectedTimer.command}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Description:</strong> {selectedTimer.description}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Current Status:</strong> {selectedTimer.status}
                </Typography>
                {selectedTimer.lastOccurrence && (
                  <Typography variant="body2" gutterBottom>
                    <strong>Last Run:</strong> {formatDate(selectedTimer.lastOccurrence)}
                  </Typography>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={runTimerMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={confirmRunTimer}
              variant="contained"
              color="primary"
              disabled={runTimerMutation.isPending}
              startIcon={runTimerMutation.isPending ? <CircularProgress size={20} /> : <PlayIcon />}
            >
              {runTimerMutation.isPending ? 'Running...' : 'Run Now'}
            </Button>
          </DialogActions>
        </Dialog>
      </AdminLayout>
    </>
  );
}
