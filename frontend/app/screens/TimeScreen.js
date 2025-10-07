// Frontend/app/screens/TimeScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Platform, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { API_BASE_URL } from '../config';

async function fetchOk(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status} ${t}`);
  }
  return res;
}

export default function TimeScreen({ token, onLogout }) {
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [current, setCurrent] = useState(null);
  const [summary, setSummary] = useState({ worked_minutes: 0, break_minutes: 0, payable_minutes: 0, entries: [] });

  const load = async () => {
    const [c, s] = await Promise.all([
      fetchOk(`${API_BASE_URL}/time/me/current`, { headers: authHeaders }).then(r => r.json()),
      fetchOk(`${API_BASE_URL}/time/me`,        { headers: authHeaders }).then(r => r.json()),
    ]);
    setCurrent(c);
    setSummary(s);
  };

  useEffect(() => {
    (async () => {
      try { await load(); } catch(e){ Alert.alert('Error', String(e.message||e)); }
    })();
  }, []);

  const clockIn = async () => {
    try { await fetchOk(`${API_BASE_URL}/time/clock-in`, { method: 'POST', headers: authHeaders }); await load(); }
    catch (e) { Alert.alert('Clock-in failed', String(e.message||e)); }
  };
  const startBreak = async () => {
    try { await fetchOk(`${API_BASE_URL}/time/break/start`, { method: 'POST', headers: authHeaders }); await load(); }
    catch (e) { Alert.alert('Start break failed', String(e.message||e)); }
  };
  const endBreak = async () => {
    try { await fetchOk(`${API_BASE_URL}/time/break/end`, { method: 'POST', headers: authHeaders }); await load(); }
    catch (e) { Alert.alert('End break failed', String(e.message||e)); }
  };
  const clockOut = async () => {
    try { await fetchOk(`${API_BASE_URL}/time/clock-out`, { method: 'POST', headers: authHeaders }); await load(); }
    catch (e) { Alert.alert('Clock-out failed', String(e.message||e)); }
  };

  const activeBreak = !!current?.breaks?.find(b => !b.end);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      <StatusBar style="light" backgroundColor="#111827" />
      <View style={{ padding: 16 }}>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Time Clock</Text>

        {/* Status */}
        <View style={{ marginTop: 10, backgroundColor: '#14141a', borderColor: '#2a2a33', borderWidth: 1, borderRadius: 10, padding: 12 }}>
          <Text style={{ color: '#a9adb6' }}>
            {current
              ? `On shift since ${current.clock_in}${activeBreak ? ' • On Break' : ''}`
              : 'Off shift'}
          </Text>
        </View>

        {/* Buttons */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
          {!current && (
            <View style={{ marginRight: 8, marginBottom: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
              <Button title="Clock In" onPress={clockIn} color={Platform.OS === 'ios' ? undefined : '#10b981'} />
            </View>
          )}
          {current && !activeBreak && (
            <View style={{ marginRight: 8, marginBottom: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
              <Button title="Start Break" onPress={startBreak} color={Platform.OS === 'ios' ? undefined : '#6b7280'} />
            </View>
          )}
          {current && activeBreak && (
            <View style={{ marginRight: 8, marginBottom: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
              <Button title="End Break" onPress={endBreak} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
            </View>
          )}
          {current && (
            <View style={{ marginRight: 8, marginBottom: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
              <Button title="Clock Out" onPress={clockOut} color={Platform.OS === 'ios' ? undefined : '#ef4444'} />
            </View>
          )}
        </View>

        {/* Totals */}
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <View style={{ flex: 1, backgroundColor: '#14141a', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 10, padding: 12, marginRight: 8 }}>
            <Text style={{ color: '#a9adb6' }}>Worked</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{summary.worked_minutes} min</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#14141a', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 10, padding: 12, marginRight: 8 }}>
            <Text style={{ color: '#a9adb6' }}>Break</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{summary.break_minutes} min</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#14141a', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 10, padding: 12 }}>
            <Text style={{ color: '#a9adb6' }}>Payable</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{summary.payable_minutes} min</Text>
          </View>
        </View>
      </View>

      {/* Recent entries list */}
      <FlatList
        data={summary.entries}
        keyExtractor={(e) => String(e.id)}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#14141a', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 10, padding: 12, marginHorizontal: 16, marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Clock In: {item.clock_in}</Text>
            <Text style={{ color: '#a9adb6' }}>Clock Out: {item.clock_out ?? '—'}</Text>
            {item.breaks?.length ? (
              <View style={{ marginTop: 6 }}>
                <Text style={{ color: '#a9adb6' }}>Breaks:</Text>
                {item.breaks.map(b => (
                  <Text key={b.id} style={{ color: '#a9adb6' }}>
                    • {b.start} → {b.end ?? '—'}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <View style={{ padding: 16 }}>
        <Button title="Logout" onPress={onLogout} color={Platform.OS === 'ios' ? undefined : '#e11d48'} />
      </View>
    </SafeAreaView>
  );
}  