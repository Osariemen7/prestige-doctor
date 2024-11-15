import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ReviewProvider } from './component/context';
// Import your components
import RegisterPage from './component/register';
import LoginPage from './component/login';
import ProviderPage from './component/provide';
import DashboardPage from './component/dash';
import DetailPage from './component/detail';
import ConsultAIPage from './component/consult';

const Stack = createStackNavigator();

export default function App() {
  return (
    <ReviewProvider>
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="LoginPage">
        <Stack.Screen name="LoginPage" component={LoginPage} />
        <Stack.Screen name="RegisterPage" component={RegisterPage} />
        <Stack.Screen name='ProviderPage' component={ProviderPage} />
        <Stack.Screen name='DashboardPage' component={DashboardPage} />
        <Stack.Screen name='DetailPage' component={DetailPage} />
        <Stack.Screen name='ConsultAIPage' component={ConsultAIPage} />
        
      </Stack.Navigator>
    </NavigationContainer>
    </ReviewProvider>
  );
}
