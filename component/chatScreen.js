import React, { useState } from 'react';
import { View, TextInput, Button, FlatList, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { sendMessage } from './api';
import { useReview } from './context';

const ChatScreen = () => {
  const [userMessage, setUserMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const { reviewId } = useReview();

  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    setChatMessages((prevMessages) => [
      ...prevMessages,
      { sender: 'user', text: userMessage },
    ]);

    const response = await sendMessage(userMessage, { review_id: reviewId });
    
    if (response?.reply) {
      setChatMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'ai', text: response.reply },
      ]);
    }

    setUserMessage('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        data={chatMessages}
        renderItem={({ item }) => (
          <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.aiMessage]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.chatContent}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type your message"
          value={userMessage}
          onChangeText={setUserMessage}
        />
        <Button title="Send" onPress={handleSendMessage} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f2f2f2',
  },
  chatContent: {
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 5,
    maxWidth: '75%',
    padding: 10,
    borderRadius: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e6e6e6',
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 10,
  },
});

export default ChatScreen;
