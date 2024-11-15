import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProviderPage = () => {
  const [clinicName, setClinicName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [dateOfRegistration, setDateOfRegistration] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState('')
  const [accessToken, setAccessToken] = useState('');
    

  const getAccessToken = async () => {
    try {
      const userInfo = await AsyncStorage.getItem('user-info');
      const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
      console.log(userInfo)
      if (parsedUserInfo) {
        setAccessToken(parsedUserInfo.access);
        console.log('Access Token:', parsedUserInfo.access);
      } else {
        console.log('No user information found in storage.');
      }
    } catch (error) {
      console.error('Error fetching token:', error);
    }
  };

  useEffect(() => {
    getAccessToken();
  }, []);


  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || dateOfRegistration;
    setShowDatePicker(false);
    setDateOfRegistration(currentDate);
  };

  const handleSubmit = async() => {
    const providerType = 'doctor'
    const formData = {
      clinic_name: clinicName,
      specialty: specialty,
      qualifications: qualifications,
      date_of_registration: dateOfRegistration.toISOString().split('T')[0],
      provider_type: providerType,
      bio: bio
    };
    try {
        let response = await fetch('https://health.prestigedelta.com/provider/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(formData)
        });
        let result = await response.json();
        if (response.status !== 200) {
          setMessage(result || 'An error occurred');
        } else {
          await AsyncStorage.setItem('user-info', JSON.stringify(result));
          navigation.navigate('LoginPage');
        }
      } catch (error) {
        setMessage('An error occurred during updating');
      }
    Alert.alert('Form Submitted', JSON.stringify(formData, null, 2));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clinic Registration</Text>

      <TextInput
        style={styles.input}
        placeholder="Clinic/Hospital Name"
        value={clinicName}
        onChangeText={(text) => setClinicName(text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Specialty (e.g cardiologist)"
        value={specialty}
        onChangeText={(text) => setSpecialty(text)}
      />

      <RNPickerSelect
        onValueChange={(value) => setQualifications(value)}
        items={[
          { label: 'MBBS', value: 'MBBS' },
          { label: 'MD', value: 'MD' },
          { label: 'MBChB', value: 'MBChB' },
        ]}
        placeholder={{ label: "Select Qualification", value: null }}
        style={pickerSelectStyles}
        value={qualifications}
      /><br/>

      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
        <Text style={styles.dateButtonText}>Select Date of Registration: {dateOfRegistration.toISOString().split('T')[0]}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={dateOfRegistration}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Bio (e.g cardiologist with over 7 years of practice)"
        value={bio}
        onChangeText={(text) => setBio(text)}
        multiline={true}
        numberOfLines={4}
      />
      <Text>{message}</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    marginBottom: 20,
    textAlign: 'center',
    color: '#1565C0',
  },
  input: {
    height: 50,
    borderColor: '#42A5F5',
    borderWidth: 1,
    marginBottom: 20,
    borderRadius: 5,
    paddingLeft: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1E88E5',
    paddingVertical: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 18,
  },
  dateButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  dateButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});

const pickerSelectStyles = {
  inputIOS: {
    height: 50,
    borderColor: '#42A5F5',
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  inputAndroid: {
    height: 50,
    borderColor: '#42A5F5',
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    fontSize: 16,
    marginBottom: 20,
  },
};

export default ProviderPage;
