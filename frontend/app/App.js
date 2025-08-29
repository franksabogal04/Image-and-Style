import React, { useState } from 'react';
import { View } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import AppointmentsScreen from './screens/AppointmentsScreen';

export default function App() {
  const [token, setToken] = useState(null);
  if (!token) return <LoginScreen onLogin={setToken} />;
  return (
    <View style={{ flex: 1 }}>
      <AppointmentsScreen token={token} onLogout={() => setToken(null)} />
    </View>
  );
}
