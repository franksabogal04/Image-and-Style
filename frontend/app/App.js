// frontend/app/App.js
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import LoginScreen from './screens/LoginScreen';
import AppointmentsScreen from './screens/AppointmentsScreen';

export default function App() {
  const [token, setToken] = useState(null);

  const handleLogin = (newToken) => setToken(newToken);

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('token'); // ensure no auto-login
    } catch {}
    setToken(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      {/* Dark status bar + safe areas (top/bottom) */}
      <StatusBar style="light" backgroundColor="#111827" />
      {token
        ? <AppointmentsScreen token={token} onLogout={handleLogout} />
        : <LoginScreen onLogin={handleLogin} />}
    </SafeAreaView>
  );
}

