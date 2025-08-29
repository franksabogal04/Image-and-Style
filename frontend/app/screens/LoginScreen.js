import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button, Alert, Platform,
  ActivityIndicator, Switch, useColorScheme, KeyboardAvoidingView, ScrollView
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

export default function LoginScreen({ onLogin }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const C = {
    bg: isDark ? '#0b0b0f' : '#ffffff',
    card: isDark ? '#14141a' : '#ffffff',
    text: isDark ? '#f2f3f5' : '#111111',
    sub: isDark ? '#a9adb6' : '#666666',
    border: isDark ? '#2a2a33' : '#dddddd',
    inputBg: isDark ? '#1b1b22' : '#ffffff',
    placeholder: isDark ? '#7a7f88' : '#9aa0a6',
    primary: isDark ? '#3b82f6' : '#111827',
    mutedBtn: isDark ? '#6b7280' : '#6b7280',
    switchTrackTrue: isDark ? '#3b82f677' : '#11182777',
    switchTrackFalse: isDark ? '#44464d' : '#bfc3c8',
    switchThumb: isDark ? '#dfe3ea' : '#ffffff',
  };

  const [email, setEmail] = useState('franksabogal04@gmail.com');
  const [password, setPassword] = useState('00000');
  const [loading, setLoading] = useState(true);       // initial token check
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // toggle

  const validateToken = async (token) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return false;
      const me = await res.json();
      return !!me?.id;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync('token');
        if (saved) {
          const ok = await validateToken(saved);
          if (ok) {
            onLogin(saved);
            return;
          } else {
            await SecureStore.deleteItemAsync('token');
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const login = async () => {
    try {
      setSubmitting(true);

      const body = new URLSearchParams({
        username: email,
        password: password,
        grant_type: ''
      }).toString();

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });

      if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);

      const data = await res.json();
      const token = data?.access_token;
      if (!token) throw new Error('No access_token in response');

      if (rememberMe) {
        await SecureStore.setItemAsync('token', token);
      }
      onLogin(token);
    } catch (e) {
      Alert.alert('Login Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetSavedLogin = async () => {
    await SecureStore.deleteItemAsync('token');
    Alert.alert('Done', 'Saved login cleared. You will need to log in again.');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: C.text }}>Checking saved session…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
        <Text style={{ fontSize: 22, fontWeight: '600', marginBottom: 16, color: C.text }}>Image & Style — Login</Text>
        <Text style={{ color: C.sub, marginBottom: 12 }}>API: {API_BASE_URL}</Text>

        <Text style={{ color: C.text, marginBottom: 6 }}>Email</Text>
        <TextInput
          placeholder="you@example.com"
          placeholderTextColor={C.placeholder}
          selectionColor={C.primary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={{
            color: C.text,
            backgroundColor: C.inputBg,
            borderWidth: 1, borderColor: C.border, borderRadius: 8,
            padding: 12, marginBottom: 12
          }}
        />

        <Text style={{ color: C.text, marginBottom: 6 }}>Password</Text>
        <TextInput
          placeholder="Your password"
          placeholderTextColor={C.placeholder}
          selectionColor={C.primary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{
            color: C.text,
            backgroundColor: C.inputBg,
            borderWidth: 1, borderColor: C.border, borderRadius: 8,
            padding: 12, marginBottom: 16
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            trackColor={{ true: C.switchTrackTrue, false: C.switchTrackFalse }}
            thumbColor={C.switchThumb}
          />
          <Text style={{ marginLeft: 8, color: C.text }}>Remember Me</Text>
        </View>

        <View style={{
          borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.border,
          marginBottom: 12, backgroundColor: C.card
        }}>
          <Button
            title={submitting ? 'Logging in…' : 'Login'}
            onPress={login}
            disabled={submitting}
            color={Platform.OS === 'ios' ? undefined : C.primary}
          />
        </View>

        <View style={{
          borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: C.border,
          backgroundColor: C.card
        }}>
          <Button
            title="Reset saved login"
            onPress={resetSavedLogin}
            color={Platform.OS === 'ios' ? undefined : C.mutedBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}