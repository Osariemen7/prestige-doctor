// Authentication utility functions for JWT with refresh tokens

// Check if user is authenticated
export const isAuthenticated = () => {
  const userInfo = localStorage.getItem('user-info');
  return !!userInfo;
};

// Get the refresh token from localStorage
export const getRefreshToken = () => {
  const userInfo = localStorage.getItem('user-info');
  if (userInfo) {
    const parsed = JSON.parse(userInfo);
    return parsed.refresh;
  }
  return null;
};

// Get the user object from localStorage
export const getUser = () => {
  const userInfo = localStorage.getItem('user-info');
  if (userInfo) {
    const parsed = JSON.parse(userInfo);
    return parsed.user;
  }
  return null;
};

// Get a valid access token, refreshing if necessary
export const getAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch('https://service.prestigedelta.com/tokenrefresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      // Update the stored access token
      const userInfo = JSON.parse(localStorage.getItem('user-info'));
      userInfo.access = data.access;
      localStorage.setItem('user-info', JSON.stringify(userInfo));
      return data.access;
    } else {
      // Refresh failed, user needs to log in again
      localStorage.removeItem('user-info');
      return null;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

// Logout function to clear storage
export const logout = () => {
  localStorage.removeItem('user-info');
};