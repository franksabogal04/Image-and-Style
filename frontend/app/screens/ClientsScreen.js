// Frontend/app/screens/ClientsScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Button, FlatList, Platform, Alert, RefreshControl, SafeAreaView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { API_BASE_URL } from '../config';

export default function ClientsScreen({ token, onLogout }) {
  const [clients, setClients] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // new client form
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [phone,     setPhone]     = useState("");
  const [email,     setEmail]     = useState("");

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = async () => {
    const r = await fetch(`${API_BASE_URL}/clients/`, { headers: authHeaders });
    if (!r.ok) throw new Error(`list clients failed: ${r.status} ${await r.text()}`);
    const data = await r.json();
    setClients(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    (async () => {
      try { await load(); } catch (e) { Alert.alert('Error', String(e.message || e)); }
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } catch (e) { Alert.alert('Error', String(e.message || e)); }
    setRefreshing(false);
  }, []);

  const createClient = async () => {
    try {
      if (!firstName.trim() || !lastName.trim()) {
        return Alert.alert('Missing info', 'First and last name are required.');
      }
      const body = JSON.stringify({
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        phone:      phone.trim() || null,
        email:      email.trim() || null,
      });
      const res = await fetch(`${API_BASE_URL}/clients/`, { method: 'POST', headers: authHeaders, body });
      if (!res.ok) throw new Error(`Create client failed: ${res.status} ${await res.text()}`);
      setFirstName(""); setLastName(""); setPhone(""); setEmail("");
      Keyboard.dismiss();
      await load();
      Alert.alert('Client added', 'Client saved successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const Item = ({ item }) => (
    <View style={{ backgroundColor: '#14141a', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <Text style={{ color: '#fff', fontWeight: '600' }}>{item.first_name} {item.last_name}</Text>
      {!!item.phone && <Text style={{ color: '#a9adb6' }}>{item.phone}</Text>}
      {!!item.email && <Text style={{ color: '#a9adb6' }}>{item.email}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      <StatusBar style="light" backgroundColor="#111827" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '600', color: '#fff', marginBottom: 12 }}>Clients</Text>

          {/* Add client form */}
          <View style={{ backgroundColor: '#14141a', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a33', padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 10 }}>Add Client</Text>

            <Text style={{ color: '#fff', marginBottom: 6 }}>First name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Jane"
              placeholderTextColor="#7a7f88"
              style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginBottom: 10 }}
              returnKeyType="next"
            />

            <Text style={{ color: '#fff', marginBottom: 6 }}>Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Doe"
              placeholderTextColor="#7a7f88"
              style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginBottom: 10 }}
              returnKeyType="next"
            />

            <Text style={{ color: '#fff', marginBottom: 6 }}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="555-123-4567"
              placeholderTextColor="#7a7f88"
              style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginBottom: 10 }}
              returnKeyType="next"
            />

            <Text style={{ color: '#fff', marginBottom: 6 }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="jane@example.com"
              placeholderTextColor="#7a7f88"
              style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginBottom: 12 }}
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
              <Button title="Save Client" onPress={createClient} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
            </View>
          </View>

          {/* Client list */}
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>All Clients</Text>
          <FlatList
            data={clients}
            keyExtractor={(c) => String(c.id)}
            renderItem={({ item }) => <Item item={item} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            ListEmptyComponent={<Text style={{ color: '#a9adb6' }}>No clients yet.</Text>}
            contentContainerStyle={{ paddingBottom: 40 }}
          />

          <View style={{ height: 12 }} />

          <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
            <Button title="Logout" onPress={onLogout} color={Platform.OS === 'ios' ? undefined : '#e11d48'} />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}