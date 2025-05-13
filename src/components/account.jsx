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

const Account = () => {
    const [balance, setBal] = useState(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { toast, showToast, handleClose } = useToast();
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [buyCreditsAmountNgn, setBuyCreditsAmountNgn] = useState('');
    const [usdCredits, setUsdCredits] = useState(0);
    const [isBuyingCredits, setIsBuyingCredits] = useState(false);
    const [isBuyCreditsAmountValid, setIsBuyCreditsAmountValid] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [minNgnToBuy, setMinNgnToBuy] = useState(5000); // Default fallback
    const theme = useTheme();    
    const userInfo = localStorage.getItem('user-info');
    const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
    const bvnStatus = parsedUserInfo ? parsedUserInfo.user.bvn_verified : "NOT_VERIFIED";
    const userName = parsedUserInfo ? parsedUserInfo.user.name : "User";
    const userEmail = parsedUserInfo ? parsedUserInfo.user.email : "user@example.com";

    const url = 'https://health.prestigedelta.com/paystack/';
    const callback_url = 'https://prestige-health.vercel.app/components/callback';

    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    // Update minNgnToBuy when balance.ngn_rate changes
    useEffect(() => {
        if (balance && balance.ngn_rate) {
            setMinNgnToBuy(Math.ceil(10 * balance.ngn_rate));
        }
    }, [balance]);

    const handleBuyCreditsOpen = () => {
        setBuyCreditsAmountNgn('');
        setIsBuyCreditsAmountValid(false);
        setUsdCredits(0);
        onOpen();
    };

    useEffect(() => {
        const rate = balance && balance.ngn_rate ? balance.ngn_rate : 1500;
        const amount = parseInt(buyCreditsAmountNgn, 10) || 0;
        setUsdCredits(rate ? amount / rate : 0);
        setIsBuyCreditsAmountValid(amount >= minNgnToBuy);
    }, [buyCreditsAmountNgn, balance, minNgnToBuy]);

    const handleBuyCredits = async () => {
        const users = await getUser();
        const phone_number = users.phone_number;
        const email = users.email;
        let amount = buyCreditsAmountNgn;
        const item = { email, phone_number, amount, callback_url };

        let result = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify(item),
        });

        if (result.status !== 200) {
            const errorResult = await result.json();
            showToast({
                title: 'Credits Purchase Unsuccessful',
                description: `${errorResult}`,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } else {
            const responseData = await result.json();

            if (responseData.data && responseData.data.authorization_url) {
                window.location.href = responseData.data.authorization_url;
            } else {
                showToast({
                    title: 'Credits Purchase Unsuccessful',
                    description: `Failed to retrieve Paystack authorization url`,
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    };

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
                'https://health.prestigedelta.com/banktransfer/',
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

            let response = await fetch("https://health.prestigedelta.com/confetti/", {
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
            let response = await fetch("https://health.prestigedelta.com/balance/", {
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
                                        onClick={handleBuyCreditsOpen}
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
                            </Stack>
                            {isMobile ? (
                                <Drawer
                                    anchor="bottom"
                                    open={isOpen}
                                    onClose={onClose}
                                    PaperProps={{
                                        sx: { 
                                            borderTopLeftRadius: 20,
                                            borderTopRightRadius: 20,
                                            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                                        }
                                    }}
                                >
                                    <Box sx={{ p: 1, textAlign: 'right' }}>
                                        <IconButton onClick={onClose} size="medium">
                                            <CloseIcon />
                                        </IconButton>
                                    </Box>
                                    <Box sx={{ px: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="h6" fontWeight="bold" color="primary.main" textAlign="center">
                                            Buy Credits
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                                        <Stack spacing={3}>
                                            <FormControl error={!isBuyCreditsAmountValid && buyCreditsAmountNgn !== ''} fullWidth>
                                                <FormLabel sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                                                    Enter Amount in NGN
                                                </FormLabel>
                                                <TextField
                                                    value={buyCreditsAmountNgn}
                                                    onChange={(e) => setBuyCreditsAmountNgn(e.target.value)}
                                                    placeholder={`Minimum NGN ${minNgnToBuy.toLocaleString()}`}
                                                    type="number"
                                                    inputProps={{ 
                                                        min: minNgnToBuy,
                                                        style: { padding: '14px 14px', fontSize: '1rem' }
                                                    }}
                                                    fullWidth
                                                    variant="outlined"
                                                    size="medium"
                                                    sx={{ borderRadius: 2 }}
                                                />
                                                {!isBuyCreditsAmountValid && buyCreditsAmountNgn !== '' && (
                                                    <FormHelperText error>
                                                        {`Minimum amount to buy credits is NGN ${minNgnToBuy.toLocaleString()}.`}
                                                    </FormHelperText>
                                                )}
                                            </FormControl>
                                            <Paper 
                                                elevation={0} 
                                                sx={(theme) => ({ 
                                                    textAlign: 'center', 
                                                    p: 2.5,
                                                    bgcolor: theme.palette.primary.lighter, 
                                                    borderRadius: 2,
                                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                                })}
                                            >
                                                <Typography variant="body1" color="text.secondary" sx={{ mb: 0.5 }}>
                                                    You will receive approximately:
                                                </Typography>
                                                <Typography variant="h4" fontWeight="bold" color="primary.main" sx={{ my: 0.5 }}>
                                                    ${usdCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {balance && balance.ngn_rate ? `Rate: ${balance.ngn_rate.toLocaleString()} NGN = 1 USD` : '(Rate: 1,500 NGN = 1 USD)'}
                                                </Typography>
                                            </Paper>
                                        </Stack>
                                    </Box>
                                    <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                        <Stack direction="row" spacing={1.5} width="100%">
                                            <Button 
                                                variant="outlined" 
                                                onClick={onClose} 
                                                fullWidth
                                                size="large"
                                                sx={{ py: 1.25, borderRadius: '10px', flex: 1 }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="contained"
                                                color="success"
                                                onClick={handleBuyCredits}
                                                disabled={!isBuyCreditsAmountValid || isBuyingCredits}
                                                fullWidth
                                                size="large"
                                                sx={{ py: 1.25, borderRadius: '10px', flex: 1 }}
                                            >
                                                {isBuyingCredits ? 'Processing...' : 'Buy Credits'}
                                            </Button>
                                        </Stack>
                                    </Box>
                                </Drawer>
                            ) : (
                                <Dialog 
                                    open={isOpen} 
                                    onClose={onClose}
                                    maxWidth="sm"
                                    fullWidth
                                    PaperProps={{
                                        sx: { borderRadius: 2 }
                                    }}
                                >
                                    <DialogTitle sx={{ 
                                        textAlign: 'center', 
                                        fontWeight: 'bold',
                                        borderBottom: '1px solid',
                                        borderColor: 'divider',
                                        py: 2.5
                                    }}>
                                        Buy Credits
                                        <IconButton
                                            aria-label="close"
                                            onClick={onClose}
                                            sx={{
                                                position: 'absolute',
                                                right: 8,
                                                top: 8
                                            }}
                                        >
                                            <CloseIcon />
                                        </IconButton>
                                    </DialogTitle>
                                    <DialogContent sx={{ py: 4, px: 5 }}>
                                        <Stack spacing={3}>
                                            <FormControl error={!isBuyCreditsAmountValid && buyCreditsAmountNgn !== ''}>
                                                <FormLabel sx={{ fontWeight: 600, mb: 1, color: 'text.secondary', fontSize: '1.1rem' }}>
                                                    Enter Amount in NGN
                                                </FormLabel>
                                                <TextField
                                                    value={buyCreditsAmountNgn}
                                                    onChange={(e) => setBuyCreditsAmountNgn(e.target.value)}
                                                    placeholder={`Minimum NGN ${minNgnToBuy.toLocaleString()}`}
                                                    type="number"
                                                    inputProps={{ 
                                                        min: minNgnToBuy,
                                                        style: { padding: '16px 14px', fontSize: '1.1rem' }
                                                    }}
                                                    fullWidth
                                                    variant="outlined"
                                                    size="medium"
                                                />
                                                {!isBuyCreditsAmountValid && buyCreditsAmountNgn !== '' && (
                                                    <FormHelperText sx={{ fontSize: '0.9rem' }}>
                                                        {`Minimum amount to buy credits is NGN ${minNgnToBuy.toLocaleString()}.`}
                                                    </FormHelperText>
                                                )}
                                            </FormControl>
                                            <Paper 
                                                elevation={0} 
                                                sx={(theme) => ({ 
                                                    textAlign: 'center', 
                                                    p: 3, 
                                                    bgcolor: theme.palette.primary.lighter, 
                                                    borderRadius: 2,
                                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                                })}
                                            >
                                                <Typography variant="body1" color="text.secondary">
                                                    You will receive approximately:
                                                </Typography>
                                                <Typography 
                                                    variant="h3" 
                                                    fontWeight="bold" 
                                                    color="primary.main"
                                                    sx={{ my: 0.5 }}
                                                >
                                                    ${usdCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {balance && balance.ngn_rate ? `Conversion rate: ${balance.ngn_rate.toLocaleString()} NGN = 1 USD` : '(Conversion rate: 1,500 NGN = 1 USD)'}
                                                </Typography>
                                            </Paper>
                                        </Stack>
                                    </DialogContent>
                                    <DialogActions sx={{ 
                                        borderTop: '1px solid', 
                                        borderColor: 'divider',
                                        py: 2.5,
                                        px: 5
                                    }}>
                                        <Stack direction="row" spacing={2} width="100%">
                                            <Button 
                                                variant="outlined" 
                                                onClick={onClose} 
                                                fullWidth
                                                size="large"
                                                sx={{ py: 1.5 }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="contained"
                                                color="success"
                                                onClick={handleBuyCredits}
                                                disabled={!isBuyCreditsAmountValid || isBuyingCredits}
                                                fullWidth
                                                size="large"
                                                sx={{ py: 1.5 }}
                                            >
                                                {isBuyingCredits ? 'Processing...' : 'Buy Credits'}
                                            </Button>
                                        </Stack>
                                    </DialogActions>
                                </Dialog>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>
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