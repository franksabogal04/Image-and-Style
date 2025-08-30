// Frontend/app/screens/AppointmentsScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import {
  View, Text, Button, TouchableOpacity, Alert,
  FlatList, Platform, SafeAreaView, TextInput,
  KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, ScrollView
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
function generateSlots(openHour = OPEN_TIME, closeHour = CLOSE_TIME, step = SLOT_MINUTES) {
  const slots = [];
  for (let h = openHour; h < closeHour; h++) {
    for (let m = 0; m < 60; m += step) {
      slots.push(`${pad(h)}:${pad(m)}`);
    }
  }
  return slots;
}

// Keep times in LOCAL time (no toISOString) to avoid end<=start issues
function addMinutesLocal(dateTimeLocalStr, minutes) {
  const [dateStr, timeStr] = dateTimeLocalStr.split('T');
  const [Y, M, D] = dateStr.split('-').map(Number);
  const [h, m, s] = timeStr.split(':').map(Number);
  const base = new Date(Y, M - 1, D, h, m, s || 0);
  const added = new Date(base.getTime() + minutes * 60000);
  const p = (x) => String(x).padStart(2, '0');
  return `${added.getFullYear()}-${p(added.getMonth() + 1)}-${p(added.getDate())}T${p(added.getHours())}:${p(added.getMinutes())}:${p(added.getSeconds())}`;
}

export default function AppointmentsScreen({ token, onLogout }) {
  const [appointments, setAppointments] = useState([]);

  // staff + clients
  const [staffId, setStaffId] = useState(null);
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(null);

  // add-client mini form
  const [showAddClient, setShowAddClient] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [phone,     setPhone]     = useState("");
  const [email,     setEmail]     = useState("");

  const [specialty, setSpecialty] = useState('Hair Stylist');
  const services = useMemo(() => SERVICE_CATALOG[specialty] ?? [], [specialty]);

  // selected service (defaults to first of specialty)
  const [service, setService] = useState(services[0]?.name ?? 'Haircut');

  // duration & price (with "hours"); user edits should stick
  const selectedServiceMeta = services.find(s => s.name === service) ?? { minutes: 30, price: 0 };
  const [hours, setHours] = useState("0");
  const [minutesOverride, setMinutesOverride] = useState(String(selectedServiceMeta.minutes));
  const [price, setPrice] = useState(String(selectedServiceMeta.price ?? 0));

  const today = new Date().toISOString().slice(0,10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState(null);
  const slotsForDay = useMemo(() => generateSlots(), []);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadAppointments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/`, { headers: authHeaders });
      if (!res.ok) throw new Error(`List failed: ${res.status} ${await res.text()}`);
      setAppointments(await res.json());
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const loadMe = async () => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, { headers: authHeaders });
    if (!res.ok) throw new Error(`me failed: ${res.status}`);
    const me = await res.json();
    setStaffId(me.id);
  };

  const loadClients = async () => {
    const r = await fetch(`${API_BASE_URL}/clients/`, { headers: authHeaders });
    if (!r.ok) throw new Error(`list clients failed: ${r.status}`);
    const list = await r.json();
    setClients(Array.isArray(list) ? list : []);
    if (!clientId && Array.isArray(list) && list.length > 0) {
      setClientId(list[0].id);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await loadMe();
        await loadClients();
        await loadAppointments();
      } catch (e) {
        Alert.alert('Init error', String(e.message || e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const res = await fetch(`${API_BASE_URL}/clients/`, {
        method: 'POST',
        headers: authHeaders,
        body
      });
      if (!res.ok) throw new Error(`Create client failed: ${res.status} ${await res.text()}`);
      const cli = await res.json();
      // refresh list and select the new client
      await loadClients();
      setClientId(cli.id);
      setShowAddClient(false);
      setFirstName(""); setLastName(""); setPhone(""); setEmail("");
      Alert.alert('Client added', `${cli.first_name} ${cli.last_name} created.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const createAppointment = async () => {
    try {
      if (!staffId) return Alert.alert('Please wait', 'Loading staff…');
      if (!clientId) return Alert.alert('Select client', 'Please pick or create a client.');
      if (!selectedTime) return Alert.alert('Select time', 'Please choose a time slot.');

      const totalMins = Math.max(
        5,
        (parseInt(hours || "0", 10) * 60) + parseInt(minutesOverride || "0", 10)
      );

      const startISO = `${selectedDate}T${selectedTime}:00`;
      const endISO = addMinutesLocal(startISO, totalMins);

      const notes = `${specialty}${price ? ` | $${Number(price).toFixed(2)}` : ''} | ${totalMins} min`;

      const body = JSON.stringify({
        client_id: Number(clientId),
        staff_id: Number(staffId),
        service_name: service,
        start_time: startISO,
        end_time: endISO,
        notes,
        price: Number(price)
      });

      const res = await fetch(`${API_BASE_URL}/appointments/`, { method: 'POST', headers: authHeaders, body });
      if (!res.ok) throw new Error(`Create failed: ${res.status} ${await res.text()}`);

      setSelectedTime(null);
      await loadAppointments();
      Alert.alert('Success', `${service} booked on ${selectedDate} at ${selectedTime}`);
    } catch (e) {
      Alert.alert('Create failed', e.message);
    }
  };

  const deleteAppointment = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Delete failed: ${res.status} ${t}`);
      }
      await loadAppointments();
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

  const ClientPicker = (
    <View>
      <Text style={{ fontWeight: '600', marginTop: 12, color: '#fff' }}>Client</Text>
      {clients.length > 0 ? (
        <View style={{ borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, marginTop: 6, backgroundColor: '#14141a', minHeight: Platform.OS === 'ios' ? 180 : undefined }}>
          <Picker
            selectedValue={clientId}
            onValueChange={(val) => setClientId(val)}
            mode={Platform.OS === 'android' ? 'dropdown' : undefined}
            dropdownIconColor="#f2f3f5"
            style={{ color: '#f2f3f5', backgroundColor: '#14141a', height: Platform.OS === 'android' ? 48 : undefined }}
            itemStyle={{ color: '#f2f3f5' }}
          >
            {clients.map(c => (
              <Picker.Item
                key={c.id}
                label={`${c.first_name} ${c.last_name}${c.phone ? ` • ${c.phone}` : ''}`}
                value={c.id}
              />
            ))}
          </Picker>
        </View>
      ) : (
        <Text style={{ color: '#a9adb6', marginTop: 6 }}>No clients yet. Add one below.</Text>
      )}

      <View style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
        <Button
          title={showAddClient ? "Hide Add Client" : "Add Client"}
          onPress={() => setShowAddClient(v => !v)}
          color={Platform.OS === 'ios' ? undefined : '#6b7280'}
        />
      </View>

      {showAddClient && (
        <View style={{ marginTop: 10, backgroundColor: '#14141a', borderRadius: 10, borderWidth: 1, borderColor: '#2a2a33', padding: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 8 }}>New Client</Text>

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
            <Button title="Create Client" onPress={createClient} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
          </View>
        </View>
      )}
    </View>
  );

  const Form = (
    <View style={{ padding: 16, paddingBottom: 8 }}>
      <Text style={{ fontSize: 22, fontWeight: '600', marginBottom: 8, color: '#fff' }}>New Appointment</Text>
      <Text style={{ color: '#aaa', marginBottom: 12 }}>API: {API_BASE_URL}</Text>

      {/* Client select / add */}
      {ClientPicker}

      <Text style={{ fontWeight: '600', marginTop: 12, color: '#fff' }}>Pick a date</Text>
      <Calendar
        onDayPress={(d) => setSelectedDate(d.dateString)}
        markedDates={{ [selectedDate]: { selected: true, selectedColor: '#3b82f6' } }}
        minDate={today}
        enableSwipeMonths
        style={{ marginTop: 6, marginBottom: 12, backgroundColor: '#14141a', borderRadius: 8 }}
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

      <Text style={{ fontWeight: '600', color: '#fff' }}>Specialty</Text>
      <View style={{ borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, marginTop: 6, backgroundColor: '#14141a', minHeight: Platform.OS === 'ios' ? 180 : undefined }}>
        <Picker
          selectedValue={specialty}
          onValueChange={(val) => {
            setSpecialty(val);
            const list = SERVICE_CATALOG[val] ?? [];
            const first = list[0];
            setService(first?.name ?? "");
            // reset defaults for new service
            setHours("0");
            setMinutesOverride(String(first?.minutes ?? 30));
            setPrice(String(first?.price ?? 0));
          }}
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
          onValueChange={(val) => {
            setService(val);
            const meta = (SERVICE_CATALOG[specialty] ?? []).find(s => s.name === val);
            setHours("0");
            setMinutesOverride(String(meta?.minutes ?? 30));
            setPrice(String(meta?.price ?? 0));
          }}
          mode={Platform.OS === 'android' ? 'dropdown' : undefined}
          dropdownIconColor="#f2f3f5"
          style={{ color: '#f2f3f5', backgroundColor: '#14141a', height: Platform.OS === 'android' ? 48 : undefined }}
          itemStyle={{ color: '#f2f3f5' }}
        >
          {services.map(s => <Picker.Item key={s.name} label={`${s.name} (${s.minutes} min)`} value={s.name} />)}
        </Picker>
      </View>
      <Text style={{ color: '#a9adb6', marginTop: 4 }}>Selected: {service}</Text>

      {/* Hours */}
      <Text style={{ fontWeight: '600', marginTop: 12, color: '#fff' }}>Hours</Text>
      <TextInput
        value={hours}
        onChangeText={setHours}
        keyboardType="number-pad"
        returnKeyType="done"
        blurOnSubmit={true}
        onSubmitEditing={() => Keyboard.dismiss()}
        placeholder="0"
        placeholderTextColor="#7a7f88"
        style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginTop: 6 }}
      />

      {/* Minutes */}
      <Text style={{ fontWeight: '600', marginTop: 12, color: '#fff' }}>Minutes</Text>
      <TextInput
        value={minutesOverride}
        onChangeText={setMinutesOverride}
        keyboardType="number-pad"
        returnKeyType="done"
        blurOnSubmit={true}
        onSubmitEditing={() => Keyboard.dismiss()}
        placeholder={`${selectedServiceMeta.minutes}`}
        placeholderTextColor="#7a7f88"
        style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginTop: 6 }}
      />

      {/* Price */}
      <Text style={{ fontWeight: '600', marginTop: 12, color: '#fff' }}>Price ($)</Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        returnKeyType="done"
        blurOnSubmit={true}
        onSubmitEditing={() => Keyboard.dismiss()}
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
        <Button title="Refresh" onPress={async () => { await loadClients(); await loadAppointments(); }} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#111827' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView style={{ flex: 1 }}>
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
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          />
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}