import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const DashboardPage = () => {
  const navigation = useNavigation();
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState('');

  const getAccessToken = async () => {
    try {
      const userInfo = await AsyncStorage.getItem('user-info');
      const parsedUserInfo = userInfo ? JSON.parse(userInfo) : null;
      if (parsedUserInfo?.access) {
        setAccessToken(parsedUserInfo.access);
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

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;

      try {
        const response = await fetch('https://health.prestigedelta.com/medicalreview/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        const result = await response.json();
        setDataList(result);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken]);

  const handleViewDetails = (item) => {
    navigation.navigate('DetailPage', { item });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={() => handleViewDetails(item)}>
      <Text style={styles.patient}>Chief Complaint: {item.chief_complaint}</Text>
      <Text style={styles.diagnosis}>Diagnosis: {item.assessment_diagnosis}</Text>
      <Text style={styles.complaints}>Medication: {item.medication}</Text>
     
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Patient Health Dashboard</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#003366" />
      ) : (
        <FlatList
          data={dataList || []} // Ensure dataList is an array, even if it's null
          keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
          renderItem={renderItem}
        />
      )}
      
      {/* Bottom Static Menu */}
      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('HomePage')}>
          <Icon name="home" size={24} color="#003366" />
          <Text style={styles.menuText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ConsultAIPage')}>
          <Icon name="support-agent" size={24} color="#003366" />
          <Text style={styles.menuText}>Consult AI</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 24, color: '#003366', fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  itemContainer: { padding: 16, marginBottom: 10, backgroundColor: '#B3E5FC', borderRadius: 8 },
  patient: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  diagnosis: { color: '#000' },
  complaints: { color: '#000' },
  time: { color: '#000' },
  
  // Menu styles
  menu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#E6F2FF',
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  menuItem: {
    alignItems: 'center',
  },
  menuText: {
    fontSize: 12,
    color: '#003366',
    marginTop: 4,
  },
});

export default DashboardPage;
