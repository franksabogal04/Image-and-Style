import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Button, FlatList, TextInput, Alert, ActivityIndicator } from 'react-native';
import { API_BASE_URL } from '../config';

export default function AppointmentsScreen({ token, onLogout }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [clientId, setClientId] = useState('1');
  const [staffId, setStaffId] = useState('1');
  const [serviceName, setServiceName] = useState('Haircut');

  const now = new Date();
  const defaultStartISO = new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
  const defaultEndISO = new Date(now.getTime() + 90 * 60 * 1000).toISOString().slice(0, 16);
  const [start, setStart] = useState(defaultStartISO);
  const [end, setEnd] = useState(defaultEndISO);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/appointments`, { headers: authHeaders });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error loading appointments', e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toISOWithSeconds = (yyyyMMddTHHmm) =>
    yyyyMMddTHHmm && yyyyMMddTHHmm.length === 16 ? `${yyyyMMddTHHmm}:00` : yyyyMMddTHHmm;

  const createAppointment = async () => {
    try {
      setCreating(true);
      const body = JSON.stringify({
        client_id: parseInt(clientId, 10),
        staff_id: parseInt(staffId, 10),
        service_name: serviceName.trim() || 'Service',
        start_time: toISOWithSeconds(start),
        end_time: toISOWithSeconds(end),
        notes: '',
      });

      const res = await fetch(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: authHeaders,
        body,
      });
      if (!res.ok) throw new Error(await res.text());

      await load();
      Alert.alert('Success', 'Appointment created.');
    } catch (e) {
      Alert.alert('Create failed', e.message || String(e));
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item }) => {
    const startDisp = new Date(item.start_time).toLocaleString();
    const endDisp = new Date(item.end_time).toLocaleString();
    return (
      <View style={{ padding: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
        <Text style={{ fontWeight: '600' }}>{item.service_name}</Text>
        <Text>{startDisp} → {endDisp}</Text>
        <Text>Client #{item.client_id} • Staff #{item.staff_id}</Text>
      </View>
    );
  };

  return (
    <View style={{ padding: 20, marginTop: 40 }}>
      {/* Branding belongs in TEXT, not in identifiers */}
      <Text style={{ fontSize: 22, marginBottom: 12 }}>Image & Style — Appointments</Text>

      <View style={{ marginBottom: 12 }}>
        <Button title="Refresh" onPress={load} disabled={loading} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={{ color: '#666' }}>No appointments yet.</Text>}
          style={{ marginBottom: 20 }}
        />
      )}

      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Create an Appointment</Text>

      <TextInput
        placeholder="Client ID"
        value={clientId}
        onChangeText={setClientId}
        keyboardType="number-pad"
        style={{ borderWidth: 1, padding: 8, marginBottom: 8, borderRadius: 6 }}
      />
      <TextInput
        placeholder="Staff ID"
        value={staffId}
        onChangeText={setStaffId}
        keyboardType="number-pad"
        style={{ borderWidth: 1, padding: 8, marginBottom: 8, borderRadius: 6 }}
      />
      <TextInput
        placeholder="Service Name"
        value={serviceName}
        onChangeText={setServiceName}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8, borderRadius: 6 }}
      />

      <TextInput
        placeholder="Start (YYYY-MM-DDTHH:mm)"
        value={start}
        onChangeText={setStart}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8, borderRadius: 6 }}
      />
      <TextInput
        placeholder="End (YYYY-MM-DDTHH:mm)"
        value={end}
        onChangeText={setEnd}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8, borderRadius: 6 }}
      />

      <View style={{ marginTop: 8 }}>
        <Button title={creating ? 'Creating…' : 'Create'} onPress={createAppointment} disabled={creating} />
      </View>

      <View style={{ marginTop: 16 }}>
        <Button title="Logout" onPress={onLogout} />
      </View>
    </View>
  );
}