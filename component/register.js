import React, { useState } from 'react';
import { View, TextInput, Button, TouchableOpacity, StyleSheet, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const RegistrationPage = () => {
  const [phone_number, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [first_name, setFirst] = useState('');
  const [last_name, setLast] = useState('');
  const [middle_name, setMiddle] = useState('');
  const navigation = useNavigation();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    phone_number: '',
    email: '',
    password: '',
    last_name: '',
    first_name: '',
    middle_name: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false); // Loading state

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleRegister = async () => {
    setLoading(true); // Start loading
    try {
      let formattedPhoneNumber = form.phone_number.replace(/^0/, '+234');
      let item = {
        ...form,
        phone_number: formattedPhoneNumber,
      };
      let response = await fetch('https://health.prestigedelta.com/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(item),
      });

      let result = await response.json();
      if (response.status !== 201) {
        setMessage(result.phone_number || result.email || result.password || 'An error occurred');
      } else {
        setMessage('Registration successful');
        await AsyncStorage.setItem('user-info', JSON.stringify(result));
        navigation.navigate('ProviderPage');
      }
    } catch (error) {
      console.log(error);
      setMessage('An error occurred during registration');
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Register</Text>

      <TextInput
        style={styles.input}
        placeholder="First Name"
        onChangeText={(value) => handleChange('first_name', value)}
        value={form.first_name}
      />

      <TextInput
        style={styles.input}
        placeholder="Middle Name"
        onChangeText={(value) => handleChange('middle_name', value)}
        value={form.middle_name}
      />

      <TextInput
        style={styles.input}
        placeholder="Last Name"
        onChangeText={(value) => handleChange('last_name', value)}
        value={form.last_name}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        onChangeText={(value) => handleChange('email', value)}
        value={form.email}
      />

      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        onChangeText={(value) => handleChange('phone_number', value)}
        value={form.phone_number}
      />
      
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Password"
          secureTextEntry={!showPassword}
          onChangeText={(value) => handleChange('password', value)}
          value={form.password}
        />
        
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeButton}
        >
          <Icon name={showPassword ? 'visibility' : 'visibility-off'} size={24} color="gray" />
        </TouchableOpacity>
      </View>
      
      <Text>{message}</Text>

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.registerButtonText}>Register</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F2FF',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    color: '#1E90FF',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  input: {
    height: 50,
    borderColor: '#87CEEB',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#F0F8FF',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 45,
  },
  eyeButton: {
    position: 'absolute',
    right: 18,
    top: 12,
  },
  registerButton: {
    height: 50,
    backgroundColor: '#4682B4',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginTop: 15,
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RegistrationPage;
