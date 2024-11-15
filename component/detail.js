import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DetailPage = ({ route }) => {
  const { item } = route.params;
  const [message, setMessage] = useState('');
  const [user_message, setUser] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);

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

  const handleApprove = async () => {
    try {
      const reviewStatus = { review_status: 'approved' };
      const response = await fetch(`https://health.prestigedelta.com/medicalreview/${item.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(reviewStatus),
      });

      if (response.status === 200) {
        setMessage('Diagnosis approved successfully!');
        setSuccessModalVisible(true);
      } else {
        setMessage('Failed to approve diagnosis!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage('An error occurred.');
    }
  };

  const handleEdit = async () => {
    try {
      const response = await fetch(`https://health.prestigedelta.com/medicalreview/${item.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(user_message),
      });

      if (response.status === 200) {
        setMessage('Diagnosis updated successfully!');
        setSuccessModalVisible(true);
      } else {
        setMessage('Failed to update diagnosis!');
      }
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating diagnosis:', error);
      setMessage('An error occurred.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.contentContainer}>
        <Text style={styles.sectionHeader}>Patient Profile</Text>
        <Text style={styles.subHeader}>Details of patient’s health</Text>
        <View style={styles.ifoCard}>
          <Text style={styles.ifoLabel}>Patient ID</Text>
          <Text style={styles.ifoValue}>{item.patient}</Text>
        </View>
        
        {item.assessment_diagnosis && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Diagnosis</Text>
            <Text style={styles.infoValue}>{item.assessment_diagnosis}</Text>
          </View>
        )}
        {item.allergies && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Allergies</Text>
            <Text style={styles.infoValue}>{item.allergies}</Text>
          </View>
        )}
        {item.medications && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Medications</Text>
            <Text style={styles.infoValue}>{item.medications}</Text>
          </View>
        )}
        
        <Text>{message}</Text>
        <Text style={styles.sectionHeader}>Patient History</Text>
        
        {item.chief_complaints && (
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Chief Complaint:</Text>
            <Text style={styles.detailValue}>{item.chief_complaints}</Text>
          </View>
        )}
        {item.history_of_present_illness && (
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>History of Present Illness</Text>
            <Text style={styles.detailValue}>{item.history_of_present_illness}</Text>
          </View>
        )}
        {item.management_plan && (
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Management Plan:</Text>
            <Text style={styles.detailValue}>{item.management_plan}</Text>
          </View>
        )}
      </View>

      {/* Success Modal */}
      <Modal visible={isSuccessModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalMessage}>{message}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Diagnosis Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalMessage}>Enter Diagnosis:</Text>
            <TextInput
              style={styles.textInput}
              multiline
              placeholder="Type diagnosis here"
              value={user_message}
              onChangeText={setUser}
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleEdit}>
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { padding: 16, backgroundColor: '#F5F5F5', flexGrow: 1 },
  sectionHeader: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 8 },
  subHeader: { fontSize: 16, color: '#666', marginBottom: 20 },
  infoCard: { padding: 16, backgroundColor: '#D6EAF8', borderRadius: 8, marginBottom: 10 },
  infoLabel: { fontSize: 14, color: '#555', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  ifoCard: { padding: 16, backgroundColor: '#00308F', borderRadius: 8, marginBottom: 10 },
  ifoLabel: { fontSize: 14, color: '#fff', marginBottom: 4 },
  ifoValue: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  detailCard: { padding: 16, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 10, elevation: 2 },
  detailLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  detailValue: { fontSize: 14, color: '#666', marginTop: 4 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '80%', padding: 20, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center' },
  modalMessage: { fontSize: 18, marginBottom: 20, textAlign: 'center' },
  closeButton: { marginTop: 20, backgroundColor: '#002D62', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 },
  closeButtonText: { color: '#fff', fontSize: 16 },
  textInput: { width: '100%', height: 100, borderColor: '#ddd', borderWidth: 1, padding: 10, marginBottom: 20, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#002D62', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 14 },
});

export default DetailPage;
