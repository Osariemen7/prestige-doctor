import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineArrowLeft } from 'react-icons/ai'; // Import the back arrow icon
import './RegistrationPage.css';

const RegistrationPage = () => {
  const [form, setForm] = useState({
    phone_number: '',
    email: '',
    password: '',
    last_name: '',
    first_name: '',
    middle_name: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const formattedPhoneNumber = form.phone_number.replace(/^0/, '+234');
      const item = {
        ...form,
        phone_number: formattedPhoneNumber,
      };
      const response = await fetch('https://health.prestigedelta.com/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(item),
      });

      const result = await response.json();
      if (response.status !== 201) {
        setMessage(result.phone_number || result.email || result.password || 'An error occurred');
      } else {
        setMessage('Registration successful');
        localStorage.setItem('user-info', JSON.stringify(result));
        navigate('/provider-page');
      }
    } catch (error) {
      console.log(error);
      setMessage('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='cont'>
     <div className="back-icon" onClick={() => navigate('/')}>
        <AiOutlineArrowLeft size={24} />
        <span className="back-text"></span>
      </div>

    <div className="containers">
      {/* Back icon */}
     
      <h1 className="header">Register</h1>

      <input
        className="input"
        placeholder="First Name"
        onChange={(e) => handleChange('first_name', e.target.value)}
        value={form.first_name}
      />

      <input
        className="input"
        placeholder="Middle Name"
        onChange={(e) => handleChange('middle_name', e.target.value)}
        value={form.middle_name}
      />

      <input
        className="input"
        placeholder="Last Name"
        onChange={(e) => handleChange('last_name', e.target.value)}
        value={form.last_name}
      />

      <input
        className="input"
        type="email"
        placeholder="Email"
        onChange={(e) => handleChange('email', e.target.value)}
        value={form.email}
      />

      <input
        className="input"
        type="tel"
        placeholder="Phone Number"
        onChange={(e) => handleChange('phone_number', e.target.value)}
        value={form.phone_number}
      />

      <div className="password-container">
        <input
          className="input password-input"
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          onChange={(e) => handleChange('password', e.target.value)}
          value={form.password}
        />
        <button
          className="eye-button"
          type="button"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>

      <p>{message}</p>

      <button
        className="register-button"
        onClick={handleRegister}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Register'}
      </button>
    </div>
    </div>
  );
};

export default RegistrationPage;
