import React, { useState, useRef, useEffect } from 'react';
import { View, Button, TextInput, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { sendAudioFile, submitEdits } from './api';
import { useReview } from './context';

const VoiceNoteScreen = () => {
  const { setReview } = useReview();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const [data, setData] = useState(null);
  const [editableFields, setEditableFields] = useState({});
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const audioRecorder = useRef(null);
  const intervalId = useRef(null);
  const lastRecordingUri = useRef(null);

  const editableFieldKeys = [
    "chief_complaint", "history_of_present_illness", "past_medical_history", "medications",
    "allergies", "family_history", "social_history", "review_of_systems", "physical_examination_findings",
    "differential_diagnosis", "diagnosis_reason", "assessment_diagnosis", "management_plan",
    "lifestyle_advice", "patient_education", "follow_up_plan", "management_plan_reason", "follow_up",
    "daily_progress_notes", "discharge_instructions"
  ];

  useEffect(() => {
    let timerInterval;
    if (recording && !isPaused) {
      timerInterval = setInterval(() => setTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(timerInterval);
  }, [recording, isPaused]);

  const handleInputChange = (key, value) => {
    setEditableFields(prev => ({ ...prev, [key]: value }));
  };

  const handleEditToggle = () => setIsEditing(true);

  const handleEditSubmit = async () => {
    try {
      const response = await submitEdits(data, editableFields);
      if (response) {
        console.log("Edit submission successful:", response);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error submitting edits:", error);
    }
  };

  const startRecording = async () => {
    if (phoneNumber.length !== 11) {
      setErrorMessage('Please enter a valid 11-digit phone number');
      return;
    }

    const formattedPhone = `+234${phoneNumber.slice(1)}`;
    setErrorMessage('');
    setTimer(0);

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      alert('Permission for audio recording is required.');
      return;
    }

    audioRecorder.current = new Audio.Recording();
    await audioRecorder.current.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
    await audioRecorder.current.startAsync();
    setRecording(true);

    intervalId.current = setInterval(async () => {
      const uri = audioRecorder.current.getURI();
      if (uri && uri !== lastRecordingUri.current) {
        lastRecordingUri.current = uri;
        setIsLoading(true);
        const response = await sendAudioFile(uri, reviewId || formattedPhone);
        setIsLoading(false);

        if (response?.review_id) {
          setReviewId(response.review_id);
          setData(response);
        }
      }
    }, 60000);
  };

  const pauseRecording = async () => {
    if (audioRecorder.current && recording) {
      await audioRecorder.current.pauseAsync();
      const uri = audioRecorder.current.getURI();
      if (uri && uri !== lastRecordingUri.current) {
        setIsLoading(true);
        const response = await sendAudioFile(uri, reviewId || phoneNumber);
        setIsLoading(false);
        if (response?.review_id) {
          setReviewId(response.review_id);
          setData(response);
        }
      }
      setIsPaused(true);
    }
  };

  const continueRecording = async () => {
    if (audioRecorder.current && isPaused) {
      await audioRecorder.current.startAsync();
      setIsPaused(false);
    }
  };

  const stopRecording = async () => {
    clearInterval(intervalId.current);
    if (audioRecorder.current && recording) {
      await audioRecorder.current.stopAndUnloadAsync();
      setRecording(false);
      setTimer(0);
      const uri = audioRecorder.current.getURI();
      if (uri && uri !== lastRecordingUri.current) {
        setIsLoading(true);
        const response = await sendAudioFile(uri, reviewId || phoneNumber);
        setIsLoading(false);

        if (response?.review_id) {
          setReviewId(response.review_id);
          setData(response);
          setReview(response.review_id);
        }
      }
    }
  };

  const renderField = (key, value) => {
    const isEditable = editableFieldKeys.includes(key);
    const displayValue = editableFields[key] ?? value;
    return (
      <View key={key} style={isEditable ? styles.editableContainer : styles.nonEditableContainer}>
        <Text style={styles.label}>{key.replace(/_/g, ' ')}:</Text>
        {isEditable && isEditing ? (
          <TextInput
            style={styles.inputField}
            value={displayValue}
            onChangeText={(text) => handleInputChange(key, text)}
            multiline
          />
        ) : (
          <Text style={styles.value}>{typeof value === 'object' ? JSON.stringify(value) : value}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Fetching data...</Text>
        </View>
      ) : !data ? (
        <View style={styles.dataContainer}>
          <TextInput
            placeholder="Enter phone number of Patient"
            keyboardType="numeric"
            maxLength={11}
            onChangeText={setPhoneNumber}
            value={phoneNumber}
            style={styles.input}
          />
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
      ) : (
        <View>
        <View style={styles.topContainer}>
          <View style={styles.ifoCard}>
            <Text style={styles.ifoLabel}>Patient ID</Text>
            <Text style={styles.ifoValue}>{data.patient_id}</Text>
          </View>
          <View></View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Review Time</Text>
            <Text style={styles.infoValue}>{data.review_time}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Sentiment</Text>
            <Text style={styles.infoValue}>{data.doctor_note?.sentiment}</Text>
          </View>
        </View>
        <View style={styles.inoCard}>
            <Text style={styles.infoLabel}>Assistance Response</Text>
            <Text style={styles.nfoValue}>{data.doctor_note?.response}</Text>
          </View>
        <View style={styles.fieldsContainer}>
          {Object.entries(data.doctor_note?.review_details || {}).map(([section, details]) => (
            <View key={section}>
              <Text style={styles.sectionHeader}>{section.replace(/_/g, ' ')}</Text>
              {typeof details === 'object'
                ? Object.entries(details).map(([key, value]) => renderField(key, value))
                : renderField(section, details)}
            </View>
          ))}
          <TouchableOpacity style={styles.button} onPress={isEditing ? handleEditSubmit : handleEditToggle}>
            <Text style={styles.buttonText}>{isEditing ? "Submit Edits" : "Edit"}</Text>
          </TouchableOpacity>
        </View>
        </View>
      )}
    </ScrollView>

    <View style={styles.bottomControls}>
      <Text style={styles.timerText}>Recorded Time: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</Text>
      {recording ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={isPaused ? continueRecording : pauseRecording} style={styles.controlButton}>
            <Text style={styles.buttonText}>{isPaused ? "Resume" : "Pause"}</Text>
          </TouchableOpacity>
            <TouchableOpacity onPress={stopRecording} style={styles.controlButton}>
              <Text style={styles.buttonText}>End</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={startRecording} style={styles.controlButton}>
            <Text style={styles.buttonText}>Start Recording</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContainer: {
    padding: 16,
  },
  dataContainer: {
    alignItems: 'center',
  },
  ifoCard: { 
    width: '28%', 
    padding: 16, 
    backgroundColor: '#00308F', 
    borderRadius: 8, 
    marginBottom: 10 
  },
  inoCard: { 
    width: '100%', 
    padding: 16, 
    backgroundColor: '#D6EAF8', 
    borderRadius: 8, 
    marginBottom: 10 
  },
  ifoLabel: { 
    fontSize: 14, 
    color: '#fff', 
    marginBottom: 4 
  },
  ifoValue: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  fieldsContainer: {
    paddingHorizontal: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
    width: '100%',
  },
  errorText: {
    color: 'red',
    marginTop: 5,
  },
  topContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoCard: {
    flexBasis: '48%',
    marginVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 14,
    color: 'gray',
  },
  nfoValue: {
    fontSize: 14,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  editableContainer: {
    marginBottom: 10,
  },
  nonEditableContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    color: 'gray',
  },
  inputField: {
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 5,
    padding: 10,
    marginTop: 5,
    fontSize: 16,
    width: '100%',
  },
  bottomControls: {
    padding: 16,
  },
  timerText: {
    fontSize: 16,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  controlButton: {
    backgroundColor: '#007AFF',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 5,
    padding: 10,
    marginTop: 16,
    alignItems: 'center',
  },
});

export default VoiceNoteScreen;
