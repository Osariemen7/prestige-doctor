import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Stack,
  Chip,
  Avatar,
  Divider,
  IconButton,
  alpha,
  CircularProgress,
  Alert,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

import {
  ArrowBack as BackIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Science as ScienceIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Payment as PaymentIcon,
  LocalShipping as DeliveryIcon,
  AccessTime as TimeIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import {
  getPendingInvestigations,
  getInvestigationOrderById,
  getDefaultListings,
  updateInvestigationRequest,
  formatCurrency,
  formatDateTime,
  getStatusColor,
} from '../services/investigationApi';
import CreateInvestigationModal from './CreateInvestigationModal';
import './InvestigationManagement.css';

const InvestigationDetailPage = () => {
  const { type, id } = useParams(); // type: 'request' or 'order'
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    loadData();
  }, [type, id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (type === 'request') {
        const response = await getPendingInvestigations(30);
        const request = response.pending_requests?.find(
          (r) => r.investigation_request_id === parseInt(id)
        );
        if (!request) {
          throw new Error('Investigation request not found');
        }
        setData({ ...request, type: 'request' });
      } else if (type === 'order') {
        const order = await getInvestigationOrderById(id);
        // Normalize order data to match request structure for UI compatibility
        const normalizedOrder = {
          ...order,
          type: 'order',
          // Keep original patient ID and add patient_info for display
          patient: {
            ...order.investigation_request?.patient_info,
            id: order.patient, // Original patient ID
          },
          investigations: order.investigation_request?.investigations || [],
          created: order.created_at,
          total_investigations: order.investigation_request?.investigations?.length || 0,
          currency: order.currency,
          // Ensure checkout_url is preserved - check multiple possible locations
          checkout_url: order.checkout_url || order.investigation_request?.checkout_url,
        };
        console.log('Order data:', order);
        console.log('Normalized order:', normalizedOrder);
        setData(normalizedOrder);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resolveListingForInvestigation = (investigation, availableListings = []) => {
    if (!investigation) return null;
    const match = availableListings.find(
      (listing) =>
        listing?.code?.toLowerCase() === investigation.test_type?.toLowerCase() ||
        listing?.name?.toLowerCase() === investigation.test_type?.toLowerCase()
    );
    let price, currency, code;

    if (match) {
      price = match.price;
      currency = match.currency || 'NGN';
      code = match.code;
    } else {
      price = Number(investigation.cost || 0);
      currency = investigation.currency || 'NGN';
      code = investigation.test_type;
    }

    // Validate that price is greater than zero
    if (price <= 0) {
      throw new Error(`Investigation "${investigation.test_type}" has an invalid price (${price}). Please ensure all investigations have valid prices greater than zero.`);
    }

    return {
      code,
      price,
      currency,
    };
  };

  const buildInvestigationPayloads = (investigationsList, availableListings) =>
    investigationsList.map((inv) => ({
      id: inv.id,
      testType: inv.test_type,
      reason: inv.reason,
      scheduledTime: inv.scheduled_time || new Date().toISOString(),
      listing: resolveListingForInvestigation(inv, availableListings),
    }));

  const handleEdit = () => {
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    // Navigate to orders tab since the investigation request is now an order
    navigate('/investigations?tab=orders');
  };

  const handleCreateOrder = async () => {
    if (!data) return;
    setCreatingOrder(true);
    setError(null);
    try {
      const listingsResponse = await getDefaultListings();
      const availableListings = listingsResponse.listings || [];
      const investigationPayload = buildInvestigationPayloads(
        data.investigations || [],
        availableListings
      );

      await updateInvestigationRequest({
        investigationRequestId: data.investigation_request_id,
        patientId: data.patient?.id || data.patient_id,
        investigations: investigationPayload,
        createOrder: true,
        paymentMethod: data.payment_method || 'out_of_pocket',
      });

      // Navigate to orders tab since the request is now an order
      navigate('/investigations?tab=orders');
    } catch (err) {
      const message = err.message || 'Failed to create order';
      console.error('Order creation error:', message);
      setError(message);
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleViewCheckout = () => {
    console.log('Checkout URL:', data?.checkout_url);
    if (data?.checkout_url) {
      window.open(data.checkout_url, '_blank');
    } else {
      console.warn('No checkout URL available');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Data not found'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/investigations')} sx={{ mt: 2 }}>
          Back to Investigations
        </Button>
      </Container>
    );
  }

  return (
    <Box className="investigation-detail-page" sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/investigations')}
            sx={{ mb: 2, textTransform: 'none' }}
          >
            Back to Investigations
          </Button>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                {type === 'request' ? 'Investigation Request' : 'Investigation Order'} #{id}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {formatDateTime(data.created)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              {type === 'request' && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleEdit}
                    sx={{ borderRadius: 2 }}
                  >
                    Edit Request
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<PaymentIcon />}
                    onClick={handleCreateOrder}
                    sx={{
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    }}
                    disabled={creatingOrder}
                  >
                    {creatingOrder ? 'Creating Order...' : 'Create Order'}
                  </Button>
                </>
              )}
              {type === 'order' && data.checkout_url && (
                <Button
                  variant="contained"
                  startIcon={<PaymentIcon />}
                  onClick={handleViewCheckout}
                  sx={{
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  }}
                >
                  View Checkout
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>

        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid item xs={12} md={8}>
            {/* Patient Information */}
            <Card className="detail-card" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Patient Information
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          width: 64,
                          height: 64,
                          bgcolor: alpha('#3b82f6', 0.1),
                          color: '#3b82f6',
                          fontSize: 28,
                        }}
                      >
                        <PersonIcon fontSize="inherit" />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {data.patient?.name || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Patient ID: {data.patient?.id}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  {data.patient?.phone_number && (
                    <Grid item xs={12} sm={6}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PhoneIcon color="action" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Phone Number
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {data.patient.phone_number}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>
                  )}
                  {data.patient?.email && (
                    <Grid item xs={12} sm={6}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <EmailIcon color="action" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Email Address
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {data.patient.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Investigations List */}
            <Card className="detail-card" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Investigations ({data.investigations?.length || data.total_investigations || 0})
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Stack spacing={2}>
                  {(data.investigations || []).map((inv, idx) => (
                    <Paper
                      key={idx}
                      elevation={0}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: `0 0 0 2px ${alpha('#2563eb', 0.1)}`,
                        },
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6}>
                          <Stack spacing={1}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ScienceIcon color="primary" />
                              <Typography variant="subtitle1" fontWeight={600}>
                                {inv.test_type}
                              </Typography>
                            </Box>
                            {inv.reason && (
                              <Typography variant="body2" color="text.secondary">
                                Reason: {inv.reason}
                              </Typography>
                            )}
                            {inv.listing && (
                              <Typography variant="caption" color="text.secondary">
                                Code: {inv.listing.code} | {inv.listing.name || inv.test_type}
                              </Typography>
                            )}
                          </Stack>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          {inv.scheduled_time && (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {formatDateTime(inv.scheduled_time)}
                              </Typography>
                            </Stack>
                          )}
                          {inv.fulfillment_status && (
                            <Chip
                              label={inv.fulfillment_status}
                              size="small"
                              sx={{
                                mt: 1,
                                bgcolor: alpha(getStatusColor(inv.fulfillment_status), 0.1),
                                color: getStatusColor(inv.fulfillment_status),
                                textTransform: 'capitalize',
                              }}
                            />
                          )}
                        </Grid>
                        <Grid item xs={12} sm={3} sx={{ textAlign: 'right' }}>
                          <Typography variant="h6" fontWeight={700} color="primary">
                            {formatCurrency(inv.cost || inv.listing?.price, data.currency)}
                          </Typography>
                          {inv.quantity > 1 && (
                            <Typography variant="caption" color="text.secondary">
                              Qty: {inv.quantity}
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Timeline (for orders) */}
            {type === 'order' && data.payment_checkpoints && (
              <Card className="detail-card">
                <CardContent>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Order Timeline
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  <Stack spacing={3}>
                    {/* Timeline Item - Order Created */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            backgroundColor: 'primary.main',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            mb: 1,
                          }}
                        >
                          <ReceiptIcon sx={{ fontSize: 20 }} />
                        </Box>
                        {data.payment_checkpoints && data.payment_checkpoints.length > 0 && (
                          <Box sx={{ width: 2, flex: 1, backgroundColor: 'divider', my: 0 }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1, py: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600}>
                          Order Created
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Investigation order initiated
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          {formatDateTime(data.created)}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Payment Checkpoints */}
                    {data.payment_checkpoints.map((checkpoint, idx) => (
                      <Box key={idx} sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              backgroundColor: checkpoint.status === 'paid' ? 'success.main' : 'warning.main',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              mb: 1,
                            }}
                          >
                            <PaymentIcon sx={{ fontSize: 20 }} />
                          </Box>
                          {idx < data.payment_checkpoints.length - 1 && (
                            <Box sx={{ width: 2, flex: 1, backgroundColor: 'divider', my: 0 }} />
                          )}
                        </Box>
                        <Box sx={{ flex: 1, py: 1 }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            Payment {checkpoint.status}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatCurrency(checkpoint.amount, checkpoint.currency)}
                          </Typography>
                          {checkpoint.settled_at && (
                            <Typography variant="caption" display="block" color="success.main" sx={{ mt: 0.5 }}>
                              Settled: {formatDateTime(checkpoint.settled_at)}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {formatDateTime(checkpoint.created)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Right Column - Summary */}
          <Grid item xs={12} md={4}>
            {/* Order Summary */}
            <Card className="summary-card" sx={{ mb: 3, position: 'sticky', top: 20 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {type === 'request' ? 'Request Summary' : 'Order Summary'}
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Stack spacing={2}>
                  {type === 'order' && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Order Status
                      </Typography>
                      <Chip
                        label={data.payment_status}
                        sx={{
                          mt: 0.5,
                          bgcolor: alpha(getStatusColor(data.payment_status), 0.1),
                          color: getStatusColor(data.payment_status),
                          fontWeight: 600,
                          textTransform: 'capitalize',
                        }}
                      />
                    </Box>
                  )}

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Investigations
                    </Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {data.investigations?.length || data.total_investigations || 0}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Subtotal
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {formatCurrency(data.amount || data.total_cost, data.currency)}
                      </Typography>
                    </Stack>
                    {data.total_amount !== data.amount && (
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Additional Fees
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatCurrency(
                            parseFloat(data.total_amount) - parseFloat(data.amount),
                            data.currency
                          )}
                        </Typography>
                      </Stack>
                    )}
                  </Box>

                  <Divider />

                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight={700}>
                        Total Amount
                      </Typography>
                      <Typography variant="h5" fontWeight={700} color="primary">
                        {formatCurrency(data.total_amount || data.total_cost, data.currency)}
                      </Typography>
                    </Stack>
                  </Box>

                  {type === 'order' && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Payment Method
                        </Typography>
                        <Typography variant="body2" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
                          {data.payment_method?.replace('_', ' ')}
                        </Typography>
                      </Box>
                    </>
                  )}

                  {(data.provider || data.investigation_request?.provider_info) && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Requested By
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          Dr. {data.provider?.name || data.investigation_request?.provider_info?.name}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {type === 'order' && data.checkout_url && (
              <Card sx={{ bgcolor: alpha('#f59e0b', 0.05), border: '2px solid #f59e0b' }}>
                <CardContent>
                  <Stack spacing={2} alignItems="center" textAlign="center">
                    <TimeIcon sx={{ fontSize: 48, color: '#f59e0b' }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Payment Pending
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Share the checkout link with the patient to complete payment
                    </Typography>
                    {console.log('Payment status:', data.payment_status, 'Checkout URL:', data.checkout_url)}
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleViewCheckout}
                      sx={{
                        bgcolor: '#f59e0b',
                        '&:hover': { bgcolor: '#d97706' },
                      }}
                    >
                      Open Checkout
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            )}

            {type === 'order' && data.payment_status === 'paid' && (
              <Card sx={{ bgcolor: alpha('#10b981', 0.05), border: '2px solid #10b981' }}>
                <CardContent>
                  <Stack spacing={2} alignItems="center" textAlign="center">
                    <CheckIcon sx={{ fontSize: 48, color: '#10b981' }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Payment Completed
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Order paid on {formatDateTime(data.paid_at)}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Edit Investigation Modal */}
      {data && type === 'request' && (
        <CreateInvestigationModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          editData={{
            id: data.investigation_request_id,
            patient_id: data.patient?.patient_id || data.patient?.id,
            investigations: data.investigations || [],
            create_order: data.create_order || false,
            payment_method: data.payment_method || 'out_of_pocket',
          }}
        />
      )}
    </Box>
  );
};

export default InvestigationDetailPage;
