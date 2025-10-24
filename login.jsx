import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Navigation for web
import './LoginPage.css'; // CSS for styling


const LoginPage = () => {
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

      const response = await fetch('https://service.prestigedelta.com/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          'X-Organization-Domain': 'provider.prestigehealth.app'
        },
        body: JSON.stringify(item),
      });

      if (response.status !== 200) {
        const result = await response.json();
        if (result.non_field_errors && result.non_field_errors.length > 0) {
          setMessage(result.non_field_errors[0]);
        } else {
          setMessage('Invalid Username/Password');
        }
      } else {
        const result = await response.json();
        localStorage.setItem('user-info', JSON.stringify(result)); // Use localStorage for web
        if (result.user.profile_set !== true) {
          localStorage.setItem('user-info', JSON.stringify(result))
          navigate('/provider')
        }  else if(result.user.organization_set !== true){
          localStorage.setItem('user-info', JSON.stringify(result));
          navigate('/organization')
        } else if(result.user.provider_rate_set !== true){
          localStorage.setItem('user-info', JSON.stringify(result));
          navigate('/provider')
        }
        else if(result.user.availability_set !== true){
          localStorage.setItem('user-info', JSON.stringify(result));
          navigate('/available')
        }
        else {
          localStorage.setItem('user-info', JSON.stringify(result));
          navigate('/dashboard');
        }
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
    navigate('/register'); // Redirect to the RegisterPage
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

export default LoginPage;
