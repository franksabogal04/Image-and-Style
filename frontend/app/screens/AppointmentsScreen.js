import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import {
  View, Text, Button, TouchableOpacity, Alert,
  FlatList, Platform, SafeAreaView, TextInput
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const OPEN_TIME = 9;   // 9am
const CLOSE_TIME = 19; // 7pm
const SLOT_MINUTES = 15;

const SERVICE_CATALOG = {
  'Hair Stylist': [
    { name: 'Haircut', minutes: 30, price: 45 },
    { name: 'Blowout', minutes: 45, price: 55 },
    { name: 'Color (Roots)', minutes: 60, price: 80 },
    { name: 'Full Color', minutes: 90, price: 120 },
  ],
  'Nail Tech': [
    { name: 'Gel Manicure', minutes: 45, price: 40 },
    { name: 'Acrylic Full Set', minutes: 90, price: 75 },
    { name: 'Fill', minutes: 60, price: 55 },
    { name: 'Polish Change', minutes: 20, price: 15 },
  ],
  'Lash Tech': [
    { name: 'Classic Full Set', minutes: 120, price: 120 },
    { name: 'Volume Fill', minutes: 90, price: 85 },
  ],
  'Brow Tech': [
    { name: 'Brow Shaping', minutes: 20, price: 20 },
    { name: 'Brow Lamination', minutes: 45, price: 60 },
  ],
  'Skincare': [
    { name: 'Facial (Classic)', minutes: 60, price: 80 },
    { name: 'Facial (Deep Clean)', minutes: 75, price: 95 },
  ],
};

function pad(n) { return n.toString().padStart(2, '0'); }
function addMinutes(isoLike, minutes) {
  const d = new Date(isoLike);
  const out = new Date(d.getTime() + minutes * 60000);
  return out.toISOString().slice(0,19);
}
function generateSlots(openHour = OPEN_TIME, closeHour = CLOSE_TIME, step = SLOT_MINUTES) {
  const slots = [];
  for (let h = openHour; h < closeHour; h++) {
    for (let m = 0; m < 60; m += step) {
      slots.push(`${pad(h)}:${pad(m)}`);
    }
  }
  return slots;
}

export default function AppointmentsScreen({ token, onLogout }) {
  const [appointments, setAppointments] = useState([]);
  const [clientId] = useState('1');
  const [staffId] = useState('2');

  const [specialty, setSpecialty] = useState('Hair Stylist');
  const services = useMemo(() => SERVICE_CATALOG[specialty] ?? [], [specialty]);
  const [service, setService] = useState(services[0]?.name ?? 'Haircut');

  // new: override-able duration & price
  const selectedServiceMeta = services.find(s => s.name === service) ?? { minutes: 30, price: 0 };
  const [minutesOverride, setMinutesOverride] = useState(String(selectedServiceMeta.minutes));
  const [price, setPrice] = useState(String(selectedServiceMeta.price ?? 0));

  const today = new Date().toISOString().slice(0,10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState(null);
  const slotsForDay = useMemo(() => generateSlots(), []);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/`, { headers: authHeaders });
      if (!res.ok) throw new Error(`List failed: ${res.status} ${await res.text()}`);
      setAppointments(await res.json());
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  useEffect(() => { load(); }, []);

  // when specialty changes -> services list changes -> pick first
  useEffect(() => {
    if (services.length > 0) {
      setService(services[0].name);
      setMinutesOverride(String(services[0].minutes));
      setPrice(String(services[0].price ?? 0));
    }
  }, [services.length]);

  // when service changes -> update defaults
  useEffect(() => {
    setMinutesOverride(String(selectedServiceMeta.minutes));
    setPrice(String(selectedServiceMeta.price ?? 0));
  }, [service]);

  const createAppointment = async () => {
    try {
      if (!selectedTime) return Alert.alert('Select time', 'Please choose a time slot.');

      const mins = Math.max(5, parseInt(minutesOverride || '0', 10)); // at least 5 min
      const startISO = `${selectedDate}T${selectedTime}:00`;
      const endISO = addMinutes(startISO, mins);

      // Quick-win: store price & specialty in notes so we don't need DB migration yet
      const notes = `${specialty}${price ? ` | $${Number(price).toFixed(2)}` : ''} | ${mins} min`;

      const body = JSON.stringify({
        client_id: parseInt(clientId, 10),
        staff_id: parseInt(staffId, 10),
        service_name: service,
        start_time: startISO,
        end_time: endISO,
        notes,
        price: Number(price)           
      });

      const res = await fetch(`${API_BASE_URL}/appointments/`, { method: 'POST', headers: authHeaders, body });
      if (!res.ok) throw new Error(`Create failed: ${res.status} ${await res.text()}`);

      setSelectedTime(null);
      await load();
      Alert.alert('Success', `${service} booked on ${selectedDate} at ${selectedTime}`);
    } catch (e) {
      Alert.alert('Create failed', e.message);
    }
  };

  const deleteAppointment = async (id) => {
    try {
      // Try the RESTful DELETE; if your backend doesn’t have it yet, see section B below
      const res = await fetch(`${API_BASE_URL}/appointments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Delete failed: ${res.status} ${t}`);
      }
      await load();
    } catch (e) {
      Alert.alert('Delete failed', e.message);
    }
  };

  const Slot = ({ time }) => {
    const active = selectedTime === time;
    return (
      <TouchableOpacity
        onPress={() => setSelectedTime(time)}
        style={{
          paddingVertical: 10, paddingHorizontal: 12, margin: 6,
          borderRadius: 8, borderWidth: 1,
          backgroundColor: active ? '#111827' : '#1b1b22',
          borderColor: active ? '#111827' : '#2a2a33'
        }}
      >
        <Text style={{ color: active ? '#fff' : '#e4e6eb' }}>{time}</Text>
      </TouchableOpacity>
    );
  };

  const Form = (
    <View style={{ padding: 16, paddingBottom: 8 }}>
      <Text style={{ fontSize: 22, fontWeight: '600', marginBottom: 8, color: '#fff' }}>New Appointment</Text>
      <Text style={{ color: '#aaa', marginBottom: 12 }}>API: {API_BASE_URL}</Text>

      <Text style={{ fontWeight: '600', marginBottom: 6, color: '#fff' }}>Pick a date</Text>
      <Calendar
        onDayPress={(d) => setSelectedDate(d.dateString)}
        markedDates={{ [selectedDate]: { selected: true, selectedColor: '#3b82f6' } }}
        minDate={today}
        enableSwipeMonths
        style={{ marginBottom: 12, backgroundColor: '#14141a', borderRadius: 8 }}
        theme={{
          backgroundColor: '#14141a',
          calendarBackground: '#14141a',
          dayTextColor: '#f2f3f5',
          monthTextColor: '#f2f3f5',
          textDisabledColor: '#555b66',
          arrowColor: '#f2f3f5',
          todayTextColor: '#3b82f6',
          selectedDayBackgroundColor: '#3b82f6',
          selectedDayTextColor: '#ffffff',
        }}
      />

      <Text style={{ fontWeight: '600', marginTop: 6, color: '#fff' }}>Specialty</Text>
      <View style={{ borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, marginTop: 6, backgroundColor: '#14141a', minHeight: Platform.OS === 'ios' ? 180 : undefined }}>
        <Picker
          selectedValue={specialty}
          onValueChange={setSpecialty}
          mode={Platform.OS === 'android' ? 'dropdown' : undefined}
          dropdownIconColor="#f2f3f5"
          style={{ color: '#f2f3f5', backgroundColor: '#14141a', height: Platform.OS === 'android' ? 48 : undefined }}
          itemStyle={{ color: '#f2f3f5' }}
        >
          {Object.keys(SERVICE_CATALOG).map(k => <Picker.Item key={k} label={k} value={k} />)}
        </Picker>
      </View>
      <Text style={{ color: '#a9adb6', marginTop: 4 }}>Selected: {specialty}</Text>

      <Text style={{ fontWeight: '600', marginTop: 12, color: '#fff' }}>Service</Text>
      <View style={{ borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, marginTop: 6, backgroundColor: '#14141a', minHeight: Platform.OS === 'ios' ? 180 : undefined }}>
        <Picker
          selectedValue={service}
          onValueChange={setService}
          mode={Platform.OS === 'android' ? 'dropdown' : undefined}
          dropdownIconColor="#f2f3f5"
          style={{ color: '#f2f3f5', backgroundColor: '#14141a', height: Platform.OS === 'android' ? 48 : undefined }}
          itemStyle={{ color: '#f2f3f5' }}
        >
          {services.map(s => <Picker.Item key={s.name} label={`${s.name} (${s.minutes} min)`} value={s.name} />)}
        </Picker>
      </View>
      <Text style={{ color: '#a9adb6', marginTop: 4 }}>Selected: {service}</Text>

      {/* NEW: Duration override */}
      <Text style={{ fontWeight: '600', marginTop: 12, color: '#fff' }}>Duration (minutes)</Text>
      <TextInput
        value={minutesOverride}
        onChangeText={setMinutesOverride}
        keyboardType="number-pad"
        placeholder={`${selectedServiceMeta.minutes}`}
        placeholderTextColor="#7a7f88"
        style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginTop: 6 }}
      />

      {/* NEW: Price */}
      <Text style={{ fontWeight: '600', marginTop: 12, color: '#fff' }}>Price ($)</Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder={`${selectedServiceMeta.price ?? 0}`}
        placeholderTextColor="#7a7f88"
        style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginTop: 6 }}
      />

      <Text style={{ fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#fff' }}>Pick a time</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {slotsForDay.map((t) => <Slot key={t} time={t} />)}
      </View>

      <View style={{ marginTop: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
        <Button title="Book Appointment" onPress={createAppointment} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
      </View>

      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 24, color: '#fff' }}>Appointments</Text>
      <View style={{ marginTop: 8, marginBottom: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
        <Button title="Refresh" onPress={load} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      <StatusBar style="light" backgroundColor="#111827" />
      <FlatList
        data={appointments}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={Form}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#14141a', marginHorizontal: 16, marginVertical: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a33' }}>
            <Text style={{ fontWeight: '600', color: '#fff' }}>{item.service_name}</Text>
            <Text style={{ color: '#ccc' }}>{item.start_time} → {item.end_time}</Text>
            <Text style={{ color: '#ccc' }}>Client #{item.client_id} • Staff #{item.staff_id}</Text>
            {!!item.notes && <Text style={{ color: '#a9adb6', marginTop: 4 }}>{item.notes}</Text>}

            <View style={{ marginTop: 8, flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
                <Button title="Delete" onPress={() => {
                  Alert.alert('Delete appointment?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteAppointment(item.id) },
                  ]);
                }} color={Platform.OS === 'ios' ? undefined : '#e11d48'} />
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={{ padding: 16 }}>
            <Button title="Logout" onPress={onLogout} color="#e11d48" />
          </View>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}