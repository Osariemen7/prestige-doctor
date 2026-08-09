import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowForward as ArrowForwardIcon,
  MedicalServices as ServiceIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { listDoctorClinicalServiceOrders } from '../services/doctorCareLoopApi';
import {
  formatDoctorDateTime,
  formatDoctorLabel,
  getOrderAuthorityAction,
  getOrderId,
  getOrderPatientLabel,
  getOrderProposalId,
  getOrderServerState,
  getOrderStateVersion,
  getTransitionEvidenceGaps,
} from '../utils/doctorCareLoopViewUtils';

const getEvidenceGapCount = (order) => {
  return getTransitionEvidenceGaps(order).length;
};

const DoctorClinicalServices = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [orders, setOrders] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const nextCursorRef = useRef(null);

  const loadOrders = useCallback(async ({ append = false } = {}) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const payload = await listDoctorClinicalServiceOrders({
        status: status || undefined,
        cursor: append ? nextCursorRef.current : undefined,
      });
      setOrders((current) => append ? [...current, ...payload.results] : payload.results);
      setNextCursor(payload.next_cursor);
      nextCursorRef.current = payload.next_cursor;
    } catch (requestError) {
      setError(requestError.message || 'Clinical-service queue is unavailable from the server.');
      if (!append) setOrders([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [status]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleOpenOrder = (order) => {
    const orderId = getOrderId(order);
    if (orderId) navigate(`/clinical-services/${encodeURIComponent(orderId)}`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1180, mx: 'auto', width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Clinical services</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Doctor-scoped clinician-service work from the server clinical queue.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Ordering and priority come from the existing clinical queue policy; no client-side ranking is applied.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="clinical-service-status-label">Status</InputLabel>
            <Select
              labelId="clinical-service-status-label"
              value={status}
              label="Status"
              onChange={(event) => setStatus(event.target.value)}
            >
              <MenuItem value="">All server states</MenuItem>
              <MenuItem value="pending_clinician">Pending clinician</MenuItem>
              <MenuItem value="needs_information">Needs information</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadOrders()}
            disabled={loading || loadingMore}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={700}>Clinical-service queue unavailable</Typography>
          <Typography variant="body2">{error}</Typography>
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            No cached or client-created order is shown. Refresh after the doctor collection endpoint is enabled.
          </Typography>
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress aria-label="Loading clinical services" /></Box>
      ) : orders.length === 0 ? (
        <Card variant="outlined">
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <ServiceIcon color="disabled" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h6">No clinician-service orders returned</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              The server returned no orders for this doctor scope and filter.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {orders.map((order, index) => {
            const orderId = getOrderId(order);
            const serverState = getOrderServerState(order);
            const evidenceGapCount = getEvidenceGapCount(order);
            const authorityAction = getOrderAuthorityAction(order);
            const proposalId = getOrderProposalId(order);
            const stateVersion = getOrderStateVersion(order);
            return (
              <Card key={orderId || `clinical-service-${index}`} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                        <Typography variant="h6" fontWeight={700}>{order.sku || order.name || 'Clinician service'}</Typography>
                        <Chip size="small" label={formatDoctorLabel(serverState)} color={serverState === 'completed' ? 'success' : 'default'} variant="outlined" />
                        <Chip size="small" label={authorityAction ? 'Decision route linked' : 'Decision route not issued'} color={authorityAction ? 'info' : 'default'} variant="outlined" />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        {getOrderPatientLabel(order)} · {formatDoctorLabel(order.modality || order.service_class)}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => handleOpenOrder(order)}
                      disabled={!orderId}
                    >
                      Open service
                    </Button>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.75, sm: 3 }}>
                    <Typography variant="body2"><strong>Due:</strong> {formatDoctorDateTime(order.due_at || order.due_time)}</Typography>
                    <Typography variant="body2"><strong>Evidence gaps:</strong> {evidenceGapCount}</Typography>
                    <Typography variant="body2"><strong>Proposal:</strong> {proposalId || 'Not linked by server'}</Typography>
                    {stateVersion && <Typography variant="body2"><strong>State version:</strong> {stateVersion}</Typography>}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
          {nextCursor && (
            <Button variant="outlined" onClick={() => loadOrders({ append: true })} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more server results'}
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default DoctorClinicalServices;
