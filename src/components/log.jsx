import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Navigation for web
import './LoginPage.css'; // CSS for styling


const LogPage = () => {
  const [phone, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false); // Loading state
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate(); // For navigation

  const handleLogin = async () => {
    setLoading(true);
    setMessage('');
    try {
      const phone_number = phone.replace('0', '+234');
      const item = { phone_number, password };

      const response = await fetch('https://health.prestigedelta.com/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(item),
      });

      if (response.status !== 200) {
        setMessage('Invalid Username/Password');
      } else {
        const result = await response.json();
        localStorage.setItem('user-info', JSON.stringify(result)); // Use localStorage for web
         navigate('/talk', {state:{result}})  
         // Redirect to DashboardPage
      }
    } catch (error) {
      console.error(error);
      setMessage('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = () => {
    navigate('/reg'); // Redirect to the RegisterPage
  };

  return (
    <div className='login'>
    <div className="login-container">
    <h2 className='login-title'>Welcome to Prestige Health</h2>
      <h1 className="login-title">Login</h1>

      <input
        className="login-input"
        type="tel"
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />

      <div className="password-container">
        <input
          className="login-input"
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="eye-button"
          onClick={() => setShowPassword(!showPassword)}
          type="button"
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>

      {message && <p className="error-message">{message}</p>}
    <br/>
      <button
        className="login-button"
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Login'}
      </button>

      <p className="signup-text">
        Don't have an account?{' '}
        <span className="signup-link" onClick={handleSignup}>
          Sign Up
        </span>
      </p>
    </div>
    </div>
  );
};

export default LogPage;
