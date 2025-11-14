import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Grid,
  Stack,
  IconButton,
  Tooltip,
  Avatar,
  alpha,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Science as ScienceIcon,
  Pending as PendingIcon,
  CheckCircle as CompletedIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import {
  getPendingInvestigations,
  getInvestigationOrders,
  formatCurrency,
  formatDateTime,
  getStatusColor,
} from '../services/investigationApi';
import CreateInvestigationModal from './CreateInvestigationModal';
import './InvestigationManagement.css';

const InvestigationsMain = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  // Data states
  const [pendingRequests, setPendingRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    pendingPayments: 0,
    completedTests: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  // Handle tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'orders') {
      setActiveTab(1); // Switch to All Orders tab
    }
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingData, ordersData] = await Promise.all([
        getPendingInvestigations(30),
        getInvestigationOrders({ limit: 100 }),
      ]);

      setPendingRequests(pendingData.pending_requests || []);
      setOrders(ordersData.results || ordersData || []);

      // Calculate statistics
      const ordersArray = ordersData.results || ordersData || [];
      const stats = {
        totalRequests: (pendingData.pending_requests || []).length + ordersArray.length,
        pendingPayments: ordersArray.filter(o => o.payment_status === 'pending').length,
        completedTests: ordersArray.filter(o => o.payment_status === 'paid').length,
        totalRevenue: ordersArray
          .filter(o => o.payment_status === 'paid')
          .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0),
      };
      setStatistics(stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleViewDetails = (item, type) => {
    if (type === 'pending') {
      navigate(`/investigations/request/${item.investigation_request_id}`);
    } else {
      navigate(`/investigations/order/${item.id}`);
    }
  };

  const filteredPendingRequests = pendingRequests.filter((request) => {
    const query = searchQuery.toLowerCase();
    return (
      request.patient?.name?.toLowerCase().includes(query) ||
      request.patient?.phone_number?.toLowerCase().includes(query) ||
      request.investigations?.some(inv => inv.test_type?.toLowerCase().includes(query))
    );
  });

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    return (
      order.investigation_request?.patient_info?.name?.toLowerCase().includes(query) ||
      order.investigation_request?.investigations?.some(inv => inv.test_type?.toLowerCase().includes(query)) ||
      order.payment_status?.toLowerCase().includes(query)
    );
  });

  const getFilteredOrders = (status) => {
    if (status === 'all') return filteredOrders;
    return filteredOrders.filter(order => order.payment_status === status);
  };

  const StatCard = ({ icon, label, value, color, trend }) => (
    <Card className="stat-card" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Avatar
              sx={{
                bgcolor: alpha(color, 0.1),
                color: color,
                width: 56,
                height: 56,
              }}
            >
              {icon}
            </Avatar>
            {trend && (
              <Chip
                icon={<TrendingUpIcon sx={{ fontSize: 16 }} />}
                label={trend}
                size="small"
                sx={{
                  bgcolor: alpha('#10b981', 0.1),
                  color: '#10b981',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700} color={color}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {label}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  const PendingRequestCard = ({ request }) => (
    <Card className="investigation-card" sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {request.patient?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {request.patient?.phone_number}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(request.created)}
                </Typography>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Tests Requested ({request.total_investigations})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {request.investigations?.slice(0, 3).map((inv, idx) => (
                  <Chip
                    key={idx}
                    label={inv.test_type}
                    size="small"
                    sx={{ bgcolor: alpha('#059669', 0.1), color: '#059669' }}
                  />
                ))}
                {request.total_investigations > 3 && (
                  <Chip
                    label={`+${request.total_investigations - 3} more`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Typography variant="h6" fontWeight={700} color="primary">
                  {formatCurrency(request.total_cost, request.currency)}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => handleViewDetails(request, 'pending')}
                  sx={{ borderRadius: 2 }}
                >
                  View Details
                </Button>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const OrderCard = ({ order }) => (
    <Card className="investigation-card" sx={{ mb: 2 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: alpha('#3b82f6', 0.1), color: '#3b82f6' }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {order.investigation_request?.patient_info?.name || `Patient ${order.patient}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Order #{order.id}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Investigations ({order.investigation_request?.investigations?.length || 0})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {order.investigation_request?.investigations?.slice(0, 2).map((inv, idx) => (
                  <Chip
                    key={idx}
                    label={inv.test_type}
                    size="small"
                    sx={{ bgcolor: alpha('#6366f1', 0.1), color: '#6366f1' }}
                  />
                ))}
                {(order.investigation_request?.investigations?.length || 0) > 2 && (
                  <Chip
                    label={`+${order.investigation_request.investigations.length - 2}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={700} color="primary">
                  {formatCurrency(order.total_amount, order.currency)}
                </Typography>
                <Chip
                  label={order.payment_status}
                  size="small"
                  sx={{
                    bgcolor: alpha(getStatusColor(order.payment_status), 0.1),
                    color: getStatusColor(order.payment_status),
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {formatDateTime(order.created)}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ViewIcon />}
                onClick={() => handleViewDetails(order, 'order')}
                sx={{ borderRadius: 2, mt: 1 }}
              >
                View Order
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box className="investigations-main" sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Investigation Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Request, track, and manage patient investigations
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => setCreateModalOpen(true)}
              sx={{
                borderRadius: 3,
                px: 3,
                py: 1.5,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(37, 99, 235, 0.5)',
                },
              }}
            >
              New Investigation
            </Button>
          </Stack>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<AssignmentIcon sx={{ fontSize: 28 }} />}
              label="Total Requests"
              value={statistics.totalRequests}
              color="#3b82f6"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<PendingIcon sx={{ fontSize: 28 }} />}
              label="Pending Payments"
              value={statistics.pendingPayments}
              color="#f59e0b"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<CompletedIcon sx={{ fontSize: 28 }} />}
              label="Completed Tests"
              value={statistics.completedTests}
              color="#10b981"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<MoneyIcon sx={{ fontSize: 28 }} />}
              label="Total Revenue"
              value={formatCurrency(statistics.totalRevenue)}
              color="#059669"
              trend="+12%"
            />
          </Grid>
        </Grid>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Search Bar */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <TextField
              fullWidth
              placeholder="Search by patient name, phone, or test type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  minHeight: 64,
                },
              }}
            >
              <Tab
                icon={<PendingIcon />}
                iconPosition="start"
                label={`Pending (${filteredPendingRequests.length})`}
              />
              <Tab
                icon={<AssignmentIcon />}
                iconPosition="start"
                label={`All Orders (${filteredOrders.length})`}
              />
              <Tab
                icon={<MoneyIcon />}
                iconPosition="start"
                label={`Pending Payment (${getFilteredOrders('pending').length})`}
              />
              <Tab
                icon={<CompletedIcon />}
                iconPosition="start"
                label={`Paid (${getFilteredOrders('paid').length})`}
              />
            </Tabs>
          </Box>

          <CardContent sx={{ p: 3 }}>
            {/* Pending Requests Tab */}
            {activeTab === 0 && (
              <Box>
                {filteredPendingRequests.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <ScienceIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No pending investigation requests
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Create a new investigation request to get started
                    </Typography>
                  </Box>
                ) : (
                  filteredPendingRequests.map((request) => (
                    <PendingRequestCard key={request.investigation_request_id} request={request} />
                  ))
                )}
              </Box>
            )}

            {/* All Orders Tab */}
            {activeTab === 1 && (
              <Box>
                {filteredOrders.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <AssignmentIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No investigation orders yet
                    </Typography>
                  </Box>
                ) : (
                  filteredOrders.map((order) => <OrderCard key={order.id} order={order} />)
                )}
              </Box>
            )}

            {/* Pending Payment Tab */}
            {activeTab === 2 && (
              <Box>
                {getFilteredOrders('pending').length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <MoneyIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No pending payments
                    </Typography>
                  </Box>
                ) : (
                  getFilteredOrders('pending').map((order) => <OrderCard key={order.id} order={order} />)
                )}
              </Box>
            )}

            {/* Paid Tab */}
            {activeTab === 3 && (
              <Box>
                {getFilteredOrders('paid').length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <CompletedIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No paid orders yet
                    </Typography>
                  </Box>
                ) : (
                  getFilteredOrders('paid').map((order) => <OrderCard key={order.id} order={order} />)
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Create Investigation Modal */}
      <CreateInvestigationModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          loadData();
          setActiveTab(1); // Switch to All Orders tab
        }}
      />
    </Box>
  );
};

export default InvestigationsMain;
