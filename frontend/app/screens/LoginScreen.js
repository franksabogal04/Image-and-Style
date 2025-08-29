import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from '../config';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('franksabogal04@gmail.com');
  const [password, setPassword] = useState('00000');
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    try {
      setLoading(true);
      const form = new URLSearchParams();
      form.append('username', email.trim());
      form.append('password', password);

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Login failed (${res.status})`);
      }
      const data = await res.json();
      if (!data?.access_token) throw new Error('No access token returned');
      onLogin(data.access_token);
    } catch (e) {
      Alert.alert('Login failed', e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 60 }}>
      <Text style={{ fontSize: 24, marginBottom: 16 }}>Image & Style — Login</Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderRadius: 6, padding: 10, marginBottom: 10 }}
      />
      <Button title={loading ? 'Logging in…' : 'Login'} onPress={doLogin} disabled={loading} />
      <View style={{ marginTop: 16 }}>
        <Text style={{ color: '#666', fontSize: 12 }}>API: {API_BASE_URL}</Text>
      </View>
      {loading && <ActivityIndicator size="large" style={{ marginTop: 16 }} />}
    </View>
  );
}
