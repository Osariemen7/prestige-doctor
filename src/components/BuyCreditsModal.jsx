import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Drawer, Box, Stack, Typography, FormControl, FormLabel, TextField, Button, IconButton, Paper, FormHelperText, useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';

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

const BuyCreditsModal = ({
    open,
    onClose,
    balance,
    requiredAmount // new prop
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [buyCreditsAmountNgn, setBuyCreditsAmountNgn] = React.useState('');
    const [usdCredits, setUsdCredits] = React.useState(0);
    const [isBuyCreditsAmountValid, setIsBuyCreditsAmountValid] = React.useState(false);
    const [isBuyingCredits, setIsBuyingCredits] = React.useState(false);
    const [minNgnToBuy, setMinNgnToBuy] = React.useState(15000); // fallback

    React.useEffect(() => {
        if (balance && balance.ngn_rate) {
            setMinNgnToBuy(Math.ceil(10 * balance.ngn_rate));
        }
    }, [balance]);

    React.useEffect(() => {
        const rate = balance && balance.ngn_rate ? balance.ngn_rate : 1500;
        const amount = parseInt(buyCreditsAmountNgn, 10) || 0;
        setUsdCredits(rate ? amount / rate : 0);
        setIsBuyCreditsAmountValid(amount >= minNgnToBuy);
    }, [buyCreditsAmountNgn, balance, minNgnToBuy]);

    const handleBuyCredits = async () => {
        setIsBuyingCredits(true);
        try {
            // Get user info from localStorage (as in original Account logic)
            const userInfo = localStorage.getItem('user-info');
            const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
            const email = parsedUserInfo?.user?.email || '';
            const phone_number = parsedUserInfo?.user?.phone_number || '';
            const callback_url = 'https://provider.prestigehealth.app/dashboard';
            const url = 'https://service.prestigedelta.com/paystack/';
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
                alert('Credits Purchase Unsuccessful: ' + (errorResult?.message || result.statusText));
            } else {
                const responseData = await result.json();
                if (responseData.data && responseData.data.authorization_url) {
                    window.location.href = responseData.data.authorization_url;
                } else {
                    alert('Credits Purchase Unsuccessful: Failed to retrieve Paystack authorization url');
                }
            }
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            setIsBuyingCredits(false);
        }
    };

    // Calculate if we should show the insufficient credits message
    let showInsufficientCreditsMsg = false;
    if (requiredAmount && balance && balance.available_balance !== undefined) {
        const required = parseFloat(requiredAmount);
        const available = parseFloat(balance.available_balance);
        if (!isNaN(required) && !isNaN(available) && required > available) {
            showInsufficientCreditsMsg = true;
        }
    }

    // Drawer for mobile, Dialog for desktop
    if (isMobile) {
        return (
            <Drawer
                anchor="bottom"
                open={open}
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
                    {showInsufficientCreditsMsg && (
                        <Paper elevation={0} sx={{ mb: 2, p: 2, bgcolor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 2 }}>
                            <Typography variant="body1" color="warning.main" fontWeight="bold">
                                You do not have sufficient credits for this request.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Please buy more credits to continue.
                            </Typography>
                        </Paper>
                    )}
                    <Stack spacing={3}>
                        <FormControl error={!isBuyCreditsAmountValid && buyCreditsAmountNgn !== ''} fullWidth>
                            <FormLabel sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                                Enter Amount in NGN
                            </FormLabel>
                            <TextField
                                value={buyCreditsAmountNgn}
                                onChange={e => setBuyCreditsAmountNgn(e.target.value)}
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
                            sx={theme => ({
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
                            <Typography
                                variant="h4"
                                fontWeight="bold"
                                color="primary.main"
                                sx={{ my: 0.5 }}
                            >
                                ${usdCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {balance && balance.ngn_rate ? `Rate: ${balance.ngn_rate.toLocaleString()} NGN = 1 USD` : '(Rate: 1,500 NGN = 1 USD)'}
                            </Typography>
                        </Paper>
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
                    </Stack>
                </Box>
            </Drawer>
        );
    }

    // Desktop Dialog
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2 } }}
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
                {showInsufficientCreditsMsg && (
                    <Paper elevation={0} sx={{ mb: 2, p: 2, bgcolor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 2 }}>
                        <Typography variant="body1" color="warning.main" fontWeight="bold">
                            You do not have sufficient credits for this request.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Please buy more credits to continue.
                        </Typography>
                    </Paper>
                )}
                <Stack spacing={3}>
                    <FormControl error={!isBuyCreditsAmountValid && buyCreditsAmountNgn !== ''}>
                        <FormLabel sx={{ fontWeight: 600, mb: 1, color: 'text.secondary', fontSize: '1.1rem' }}>
                            Enter Amount in NGN
                        </FormLabel>
                        <TextField
                            value={buyCreditsAmountNgn}
                            onChange={e => setBuyCreditsAmountNgn(e.target.value)}
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
                            <FormHelperText error>
                                {`Minimum amount to buy credits is NGN ${minNgnToBuy.toLocaleString()}.`}
                            </FormHelperText>
                        )}
                    </FormControl>
                    <Paper
                        elevation={0}
                        sx={theme => ({
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
    );
};

export default BuyCreditsModal;
