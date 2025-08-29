import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, TextInput, Alert } from 'react-native';
import { API_BASE_URL } from '../config';

export default function AppointmentsScreen({ token, onLogout }) {
  const [appointments, setAppointments] = useState([]);
  const [clientId, setClientId] = useState('1');
  const [staffId, setStaffId] = useState('2');
  const [serviceName, setServiceName] = useState('Haircut');
  const [start, setStart] = useState('2025-08-28T16:00:00');
  const [end, setEnd] = useState('2025-08-28T16:30:00');

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/`, { headers: authHeaders });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`List failed: ${res.status} ${t}`);
      }
      const data = await res.json();
      setAppointments(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const createAppointment = async () => {
    try {
      const body = JSON.stringify({
        client_id: parseInt(clientId, 10),
        staff_id: parseInt(staffId, 10),
        service_name: serviceName,
        start_time: start,
        end_time: end,
        notes: ''
      });
      const res = await fetch(`${API_BASE_URL}/appointments/`, {
        method: 'POST',
        headers: authHeaders,
        body
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Create failed: ${res.status} ${t}`);
      }
      await load();
    } catch (e) {
      Alert.alert('Create failed', e.message);
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 40 }}>
      <Text style={{ fontSize: 22, marginBottom: 12 }}>Appointments</Text>
      <Text style={{ color: '#666', marginBottom: 8 }}>API: {API_BASE_URL}</Text>
      <Button title="Refresh" onPress={load} />
      <FlatList
        data={appointments}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={{ padding: 10, borderBottomWidth: 1 }}>
            <Text>{item.service_name}</Text>
            <Text>{item.start_time} → {item.end_time}</Text>
            <Text>Client #{item.client_id} • Staff #{item.staff_id}</Text>
          </View>
        )}
        style={{ marginVertical: 20 }}
      />
      <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Create an Appointment</Text>
      <TextInput placeholder="Client ID" value={clientId} onChangeText={setClientId} style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <TextInput placeholder="Staff ID" value={staffId} onChangeText={setStaffId} style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <TextInput placeholder="Service Name" value={serviceName} onChangeText={setServiceName} style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <TextInput placeholder="Start (ISO)" value={start} onChangeText={setStart} style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <TextInput placeholder="End (ISO)" value={end} onChangeText={setEnd} style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />
      <Button title="Create" onPress={createAppointment} />
      <View style={{ marginTop: 16 }}>
        <Button title="Logout" onPress={onLogout} />
      </View>
    </View>
  );
}
