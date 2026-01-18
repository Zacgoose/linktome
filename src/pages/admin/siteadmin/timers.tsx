import { useState, useMemo } from 'react';
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
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Timer status constants
const TIMER_STATUS = {
  COMPLETED: 'completed',
  RUNNING: 'running',
  STARTED: 'started',
  FAILED: 'failed',
  NOT_YET_RUN: 'not yet run',
} as const;

export default function TimersPage() {
  const { showToast } = useToast();
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<Timer | null>(null);

  const { data, isLoading, refetch } = useApiGet<ListTimersResponse>({
    url: 'siteadmin/listtimers',
    queryKey: 'siteadmin-listtimers',
    staleTime: 10000,
    refetchOnWindowFocus: true,
  });

  const runTimerMutation = useApiPost<RunTimerResponse, RunTimerRequest>({
    relatedQueryKeys: ['siteadmin-listtimers'],
    onSuccess: (data) => {
      showToast(`Timer ${data.command} executed successfully`, 'success');
      setRunDialogOpen(false);
      setSelectedTimer(null);
      refetch();
    },
  });

  const showRunTimerDialog = (timer: Timer) => {
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
      setSelectedTimer(null);
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case TIMER_STATUS.COMPLETED:
        return 'success';
      case TIMER_STATUS.RUNNING:
      case TIMER_STATUS.STARTED:
        return 'info';
      case TIMER_STATUS.FAILED:
        return 'error';
      case TIMER_STATUS.NOT_YET_RUN:
        return 'default';
      default:
        return 'warning';
    }
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case TIMER_STATUS.COMPLETED:
        return <CheckCircleIcon fontSize="small" />;
      case TIMER_STATUS.RUNNING:
      case TIMER_STATUS.STARTED:
        return <CircularProgress size={16} />;
      case TIMER_STATUS.FAILED:
        return <ErrorIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleString();
  };

  const formatNullableString = (value: string | null, fallback = 'Unknown') => value ?? fallback;

  const formatManualTriggerTooltip = (timer: Timer) => {
    const by = formatNullableString(timer.manuallyTriggeredBy);
    const role = formatNullableString(timer.manuallyTriggeredByRole);
    const at = formatDate(timer.manuallyTriggeredAt);
    return `Last triggered by ${by} (${role}) at ${at}`;
  };

  // Memoized summary statistics
  const timerStats = useMemo(() => {
    if (!data?.timers) {
      return { total: 0, running: 0, failed: 0, system: 0 };
    }
    return {
      total: data.count,
      running: data.timers.filter(
        (t) => t.status.toLowerCase() === TIMER_STATUS.RUNNING || t.status.toLowerCase() === TIMER_STATUS.STARTED
      ).length,
      failed: data.timers.filter((t) => t.status.toLowerCase() === TIMER_STATUS.FAILED).length,
      system: data.timers.filter((t) => t.isSystem).length,
    };
  }, [data]);

  return (
    <ProtectedRoute requiredPermissions={['read:siteadmin']}>
      <Head>
        <title>Timer Management - Site Admin - LinkToMe</title>
      </Head>

      <AdminLayout>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
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
                                <Tooltip title={formatManualTriggerTooltip(timer)}>
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
                                onClick={() => showRunTimerDialog(timer)}
                                disabled={
                                  timer.status.toLowerCase() === TIMER_STATUS.RUNNING ||
                                  timer.status.toLowerCase() === TIMER_STATUS.STARTED ||
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
                  {timerStats.total}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Running
                </Typography>
                <Typography variant="h5" fontWeight={600} color="info.main">
                  {timerStats.running}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Failed
                </Typography>
                <Typography variant="h5" fontWeight={600} color="error.main">
                  {timerStats.failed}
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  System Timers
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {timerStats.system}
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
    </ProtectedRoute>
  );
}
