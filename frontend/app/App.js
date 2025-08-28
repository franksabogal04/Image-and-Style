
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import AppointmentsScreen from './screens/AppointmentsScreen';
import * as SecureStore from 'expo-secure-store';

export default function App() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    (async () => {
      const t = await SecureStore.getItemAsync('token');
      if (t) setToken(t);
    })();
  }, []);

  return (
    <View style={styles.container}>
      {token ? (
        <AppointmentsScreen onLogout={async () => { await SecureStore.deleteItemAsync('token'); setToken(null); }} token={token} />
      ) : (
        <LoginScreen onLogin={async (t) => { await SecureStore.setItemAsync('token', t); setToken(t); }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }
});
