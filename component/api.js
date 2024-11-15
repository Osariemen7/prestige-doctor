import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';


const getAccessToken = async () => {
  try {
    const userInfo = await AsyncStorage.getItem('user-info');
    const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
    if (parsedUserInfo) {
      console.log('Access Token:', parsedUserInfo.access);
      return parsedUserInfo.access;  // Return the access token
    } else {
      console.log('No user information found in storage.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching token:', error);
    return null;
  }
};

export const sendAudioFile = async (uri, phoneNumber) => {
    // const fileInfo = await FileSystem.getInfoAsync(uri);
    // const file = {
    //   uri: fileInfo.uri,
    //   name: 'audio.wav',
    //   type: 'audio/wav',
    // };
    const adjustedUri = Platform.OS === 'android' && !uri.startsWith('file://') ? `file://${uri}` : uri;

    // Fetch audio file and convert to blob
    const response = await fetch(adjustedUri);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('audio_file', blob, 'audio.wav');
  formData.append('phone_number', phoneNumber);
   
  try {
    const token = await getAccessToken();  // Get the token before making the request
    if (token) {
      const response = await fetch('https://health.prestigedelta.com/recording/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (response.ok) {
        return response.json();
      } else {
        console.error('Server error:', response.status, response.statusText);
        return ('error Uploading File', response.statusText)
      }
    } else {
      console.log('No access token available.');
    }
  } catch (error) {
    console.error('Failed to send audio file:', error);
  }
};

export const sendMessage = async (message, data) => {
  try {
    const token = await getAccessToken(); // Get the token before making the request
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
      
    }
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};

export const submitEdits = async (data, editableFields) => {
    if (!data || !data.review_id) return;

    const updatedData =  { 
      review_details: { 
          ...editableFields 
      } 
  };
    const token = await getAccessToken();
    try {
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
    
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Failed to submit edits');
    }
  };