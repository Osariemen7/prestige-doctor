import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  FormControl,
  InputAdornment,
  TextField,
  Typography
} from '@mui/material';

function PaymentForm() {
  const location = useLocation();
  let amt = location.state.amount;
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(amt);
  const [phone_number, setPhone] = useState('');
  const [pays, setPays] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  
  const url = 'https://health.prestigedelta.com/paystack/';
  const callback_url = 'https://prestige-health.vercel.app/components/callback';

 

  const handlePhone = (evnt) => {
    const inputPhone = evnt.target.value;
    if (inputPhone.startsWith('0')) {
      setPhone(inputPhone.replace('0', '+234'));
    } else {
      setPhone(inputPhone);
    }
  };

  async function paystack(e) {
    e.preventDefault();

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
      setMessage(JSON.stringify(errorResult.message));
    } else {
      const responseData = await result.json();
      setPays(responseData);
      if (responseData.data && responseData.data.authorization_url) {
        window.location.href = responseData.data.authorization_url;
      } else {
        setMessage('Failed to retrieve Paystack authorization URL.');
      }
    }
  }

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Box
        component="form"
        onSubmit={paystack}
        sx={{
          p: 4,
          border: '1px solid #ccc',
          borderRadius: '10px',
          width: '100%',
          bgcolor: '#f9f9f9',
        }}
      >
        <Typography variant="h4" gutterBottom>
          Payment Form
        </Typography>

        <FormControl fullWidth margin="normal">
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!!email}
          />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <TextField
            label="Phone Number"
            value={phone_number}
            onChange={handlePhone}
            required
          />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            disabled
            InputProps={{
              startAdornment: <InputAdornment position="start">₦</InputAdornment>,
            }}
          />
        </FormControl>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Pay with Paystack
        </Button>

        {message && (
          <Typography color="error" sx={{ mt: 2 }}>
            {message}
          </Typography>
        )}
      </Box>
    </Container>
  );
}

export default PaymentForm;
