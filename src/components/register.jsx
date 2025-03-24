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
  const [countryCode, setCountryCode] = useState('+234');
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
      const item = {
        ...form,
        phone_number: countryCode + form.phone_number,
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
        navigate('/provider');
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

      <div className="phone-input-container" style={{ display: 'flex', gap: '8px' }}>
        <select
          className="country-code-select input"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          style={{
            width: '100px',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#fff',
            height: '40px', // Match input height
            fontSize: '16px', // Match input font size
            outline: 'none', // Remove default focus outline
            cursor: 'pointer'
          }}
        >
          <option value="+234">+234</option>
          <option value="+44">+44</option>
          <option value="+1">+1</option>
        </select>
        <input
          className="input"
          type="tel"
          placeholder="Phone Number"
          style={{ flex: 1 }}
          onChange={(e) => {
            const rawValue = e.target.value.replace(/[\D\s]/g, '');
            const lastTenDigits = rawValue.slice(-10);
            handleChange('phone_number', lastTenDigits);
          }}
          value={form.phone_number}
        />
      </div>

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
