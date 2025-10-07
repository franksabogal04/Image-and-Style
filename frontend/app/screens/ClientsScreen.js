// Frontend/app/screens/ClientsScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, TextInput, Button, Platform, Alert,
  Keyboard, TouchableWithoutFeedback, TouchableOpacity, Linking, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { API_BASE_URL } from '../config';

export default function ClientsScreen({ token, onLogout }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("lastName"); // 'lastName' | 'recent'

  // edit state
  const [editingId, setEditingId] = useState(null);
  const [editFirst, setEditFirst] = useState("");
  const [editLast,  setEditLast]  = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const sortByLastName = (list) =>
    (Array.isArray(list) ? list : []).slice().sort((a, b) => {
      const la = (a.last_name || '').toLowerCase();
      const lb = (b.last_name || '').toLowerCase();
      if (la !== lb) return la.localeCompare(lb);
      const fa = (a.first_name || '').toLowerCase();
      const fb = (b.first_name || '').toLowerCase();
      return fa.localeCompare(fb);
    });

  const sortByRecent = (list) =>
    (Array.isArray(list) ? list : []).slice().sort((a, b) => (b.id || 0) - (a.id || 0));

  async function fetchOk(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`${res.status} ${t}`);
    }
    return res;
  }

  const load = async () => {
    const r = await fetchOk(`${API_BASE_URL}/clients/`, { headers: authHeaders });
    const data = await r.json();
    setClients(sortMode === 'lastName' ? sortByLastName(data) : sortByRecent(data));
  };

  useEffect(() => {
    (async () => {
      try { await load(); } catch (e) { Alert.alert('Error', String(e.message || e)); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    setClients((prev) => sortMode === 'lastName' ? sortByLastName(prev) : sortByRecent(prev));
  }, [sortMode]);

  const refresh = useCallback(async () => {
    try { await load(); } catch (e) { Alert.alert('Error', String(e.message || e)); }
  }, [sortMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c => {
      const hay = [c.first_name || '', c.last_name || '', c.phone || '', c.email || ''].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [clients, query]);

  const resultsCount = filtered.length;

  const callNumber = (phone) => {
    if (!phone) return Alert.alert('No phone', 'This client has no phone number.');
    Linking.openURL(`tel:${phone}`);
  };
  const textNumber = (phone) => {
    if (!phone) return Alert.alert('No phone', 'This client has no phone number.');
    Linking.openURL(`sms:${phone}`);
  };
  const emailTo = (email) => {
    if (!email) return Alert.alert('No email', 'This client has no email address.');
    Linking.openURL(`mailto:${email}`);
  };

  // ----- Edit / Delete actions -----
  const beginEdit = (c) => {
    setEditingId(c.id);
    setEditFirst(c.first_name || "");
    setEditLast(c.last_name || "");
    setEditPhone(c.phone || "");
    setEditEmail(c.email || "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditFirst(""); setEditLast(""); setEditPhone(""); setEditEmail("");
  };

  const saveEdit = async () => {
    try {
      if (!editingId) return;
      if (!editFirst.trim() || !editLast.trim()) {
        return Alert.alert('Missing info', 'First and last name are required.');
      }
      const payload = {
        first_name: editFirst.trim(),
        last_name:  editLast.trim(),
        phone:      editPhone.trim() || null,
        email:      editEmail.trim() || null,
      };
      await fetchOk(`${API_BASE_URL}/clients/${editingId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      await load();
      cancelEdit();
      Alert.alert('Saved', 'Client updated.');
    } catch (e) {
      Alert.alert('Update failed', String(e.message || e));
    }
  };

  const removeClient = async (id) => {
    Alert.alert(
      'Delete client?',
      'This will permanently remove the client (and cascade any foreign key deletes).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await fetchOk(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
              await load();
            } catch (e) {
              Alert.alert('Delete failed', String(e.message || e));
            }
          }
        }
      ]
    );
  };

  const Header = (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: '#fff', marginBottom: 6 }}>Search</Text>
      <View style={{ position: 'relative' }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, phone, or email"
          placeholderTextColor="#7a7f88"
          style={{
            color: '#f2f3f5',
            backgroundColor: '#1b1b22',
            borderWidth: 1,
            borderColor: '#2a2a33',
            borderRadius: 8,
            padding: 12,
            paddingRight: 38,
          }}
          returnKeyType="search"
        />
        {!!query && (
          <TouchableOpacity
            onPress={() => setQuery("")}
            style={{ position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 6 }}
          >
            <Text style={{ color: '#9aa0a6', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, overflow: 'hidden' }}>
            <Button
              title="Last Name"
              onPress={() => setSortMode('lastName')}
              color={Platform.OS === 'ios' ? undefined : (sortMode === 'lastName' ? '#3b82f6' : '#6b7280')}
            />
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, overflow: 'hidden' }}>
            <Button
              title="Recent"
              onPress={() => setSortMode('recent')}
              color={Platform.OS === 'ios' ? undefined : (sortMode === 'recent' ? '#3b82f6' : '#6b7280')}
            />
          </View>
        </View>
        <View style={{ paddingLeft: 8 }}>
          <Text style={{ color: '#a9adb6' }}>
            {resultsCount} {resultsCount === 1 ? 'result' : 'results'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    const isEditing = editingId === item.id;

    if (isEditing) {
      return (
        <View style={{ backgroundColor: '#14141a', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 8 }}>Edit Client</Text>

          <Text style={{ color: '#fff', marginBottom: 6 }}>First name</Text>
          <TextInput
            value={editFirst}
            onChangeText={setEditFirst}
            placeholder="First name"
            placeholderTextColor="#7a7f88"
            style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginBottom: 8 }}
          />

          <Text style={{ color: '#fff', marginBottom: 6 }}>Last name</Text>
          <TextInput
            value={editLast}
            onChangeText={setEditLast}
            placeholder="Last name"
            placeholderTextColor="#7a7f88"
            style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginBottom: 8 }}
          />

          <Text style={{ color: '#fff', marginBottom: 6 }}>Phone</Text>
          <TextInput
            value={editPhone}
            onChangeText={setEditPhone}
            keyboardType="phone-pad"
            placeholder="555-123-4567"
            placeholderTextColor="#7a7f88"
            style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginBottom: 8 }}
          />

          <Text style={{ color: '#fff', marginBottom: 6 }}>Email</Text>
          <TextInput
            value={editEmail}
            onChangeText={setEditEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="jane@example.com"
            placeholderTextColor="#7a7f88"
            style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginBottom: 12 }}
          />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
              <Button title="Save" onPress={saveEdit} color={Platform.OS === 'ios' ? undefined : '#10b981'} />
            </View>
            <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
              <Button title="Cancel" onPress={cancelEdit} color={Platform.OS === 'ios' ? undefined : '#6b7280'} />
            </View>
          </View>
        </View>
      );
    }

    // view card
    return (
      <View style={{ backgroundColor: '#14141a', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 10, padding: 12, marginBottom: 10 }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>
          {item.last_name ? `${item.last_name}, ` : ''}{item.first_name}
        </Text>
        {!!item.phone && <Text style={{ color: '#a9adb6' }}>{item.phone}</Text>}
        {!!item.email && <Text style={{ color: '#a9adb6' }}>{item.email}</Text>}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
            <Button title="Call" onPress={() => callNumber(item.phone)} color={Platform.OS === 'ios' ? undefined : '#10b981'} />
          </View>
          <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
            <Button title="Text" onPress={() => textNumber(item.phone)} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
          </View>
          <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
            <Button title="Email" onPress={() => emailTo(item.email)} color={Platform.OS === 'ios' ? undefined : '#8b5cf6'} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
            <Button title="Edit" onPress={() => beginEdit(item)} color={Platform.OS === 'ios' ? undefined : '#f59e0b'} />
          </View>
          <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
            <Button title="Delete" onPress={() => removeClient(item.id)} color={Platform.OS === 'ios' ? undefined : '#e11d48'} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      <StatusBar style="light" backgroundColor="#111827" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <FlatList
          style={{ flex: 1, padding: 16 }}
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderItem}
          ListHeaderComponent={Header}
          contentContainerStyle={{ paddingBottom: 40 }}
          onRefresh={refresh}
          refreshing={loading}
          keyboardShouldPersistTaps="handled"
        />
      </TouchableWithoutFeedback>

      <View style={{ padding: 16 }}>
        <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
          <Button title="Logout" onPress={onLogout} color={Platform.OS === 'ios' ? undefined : '#e11d48'} />
        </View>
      </View>
    </SafeAreaView>
  );
}