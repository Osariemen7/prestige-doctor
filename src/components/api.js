


// For token storage
export const getRefreshToken = async () => {
  try {
    const userInfo = localStorage.getItem('user-info'); // Use localStorage for web storage
    const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
    if (parsedUserInfo) {
      console.log('Access Token:', parsedUserInfo.access);
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
  if (rep) {
    console.log('Access Token:', rep.access);
    
    return rep.access // Return the access token
    
    
  } 

}
// Function to send audio file
export const sendAudioFile = async (blob, phoneNumber, documentation = false) => {
  try {
    const formData = new FormData();
    formData.append('audio_file', blob, 'audio.wav');
    if (phoneNumber.length < 10) {
      formData.append('review_id', phoneNumber);
    } else {
      formData.append('phone_number', phoneNumber);
    }
    if (documentation) {
      formData.append('documentation', 'true');
    }

    const token = await getAccessToken();
    if (token) {
      const uploadResponse = await fetch('https://health.prestigedelta.com/recording/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (uploadResponse.ok) {
        return uploadResponse.json();
      } else {
        console.error('Server error:', uploadResponse.status, uploadResponse.statusText);
        return { error: 'Error uploading file', status: uploadResponse.statusText };
      }
    } else {
      console.log('No access token available.');
      return null;
    }
  } catch (error) {
    console.error('Failed to send audio file:', error);
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

  const updatedData = {
    review_details: {
      ...editableFields,
    },
  };

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
        body: JSON.stringify(updatedData),
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
