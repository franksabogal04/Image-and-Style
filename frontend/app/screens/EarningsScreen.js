// Frontend/app/screens/EarningsScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Button, Platform, Alert, FlatList, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { API_BASE_URL } from '../config';
import { Calendar } from 'react-native-calendars';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23,59,59,999);
  return x;
}
function toISO(dt) {
  // yyyy-mm-ddThh:mm:ss
  const pad = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

function fmtMoney(n) {
  if (isNaN(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
}
function groupByDay(appts) {
  const map = {};
  for (const a of appts) {
    const day = (a.start_time || '').slice(0, 10); // yyyy-mm-dd
    if (!map[day]) map[day] = [];
    map[day].push(a);
  }
  const days = Object.keys(map).sort();
  return days.map(day => ({ day, items: map[day] }));
}

export default function EarningsScreen({ token, onLogout }) {
  const todayStr = new Date().toISOString().slice(0,10);
  const [start, setStart] = useState(todayStr);
  const [end, setEnd] = useState(todayStr);
  const [showRangePicker, setShowRangePicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const load = async (fromISO, toISO_) => {
    try {
      setLoading(true);
      const url = new URL(`${API_BASE_URL}/appointments/`);
      if (fromISO) url.searchParams.set('start', fromISO);
      if (toISO_)   url.searchParams.set('end', toISO_);
      const res = await fetch(url.toString(), { headers: authHeaders });
      if (!res.ok) throw new Error(`List failed: ${res.status} ${await res.text()}`);
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // initial: today
  useEffect(() => {
    const s = toISO(startOfDay(new Date()));
    const e = toISO(endOfDay(new Date()));
    load(s, e);
  }, []);

  const total = useMemo(
    () => appointments.reduce((sum, a) => sum + (Number(a.price) || 0), 0),
    [appointments]
  );
  const byDay = useMemo(() => groupByDay(appointments), [appointments]);

  const applyPreset = (preset) => {
    const now = new Date();
    let s, e;
    if (preset === 'TODAY') {
      s = toISO(startOfDay(now));
      e = toISO(endOfDay(now));
      setStart(now.toISOString().slice(0,10));
      setEnd(now.toISOString().slice(0,10));
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay(); // 0=Sun
      const diffToMon = (day + 6) % 7; // Mon=0
      const monday = new Date(now); monday.setDate(now.getDate() - diffToMon);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      s = toISO(startOfDay(monday));
      e = toISO(endOfDay(sunday));
      setStart(monday.toISOString().slice(0,10));
      setEnd(sunday.toISOString().slice(0,10));
    } else if (preset === 'THIS_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth()+1, 0);
      s = toISO(startOfDay(first));
      e = toISO(endOfDay(last));
      setStart(first.toISOString().slice(0,10));
      setEnd(last.toISOString().slice(0,10));
    }
    load(s, e);
  };

  const applyCustom = () => {
    const s = toISO(startOfDay(new Date(start)));
    const e = toISO(endOfDay(new Date(end)));
    load(s, e);
    setShowRangePicker(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      <StatusBar style="light" backgroundColor="#111827" />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '600', color: '#fff', marginBottom: 12 }}>Earnings</Text>

        <Text style={{ color: '#a9adb6', marginBottom: 8 }}>Range</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, overflow: 'hidden' }}>
            <Button title="Today" onPress={() => applyPreset('TODAY')} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, overflow: 'hidden' }}>
            <Button title="This Week" onPress={() => applyPreset('THIS_WEEK')} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, overflow: 'hidden' }}>
            <Button title="This Month" onPress={() => applyPreset('THIS_MONTH')} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
          </View>
        </View>

        <View style={{ height: 12 }} />

        <View style={{ borderWidth: 1, borderColor: '#2a2a33', borderRadius: 10, padding: 16, backgroundColor: '#14141a' }}>
          <Text style={{ color: '#a9adb6' }}>Total</Text>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>{fmtMoney(total)}</Text>
          <Text style={{ color: '#a9adb6', marginTop: 8 }}>
            {loading ? 'Loading…' : `${appointments.length} appointment${appointments.length===1?'':'s'}`}
          </Text>
        </View>

        <View style={{ height: 12 }} />

        <View style={{ borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, overflow: 'hidden', backgroundColor: '#14141a' }}>
          <Button
            title={showRangePicker ? "Hide Custom Range" : "Custom Range"}
            onPress={() => setShowRangePicker(v => !v)}
            color={Platform.OS === 'ios' ? undefined : '#6b7280'}
          />
        </View>

        {showRangePicker && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 6 }}>Start date</Text>
            <Calendar
              onDayPress={(d) => setStart(d.dateString)}
              markedDates={{ [start]: { selected: true, selectedColor: '#3b82f6' } }}
              style={{ borderRadius: 8, backgroundColor: '#14141a', marginBottom: 12 }}
              theme={{ calendarBackground: '#14141a', dayTextColor: '#f2f3f5', monthTextColor: '#f2f3f5', selectedDayTextColor: '#fff', selectedDayBackgroundColor: '#3b82f6', todayTextColor: '#3b82f6' }}
            />
            <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 6 }}>End date</Text>
            <Calendar
              onDayPress={(d) => setEnd(d.dateString)}
              markedDates={{ [end]: { selected: true, selectedColor: '#3b82f6' } }}
              style={{ borderRadius: 8, backgroundColor: '#14141a' }}
              theme={{ calendarBackground: '#14141a', dayTextColor: '#f2f3f5', monthTextColor: '#f2f3f5', selectedDayTextColor: '#fff', selectedDayBackgroundColor: '#3b82f6', todayTextColor: '#3b82f6' }}
            />
            <View style={{ height: 8 }} />
            <View style={{ borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, overflow: 'hidden' }}>
              <Button title="Apply Range" onPress={applyCustom} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
            </View>
          </View>
        )}

        <View style={{ height: 16 }} />

        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Breakdown</Text>
        <FlatList
          data={byDay}
          keyExtractor={(d) => d.day}
          renderItem={({ item }) => {
            const dayTotal = item.items.reduce((s, a) => s + (Number(a.price) || 0), 0);
            return (
              <View style={{ backgroundColor: '#14141a', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 6 }}>{item.day}</Text>
                <Text style={{ color: '#a9adb6', marginBottom: 6 }}>{fmtMoney(dayTotal)}</Text>
                {item.items.map((a) => (
                  <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#e5e7eb' }}>{a.service_name}</Text>
                    <Text style={{ color: '#e5e7eb' }}>{fmtMoney(Number(a.price) || 0)}</Text>
                  </View>
                ))}
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{ color: '#a9adb6' }}>No appointments in range.</Text>}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>

      <View style={{ padding: 16 }}>
        <Button title="Logout" onPress={onLogout} color={Platform.OS === 'ios' ? undefined : '#e11d48'} />
      </View>
    </SafeAreaView>
  );
}  