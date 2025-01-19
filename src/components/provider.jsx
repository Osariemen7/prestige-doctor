import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // For navigation
import Select from 'react-select'; // For dropdowns
import './ProviderPage.css'; // CSS for styling
import { AiOutlineArrowLeft } from 'react-icons/ai'; // Import the back arrow icon
import {
  Box,
  Button,
  Container,
  FormControl,
  InputAdornment,
  TextField,
  Typography
} from '@mui/material';


const ProviderPage = () => {
  const [clinicName, setClinicName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [dateOfRegistration, setDateOfRegistration] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // Default to today's date in YYYY-MM-DD
  });
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [amount, setAmount] = useState('');
  const navigate = useNavigate();

  const qualificationOptions = [
    { label: 'MBBS', value: 'MBBS' },
    { label: 'MD', value: 'MD' },
    { label: 'MBChB', value: 'MBChB' },
  ];

  const getAccessToken = async () => {
    try {
      const userInfo = localStorage.getItem('user-info'); // Use localStorage for web
      const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
      if (parsedUserInfo) {
        setAccessToken(parsedUserInfo.access);
        console.log('Access Token:', parsedUserInfo.access);
      } else {
        console.log('No user information found in storage.');
      }
    } catch (error) {
      console.error('Error fetching token:', error);
    }
  };

  useEffect(() => {
    getAccessToken();
  }, []);

  const handleDateChange = (event) => {
    setDateOfRegistration(event.target.value); // Directly set the value from the input
  };


  const handleSubmit = async () => {
    const providerType = 'doctor';
    const formData = {
      clinic_name: clinicName,
      specialty: specialty,
      qualifications: qualifications.value,
      date_of_registration: dateOfRegistration,
      provider_type: providerType,
      bio: bio,
      rate_per_minute: amount,
      rate_currency: 'NGN',
    };

    try {
      const response = await fetch('https://health.prestigedelta.com/provider/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.status !== 200) {
        setMessage(result.message || 'An error occurred');
      } else {
        localStorage.setItem('user-info', JSON.stringify(result));
        navigate('/available'); // Redirect to LoginPage
      }
    } catch (error) {
      console.error(error);
      setMessage('An error occurred during updating');
    }
    
  };

  return (
    <div className='provider'>
       <div className="back-icon" onClick={() => navigate('/register')}>
        <AiOutlineArrowLeft size={24} />
        <span className="back-text"></span>
      </div>
 
  
    <div className="provider-container">
    

      <h1 className="provider-title">Create Profile</h1>

      <input
        className="provider-input"
        type="text"
        placeholder="Specialty (e.g cardiologist)"
        value={specialty}
        onChange={(e) => setSpecialty(e.target.value)}
      />
    
      <Select
        className="provider-select"
        options={qualificationOptions}
        value={qualifications}
        onChange={(selectedOption) => setQualifications(selectedOption)}
        placeholder="Select Qualification"
      />

      <div className="provider-date-container">
        <label htmlFor="dateOfRegistration">Date of Registration</label>
        <input
          id="dateOfRegistration"
          className="provider-input"
          type="date"
          value={dateOfRegistration} 
          onChange={handleDateChange}
        />
      </div>

      <textarea
        className="provider-textarea"
        placeholder="Bio (e.g cardiologist with over 7 years of practice)"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
      ></textarea>
      <FormControl fullWidth margin="normal">
          <TextField
            label="Amount to be paid per minute"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            InputProps={{
              startAdornment: <InputAdornment position="start">₦</InputAdornment>,
            }}
          />
        </FormControl>


      {message && <p className="provider-message">{message}</p>}

      <button className="provider-button" onClick={handleSubmit}>
        Submit
      </button>
    </div>
    </div>
  );
};

export default ProviderPage;
