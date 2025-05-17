import { useNavigate } from "react-router-dom";


// Check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem('user-info');
};

// For token storage
export const getRefreshToken = async () => {
  try {
    const userInfo = localStorage.getItem('user-info'); // Use localStorage for web storage
    const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
    if (parsedUserInfo) {
           return parsedUserInfo.refresh; // Return the access token
      
    } else {
      console.log('No user information found in storage.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching token:', error);
    return null;
  }
  
};
export const getAccessToken = async () => {
  let refresh = await getRefreshToken()
  let term = {refresh}
  let rep = await fetch ('https://health.prestigedelta.com/tokenrefresh/',{
      method: 'POST',
      headers:{
        'Content-Type': 'application/json',
        'accept' : 'application/json'
   },
   body:JSON.stringify(term)
  });
  rep = await rep.json();
  if (rep.status === 400) {
    
  }
  if (rep) {
    
    
    return rep.access // Return the access token
    
    
  } 

}

// get User
export const getUser = async () => {
  try {
    const userInfo = localStorage.getItem('user-info'); // Use localStorage for web storage
    const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
    if (parsedUserInfo) {
      
      return parsedUserInfo.user; // Return the user detail
      
    } else {
      console.log('No user information found in storage.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching token:', error);
    return null;
  } 

}

// Function to send audio file
export const sendAudioFile = async (blob, recipient, documentation = false) => {
  try {
    const token = await getAccessToken();
    // Validate blob and recipient
    if (!blob) throw new Error("No audio blob provided.");
    if (!recipient) throw new Error("No recipient provided.");

    const formData = new FormData();
    formData.append('audio_file', blob, 'audio.wav');

    // Determine whether to append as phone_number or review_id
    if (recipient.length === 14 && recipient.startsWith('+234')) {
      formData.append('phone_number', recipient);
    } else {
      formData.append('review_id', recipient);
    }

    // Append documentation flag if true
    if (documentation) {
      formData.append('document', 'true');
    }

    // Make the API call
    const response = await fetch('https://health.prestigedelta.com/recording/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
  
    });

    // Parse the response
    if (!response.ok) {
      throw new Error(`Failed to send audio file. Status: ${response.status}`);
    }

    return await response.json(); // Assuming JSON response
  } catch (error) {
    console.error("Error in sendAudioFile:", error);
    throw error; // Rethrow error for upstream handling
  }
};


// Function to send a message
export const sendMessage = async (message, data) => {
  try {
    const token = await getAccessToken();
    if (token) {
      const response = await fetch(`https://health.prestigedelta.com/medicalreview/${data.review_id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ user_message: message, review_id: data.review_id }),
      });
      return response.json();
    } else {
      console.log('No access token available.');
      return null;
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};

// Function to submit edits
export const submitEdits = async (data, editableFields) => {
  if (!data || !data.review_id) return;

  
  try {
    const token = await getAccessToken();
    if (token) {
      const response = await fetch(`https://health.prestigedelta.com/updatereview/${data.review_id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editableFields),
      });
      return response.json();
    } else {
      console.log('No access token available.');
    }
  } catch (error) {
    console.error('Submission failed:', error);
    alert('Failed to submit edits');
  }
};

// Function to check balance for a given expertise level
export const balanceCheck = async (expertise_level) => {
  try {
    const token = await getAccessToken();
    if (!token) throw new Error('No access token available.');
    const url = `https://health.prestigedelta.com/credits/check-funds/?expertise_level=${encodeURIComponent(expertise_level)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    const data = await response.json();
    if (!response.ok) {
      // Attach status for error handling
      throw { status: response.status, ...data };
    }
    return data;
  } catch (error) {
    // error may be a thrown object or Error instance
    return {
      sufficient_funds: false,
      required_amount: null,
      available_balance: null,
      error: error.error || error.message || 'Unknown error',
      status: error.status || 400
    };
  }
};
