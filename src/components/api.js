


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
      formData.append('documentation', 'true');
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
