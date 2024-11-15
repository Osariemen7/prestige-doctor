import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const LoginPage = () => {
  const [phone, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);  // New loading state
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    setLoading(true);  // Start loading
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
        await AsyncStorage.setItem('user-info', JSON.stringify(result));
        navigation.navigate('DashboardPage');
      }
    } catch (error) {
      console.error(error);
      setMessage('An error occurred during login');
    } finally {
      setLoading(false);  // Stop loading after login attempt
    }
  };

  const handleSignup = () => {
    navigation.navigate('RegisterPage');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={(text) => setPhoneNumber(text)}
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Password"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={(text) => setPassword(text)}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
          <Icon name={showPassword ? "visibility" : "visibility-off"} size={24} color="gray" />
        </TouchableOpacity>
      </View>
      {message ? <Text style={styles.errorMessage}>{message}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />  // Display loading spinner
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.signupText}>
        Don't have an account?{' '}
        <Text style={styles.signupLink} onPress={handleSignup}>
          Sign Up
        </Text>
      </Text>
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
  title: {
    fontSize: 30,
    marginBottom: 20,
    textAlign: 'center',
    color: '#1E90FF', // Dodger blue
  },
  input: {
    height: 50,
    borderColor: '#87CEEB', // Sky blue
    borderWidth: 1,
    marginBottom: 20,
    borderRadius: 5,
    paddingLeft: 10,
    fontSize: 16,
    backgroundColor: '#F0F8FF', // Alice blue
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 45, // Ensures padding for the eye icon
  },
  eyeButton: {
    position: 'absolute',
    right: 18,
    top: 12,
  },
  button: {
    backgroundColor: '#4682B4', // Steel blue
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  signupText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  signupLink: {
    color: '#1E90FF', // Dodger blue
    fontWeight: 'bold',
  },
  errorMessage: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default LoginPage;
