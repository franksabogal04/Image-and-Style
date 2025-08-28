
import React, { useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import TextInputField from '../components/TextInputField';
import { API_BASE_URL } from '../config';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('owner@example.com');
  const [password, setPassword] = useState('password123');

  const handleLogin = async () => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t);
      }
      const data = await res.json();
      onLogin(data.access_token);
    } catch (e) {
      Alert.alert('Login failed', e.message);
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 60 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Image & Style Login</Text>
      <TextInputField label="Email" value={email} onChangeText={setEmail} />
      <TextInputField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Login" onPress={handleLogin} />
      <View style={{ marginTop: 10 }}>
        <Text>Tip: Register first at /auth/register in the backend docs.</Text>
      </View>
    </View>
  );
}
