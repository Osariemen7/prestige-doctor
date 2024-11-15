import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Import the icons
import VoiceNoteScreen from './voicenote';
import ChatScreen from './chatScreen';

const Tab = createBottomTabNavigator();

const ConsultAIPage = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Send Voice Note') {
            iconName = 'microphone'; // Choose an icon name
          } else if (route.name === 'Chat') {
            iconName = 'chat'; // Choose an icon name
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Send Voice Note" component={VoiceNoteScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
    </Tab.Navigator>
  );
};

export default ConsultAIPage;
