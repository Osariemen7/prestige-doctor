import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Navigation for web
import './LoginPage.css'; // CSS for styling
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@chakra-ui/react';

const LoginPage = () => {
  // Main login state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Validate international phone number format
  const validatePhoneNumber = (phone) => {
    // Match international format: +[country code][number]
    const regex = /^\+[1-9]\d{1,14}$/;
    return regex.test(phone);
  };

  const handleLogin = async () => {
    // Validate phone number format
    if (!validatePhoneNumber(phoneNumber)) {
      setMessage('Please enter a valid international phone number (e.g., +2347012345678)');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const item = { phone_number: phoneNumber, password };

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
        if (result.user.profile_set !== true) {
          localStorage.setItem('user-info', JSON.stringify(result));
          navigate('/provider');
        } else if (result.user.provider_rate_set !== true) {
          localStorage.setItem('user-info', JSON.stringify(result));
          navigate('/provider');
        } else if (result.user.availability_set !== true) {
          localStorage.setItem('user-info', JSON.stringify(result));
          navigate('/available');
        } else {
          localStorage.setItem('user-info', JSON.stringify(result));
          navigate('/my-consults');
        }
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-blue-600 text-lg font-medium">
              WELCOME TO PRESTIGE HEALTH
            </h2>
            <h1 className="text-2l font-bold text-blue-700">
              Sign in to your account
            </h1>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Phone Input */}
            <div className="relative">
              <input
                type="tel"
                placeholder="Phone Number (e.g., +2347012345678)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full h-12 pl-4 pr-4 rounded-lg border border-blue-200 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 
                        focus:border-transparent bg-blue-50"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-blue-200 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 
                        focus:border-transparent bg-blue-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400"
              >
                {showPassword ? 
                  <EyeOff className="w-5 h-5" /> : 
                  <Eye className="w-5 h-5" />
                }
              </button>
            </div>

            {/* Error Message */}
            {message && (
              <p className="text-red-500 text-sm text-center">{message}</p>
            )}

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 
                      text-white font-medium rounded-lg
                      disabled:bg-blue-300 disabled:cursor-not-allowed
                      transition-colors duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center mt-4">
              <button
                onClick={() => navigate('/forgot-password')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={handleSignup}
                className="text-blue-600 font-medium hover:text-blue-700"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
