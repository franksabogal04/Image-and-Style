// Frontend/app/Apps.js
import React, { useState } from 'react';
import { SafeAreaView, View, Button, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import LoginScreen from './screens/LoginScreen';
import AppointmentsScreen from './screens/AppointmentsScreen';
import EarningsScreen from './screens/EarningsScreen';

export default function App() {
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState('appointments'); // 'appointments' | 'earnings'

  const handleLogin = (newToken) => setToken(newToken);

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
    } catch {}
    setToken(null);
    setTab('appointments');
  };

  if (!token) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
        <StatusBar style="light" backgroundColor="#111827" />
        <LoginScreen onLogin={handleLogin} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      <StatusBar style="light" backgroundColor="#111827" />

      {/* Simple tabs */}
      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        <View style={{ flex: 1, borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, overflow: 'hidden' }}>
          <Button
            title="Appointments"
            onPress={() => setTab('appointments')}
            color={Platform.OS === 'ios' ? undefined : (tab === 'appointments' ? '#3b82f6' : '#6b7280')}
          />
        </View>
        <View style={{ flex: 1, borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, overflow: 'hidden' }}>
          <Button
            title="Earnings"
            onPress={() => setTab('earnings')}
            color={Platform.OS === 'ios' ? undefined : (tab === 'earnings' ? '#3b82f6' : '#6b7280')}
          />
        </View>
      </View>

      {tab === 'appointments'
        ? <AppointmentsScreen token={token} onLogout={handleLogout} />
        : <EarningsScreen token={token} onLogout={handleLogout} />}
    </SafeAreaView>
  );
}

