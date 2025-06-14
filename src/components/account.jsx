import React, {useState, useRef, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { FiShoppingCart, FiArrowUpRight, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Stack,
    Divider,
    Modal,
    FormControl,
    FormLabel,
    FormHelperText,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Drawer,
    Avatar,
    Chip,
    Paper,
    useMediaQuery,
    Snackbar,
    Alert,
    Container,
    Grid,
    InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { styled } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';

import Sidebar from './sidebar';
import { getAccessToken } from './api';
import { getUser } from './api';
import BuyCreditsModal from './BuyCreditsModal';

// Custom hook to replace useDisclosure
const useDisclosure = (defaultIsOpen = false) => {
    const [isOpen, setIsOpen] = useState(defaultIsOpen);
    const onOpen = () => setIsOpen(true);
    const onClose = () => setIsOpen(false);
    return { isOpen, onOpen, onClose };
};

// Custom toast component to replace Chakra's useToast
const Toast = ({ open, onClose, title, message, severity, duration = 5000 }) => {
    return (
        <Snackbar
            open={open}
            autoHideDuration={duration}
            onClose={onClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
            <Alert
                onClose={onClose}
                severity={severity}
                sx={{ width: '100%' }}
                variant="filled"
            >
                <Typography fontWeight="bold">{title}</Typography>
                {message}
            </Alert>
        </Snackbar>
    );
};

// Custom hook for toast functionality
const useToast = () => {
    const [toast, setToast] = useState({
        open: false,
        title: '',
        message: '',
        severity: 'info',
        duration: 5000
    });

    const showToast = ({ title, description, status, duration = 5000, isClosable = true }) => {
        setToast({
            open: true,
            title: title,
            message: description,
            severity: status,
            duration: duration
        });
    };

    const handleClose = () => {
        setToast({ ...toast, open: false });
    };

    return { 
        toast, 
        showToast: (props) => showToast(props), 
        handleClose 
    };
};

const Account = () => {    const [balance, setBal] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { toast, showToast, handleClose } = useToast();
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [showConfetti, setShowConfetti] = useState(false);
    const theme = useTheme();    
    const userInfo = localStorage.getItem('user-info');
    const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
    const bvnStatus = parsedUserInfo ? parsedUserInfo.user.bvn_verified : "NOT_VERIFIED";
    const userName = parsedUserInfo ? parsedUserInfo.user.name : "User";
    const userEmail = parsedUserInfo ? parsedUserInfo.user.email : "user@example.com";
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const withDraw = async () => {
        if (bvnStatus === "NOT_VERIFIED") {
            showToast({
                title: 'BVN not Verified',
                description: 'Your BVN is not verified. Please verify your BVN to proceed with withdrawals.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            setTimeout(() => {
                navigate('/organization');
            }, 2000);
            return;
        }

        if (!balance || balance.available_balance <= 0) {
            showToast({
                title: 'Invalid Withdrawal Amount',
                description: 'You do not have sufficient balance to withdraw or balance is invalid.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        const dat = {
            amount: balance.available_balance,
        };

        const token = await getAccessToken();

        setLoading(true);
        try {
            const response = await fetch(
                'https://service.prestigedelta.com/banktransfer/',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(dat),
                }
            );

            const result = await response.json();
            setLoading(false);

            if (response.ok) {
                showToast({
                    title: 'Withdrawal Successful',
                    description: result.message || 'Withdrawal request submitted successfully.',
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                });
                fetchData();
            } else {
                let errorMessage = 'Failed to Withdraw.';
                if (result && result.message) {
                    errorMessage = result.message;
                } else if (response.statusText) {
                    errorMessage = `Withdrawal Failed: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            setLoading(false);
            console.error(error);
            showToast({
                title: 'Withdrawal Error',
                description: error.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };    

    const fetchConfetti = async () => {
        try {
            const accessToken = await getAccessToken();
            if (!accessToken) return;

            let response = await fetch("https://service.prestigedelta.com/confetti/", {
                method: "GET",
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });

            if (!response.ok) {
                console.error(`Confetti fetch error: ${response.status}`);
                return;
            }

            const data = await response.json();
            if (data.show_confetti) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 5000);

                if (data.main_message && data.transaction?.transaction_type) {
                    const formattedType = data.transaction.transaction_type
                        .replace(/_/g, ' ')
                        .toUpperCase();

                    showToast({
                        title: formattedType,
                        description: data.main_message,
                        status: 'success',
                        duration: 6000,
                        isClosable: true,
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch confetti", error);
        }
    };

    const fetchData = async () => {
        const accessToken = await getAccessToken();
        if (!accessToken) return;
        setLoading(true);
        try {
            let response = await fetch("https://service.prestigedelta.com/credits/balance/", {
                method: "GET",
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                navigate('/error', { replace: true });
                return;
            }
            const responseData = await response.json();
            setBal(responseData);
            fetchConfetti();
        } catch (error) {
            console.error("Fetching balance failed:", error);
            showToast({
                title: 'Fetch Balance Error',
                description: 'Failed to load balance details.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user-info');
        navigate('/');
    };

    return (
        <>
            {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} numberOfPieces={300} />}
            <Toast 
                open={toast.open} 
                onClose={handleClose} 
                title={toast.title} 
                message={toast.message} 
                severity={toast.severity} 
                duration={toast.duration} 
            />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'grey.100' }}>
                <Box sx={{ flex: '1', overflowY: 'auto' }}>
                    <Sidebar
                        onToggleSidebar={(minimized) => setIsSidebarMinimized(minimized)}
                        onNavigate={(path) => navigate(path)}
                        onLogout={handleLogout}
                    />
                    <Box 
                        sx={{ 
                            ml: { 
                                xs: 0, 
                                md: isSidebarMinimized ? '76px' : '256px' 
                            }, 
                            flex: 1, 
                            transition: 'margin-left 0.3s ease-in-out'
                        }}
                    >
                        <Box sx={{ p: { xs: 2, md: 4 }, overflowY: 'auto' }}>
                            <Box sx={{ display: 'flex', mb: { xs: 3, md: 5 }, alignItems: 'center', justifyContent: 'space-between' }}>
                                <Stack spacing={0.5} alignItems="flex-start">
                                    <Typography 
                                        variant="h4" 
                                        fontWeight="bold" 
                                        color="primary.dark"
                                        sx={{ fontSize: { xs: '1.85rem', md: '2.35rem' } }}
                                    >
                                        Account Dashboard
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                        Welcome back, {userName}!
                                    </Typography>
                                </Stack>
                            </Box>

                            <Stack spacing={{ xs: 3, md: 4 }}>
                                <Paper 
                                    elevation={0}
                                    sx={(theme) => ({
                                        p: { xs: 3, md: 4 },
                                        borderRadius: 3,
                                        textAlign: 'center',
                                        border: `1px solid ${theme.palette.divider}`,
                                        background: `linear-gradient(145deg, ${theme.palette.background.paper} 70%, ${theme.palette.grey[50]} 100%)`,
                                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
                                    })}
                                >
                                    <Typography variant="h6" fontWeight="600" color="text.secondary" mb={1.5}>
                                        Available Credits
                                    </Typography>
                                    {loading && !balance ? (
                                        <Typography variant="h3" fontWeight="bold" color="primary.main">Loading...</Typography>
                                    ) : (
                                        <Typography 
                                            variant="h2" 
                                            fontWeight="bold" 
                                            color="primary.main"
                                            sx={{ fontSize: { xs: '2.75rem', md: '4rem' }, my: 1 }}
                                        >
                                            ${balance && balance.available_balance !== undefined ? (balance.available_balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                        </Typography>
                                    )}
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                        Your current spendable balance.
                                    </Typography>
                                </Paper>

                                <Box sx={{ 
                                    display: 'flex', 
                                    flexDirection: { xs: 'column', md: 'row' }, 
                                    justifyContent: 'center', 
                                    gap: 2
                                }}>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        size="large"
                                        startIcon={<FiShoppingCart />}
                                        onClick={onOpen}
                                        fullWidth={isMobile}
                                        sx={{ 
                                            py: 1.5, 
                                            fontSize: '1rem',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 18px 0 rgba(0,0,0,0.12)',
                                            transition: 'all 0.3s ease-in-out',
                                            '&:hover': { 
                                                boxShadow: '0 6px 24px 0 rgba(0,0,0,0.15)',
                                                transform: 'translateY(-2px)',
                                            }
                                        }}
                                    >
                                        Buy Credits
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        endIcon={<FiArrowUpRight />}
                                        onClick={withDraw}
                                        disabled={loading || (balance && balance.available_balance <= 0)}
                                        fullWidth={isMobile}
                                        sx={{ 
                                            py: 1.5, 
                                            fontSize: '1rem',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 18px 0 rgba(0,0,0,0.12)',
                                            transition: 'all 0.3s ease-in-out',
                                            '&:hover': { 
                                                boxShadow: '0 6px 24px 0 rgba(0,0,0,0.15)',
                                                transform: 'translateY(-2px)',
                                            },
                                            '&.Mui-disabled': {
                                                backgroundColor: 'grey.300',
                                                boxShadow: 'none',
                                            }
                                        }}
                                    >
                                        {loading ? 'Processing...' : 'Withdraw Funds'}
                                    </Button>
                                </Box>
                                <Paper 
                                    elevation={0}
                                    sx={(theme) => ({
                                        p: { xs: 3, md: 4 },
                                        borderRadius: 3,
                                        border: `1px solid ${theme.palette.divider}`,
                                        background: theme.palette.background.paper,
                                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
                                    })}
                                >
                                    <Typography variant="h5" fontWeight="bold" color="text.primary" mb={3}>
                                        Transaction History
                                    </Typography>
                                    <Stack divider={<Divider sx={{ borderColor: 'grey.200' }} />} spacing={0}>
                                        {balance && balance.transactions && balance.transactions.length > 0 ? (
                                            balance.transactions.map((transaction) => {
                                                let transactionIcon;
                                                let iconColor;
                                                if (transaction.type === 'CR') {
                                                    transactionIcon = FiTrendingUp;
                                                    iconColor = "success.main";
                                                } else if (transaction.type === 'DR') {
                                                    transactionIcon = FiTrendingDown;
                                                    iconColor = "error.main";
                                                } else {
                                                    transactionIcon = FiTrendingUp;
                                                    iconColor = "text.disabled";
                                                }
                                                return (
                                                    <Box 
                                                        key={transaction.id} 
                                                        sx={(theme) => ({ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center', 
                                                            py: 2.5,
                                                            px: 2,
                                                            borderRadius: 2, 
                                                            transition: 'background-color 0.2s ease-in-out, transform 0.2s ease-in-out',
                                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                                            '&:last-child': {
                                                                borderBottom: 'none',
                                                            },
                                                            '&:hover': { 
                                                                bgcolor: theme.palette.action.hover,
                                                                transform: 'translateX(4px)', 
                                                            } 
                                                        })}
                                                    >
                                                        <Stack direction="row" spacing={2.5} alignItems="center">
                                                            <Box 
                                                                component={transactionIcon} 
                                                                sx={{ 
                                                                    color: iconColor, 
                                                                    fontSize: 28,
                                                                    bgcolor: alpha(iconColor, 0.1),
                                                                    p: 1,
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }} 
                                                            />
                                                            <Box>
                                                                <Typography fontWeight="medium" color="text.primary" variant="body1">
                                                                    {transaction.description}
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(transaction.created_at).toLocaleDateString()}
                                                                </Typography>
                                                            </Box>
                                                        </Stack>
                                                        <Typography
                                                            fontWeight="bold"
                                                            color={iconColor}
                                                            variant="h6"
                                                            sx={{ ml: 2, textAlign: 'right' }}
                                                        >
                                                            {transaction.type === 'CR'
                                                                ? '+'
                                                                : transaction.type === 'DR'
                                                                    ? '-'
                                                                    : ''} ${Math.abs(parseFloat(transaction.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </Typography>
                                                    </Box>
                                                );
                                            })
                                        ) : (
                                            <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 2 }}>
                                                No transactions available.
                                            </Box>
                                        )}
                                    </Stack>
                                </Paper>
                            </Stack>                            {/* We're using the BuyCreditsModal component instead of inline dialogs/drawers */}
                        </Box>
                    </Box>
                </Box>
            </Box>
            <BuyCreditsModal
                open={isOpen}
                onClose={onClose}
                balance={balance}
            />
        </>
    );
};

export default Account;

// Helper function for alpha (if not available from theme directly in this context)
const alpha = (color, opacity) => {
    if (color.startsWith('#')) {
        const [r, g, b] = color.match(/\w\w/g).map((hex) => parseInt(hex, 16));
        return `rgba(${r},${g},${b},${opacity})`;
    }
    if (color.includes('.')) {
        return `rgba(0,0,0, ${opacity})`;
    }
    return color;
};