// Frontend/app/screens/EarningsScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, Button, Platform, Alert,
  TextInput, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard,
  FlatList, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { API_BASE_URL } from '../config';

const pad = (n) => String(n).padStart(2, '0');

// ---- friendly <-> ISO helpers ----
function toISO(y, m, d, hh = 0, mm = 0, ss = 0) {
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}
function parseMDY(mdy) {
  if (!mdy) return null;
  const parts = mdy.split('/').map(s => s.trim());
  if (parts.length !== 3) return null;
  const [m, d, y] = parts.map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}
function fmtMDY(date) {
  return new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}
function fmtTime12(date) {
  return new Date(date)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .replace('am', 'AM').replace('pm', 'PM');
}
function fmtRange(startISO, endISO) {
  const d = fmtMDY(startISO);
  const t1 = fmtTime12(startISO);
  const t2 = fmtTime12(endISO);
  return `${d} • ${t1} to ${t2}`;
}

// ---- quick range builders (local time) ----
function startOfToday() {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate(), 0, 0, 0);
}
function endOfToday() {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate(), 23, 59, 59);
}
function last7Days() {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  return {
    start: toISO(start.getFullYear(), start.getMonth() + 1, start.getDate(), 0, 0, 0),
    end: toISO(end.getFullYear(), end.getMonth() + 1, end.getDate(), 23, 59, 59),
  };
}
function thisMonth() {
  const d = new Date();
  const start = toISO(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0);
  const end = toISO(d.getFullYear(), d.getMonth() + 1, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), 23, 59, 59);
  return { start, end };
}
function lastMonth() {
  const d = new Date();
  const ym = new Date(d.getFullYear(), d.getMonth(), 0);
  const start = toISO(ym.getFullYear(), ym.getMonth() + 1, 1, 0, 0, 0);
  const end = toISO(ym.getFullYear(), ym.getMonth() + 1, ym.getDate(), 23, 59, 59);
  return { start, end };
}
function yearToDate() {
  const d = new Date();
  const start = toISO(d.getFullYear(), 1, 1, 0, 0, 0);
  const end = toISO(d.getFullYear(), d.getMonth() + 1, d.getDate(), 23, 59, 59);
  return { start, end };
}

const Money = ({ value, style }) => (
  <Text style={[{ color: '#fff', fontWeight: '700' }, style]}>${Number(value || 0).toFixed(2)}</Text>
);

const Card = ({ children, style }) => (
  <View style={[{ backgroundColor: '#14141a', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 10, padding: 12 }, style]}>
    {children}
  </View>
);

export default function EarningsScreen({ token, onLogout, me }) {
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const role = me?.role ?? 'staff';
  const isOwnerOrReception = role === 'owner' || role === 'receptionist';

  // date filter (ISO sent to API)
  const initialMonth = thisMonth();
  const [start, setStart] = useState(initialMonth.start);
  const [end, setEnd] = useState(initialMonth.end);

  // friendly inputs
  const [mdyStart, setMdyStart] = useState(fmtMDY(initialMonth.start));
  const [mdyEnd, setMdyEnd] = useState(fmtMDY(initialMonth.end));
  const [timeStart, setTimeStart] = useState('12:00 AM');
  const [timeEnd, setTimeEnd] = useState('11:59 PM');

  // active preset (for styling)
  const [activePreset, setActivePreset] = useState('tm'); // today|7d|tm|lm|ytd

  // data
  const [summary, setSummary] = useState({ services_total: 0, tips_total: 0, sales_total: 0, grand_total: 0 });
  const [appointments, setAppointments] = useState([]);

  // for name mapping
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([]);

  // by-staff section
  const [byStaff, setByStaff] = useState({ staff: [], totals: { services_total: 0, tips_total: 0, sales_total: 0, grand_total: 0 } });

  // ---- loaders ----
  async function fetchOk(url, opts) {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`${res.status} ${t}`);
    }
    return res;
  }

  const loadSummary = async () => {
    const url = new URL(`${API_BASE_URL}/earnings/`);
    if (start) url.searchParams.set('start', start);
    if (end) url.searchParams.set('end', end);
    const r = await fetchOk(url.toString(), { headers: authHeaders });
    setSummary(await r.json());
  };

  const loadAppointments = async () => {
    const url = new URL(`${API_BASE_URL}/appointments/`);
    if (start) url.searchParams.set('start', start);
    if (end) url.searchParams.set('end', end);
    const r = await fetchOk(url.toString(), { headers: authHeaders });
    setAppointments(await r.json());
  };

  const loadByStaff = async () => {
    if (!isOwnerOrReception) {
      setByStaff({ staff: [], totals: { services_total: 0, tips_total: 0, sales_total: 0, grand_total: 0 } });
      return;
    }
    const url = new URL(`${API_BASE_URL}/earnings/by-staff`);
    if (start) url.searchParams.set('start', start);
    if (end) url.searchParams.set('end', end);
    const r = await fetchOk(url.toString(), { headers: authHeaders });
    setByStaff(await r.json());
  };

  const loadClients = async () => {
    const url = new URL(`${API_BASE_URL}/clients/search`);
    url.searchParams.set('limit', '200');
    const r = await fetchOk(url.toString(), { headers: authHeaders });
    const list = await r.json();
    setClients(Array.isArray(list) ? list : []);
  };

  const loadStaff = async () => {
    const r = await fetchOk(`${API_BASE_URL}/users/?role=staff`, { headers: authHeaders });
    const list = await r.json();
    setStaff(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([loadSummary(), loadAppointments(), loadByStaff(), loadClients(), loadStaff()]);
      } catch (e) {
        Alert.alert('Error', String(e.message || e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyDates = async () => {
    try {
      // build from MM/DD/YYYY + time (optional)
      let nextStart = start, nextEnd = end;
      const ps = parseMDY(mdyStart);
      const pe = parseMDY(mdyEnd);

      const parseTime = (t) => {
        if (!t) return { hh: 0, mm: 0 };
        const m = String(t).trim().match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/i);
        if (!m) return { hh: 0, mm: 0 };
        let hh = parseInt(m[1], 10);
        const mm = m[2] ? parseInt(m[2], 10) : 0;
        const ap = m[3].toUpperCase();
        if (ap === 'PM' && hh !== 12) hh += 12;
        if (ap === 'AM' && hh === 12) hh = 0;
        return { hh, mm };
      };

      if (ps) {
        const ts = parseTime(timeStart || '12:00 AM');
        nextStart = toISO(ps.y, ps.m, ps.d, ts.hh, ts.mm, 0);
      }
      if (pe) {
        const te = parseTime(timeEnd || '11:59 PM');
        nextEnd = toISO(pe.y, pe.m, pe.d, te.hh, te.mm, 59);
      }

      setStart(nextStart);
      setEnd(nextEnd);
      setActivePreset(null); // custom range

      await Promise.all([loadSummary(), loadAppointments(), loadByStaff()]);
      Alert.alert('Updated', 'Date filter applied.');
    } catch (e) {
      Alert.alert('Error', String(e.message || e));
    }
  };

  // ---- clean segmented presets ----
  const presets = [
    { id: 'today', label: 'Today', range: startOfToday, rangeEnd: endOfToday },
    { id: '7d',    label: '7 Days', fn: last7Days },
    { id: 'tm',    label: 'This Month', fn: thisMonth },
    { id: 'lm',    label: 'Last Month', fn: lastMonth },
    { id: 'ytd',   label: 'YTD', fn: yearToDate },
  ];

  const onPresetPress = async (id) => {
    try {
      let range;
      if (id === 'today') {
        range = { start: startOfToday(), end: endOfToday() };
      } else {
        const p = presets.find(p => p.id === id);
        range = p?.fn ? p.fn() : thisMonth();
      }
      setActivePreset(id);
      setStart(range.start);
      setEnd(range.end);
      setMdyStart(fmtMDY(range.start));
      setMdyEnd(fmtMDY(range.end));
      setTimeStart('12:00 AM');
      setTimeEnd('11:59 PM');
      await Promise.all([loadSummary(), loadAppointments(), loadByStaff()]);
    } catch (e) {
      Alert.alert('Error', String(e.message || e));
    }
  };

  const Segmented = () => (
    <View
      style={{
        backgroundColor: '#0f1220',
        borderColor: '#1f2433',
        borderWidth: 1,
        borderRadius: 12,
        padding: 6,
        flexDirection: 'row',
        gap: 6,
        marginTop: 10,
      }}
    >
      {presets.map((p) => {
        const active = activePreset === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => onPresetPress(p.id)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: active ? '#0b1730' : '#121623',
              borderWidth: 1,
              borderColor: active ? '#3b82f6' : '#262a38',
              shadowColor: active ? '#3b82f6' : 'transparent',
              shadowOpacity: active ? 0.25 : 0,
              shadowRadius: active ? 6 : 0,
              elevation: active ? 3 : 0,
            }}
          >
            <Text style={{ color: active ? '#dbe9ff' : '#e4e6eb', fontWeight: '700', fontSize: 12 }}>
              {p.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const getClientName = (id) => {
    const c = clients.find(x => x.id === id);
    return c ? `${c.first_name} ${c.last_name}` : `Client #${id}`;
  };
  const getStaffName = (id) => {
    const s = staff.find(x => x.id === id);
    return s ? s.name : `Staff #${id}`;
  };

  const header = (
    <View style={{ padding: 16 }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>Earnings</Text>

      {/* Clean segmented presets */}
      <Segmented />

      {/* Friendly custom range */}
      <View style={{ marginTop: 16 }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>Custom range</Text>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a9adb6' }}>Start (MM/DD/YYYY)</Text>
            <TextInput
              value={mdyStart}
              onChangeText={setMdyStart}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#7a7f88"
              style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Text style={{ color: '#a9adb6', marginTop: 6 }}>Time (e.g., 9:00 AM)</Text>
            <TextInput
              value={timeStart}
              onChangeText={setTimeStart}
              placeholder="12:00 AM"
              placeholderTextColor="#7a7f88"
              style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
              returnKeyType="done"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a9adb6' }}>End (MM/DD/YYYY)</Text>
            <TextInput
              value={mdyEnd}
              onChangeText={setMdyEnd}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#7a7f88"
              style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
              returnKeyType="done"
            />
            <Text style={{ color: '#a9adb6', marginTop: 6 }}>Time (e.g., 11:59 PM)</Text>
            <TextInput
              value={timeEnd}
              onChangeText={setTimeEnd}
              placeholder="11:59 PM"
              placeholderTextColor="#7a7f88"
              style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
          <Button title="Apply Dates" onPress={applyDates} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
        </View>
      </View>

      {/* Totals */}
      <View style={{ flexDirection: 'row', marginTop: 16 }}>
        <Card style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ color: '#a9adb6' }}>Services</Text>
          <Money value={summary.services_total} style={{ fontSize: 18, marginTop: 2 }} />
        </Card>
        <Card style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ color: '#a9adb6' }}>Tips</Text>
          <Money value={summary.tips_total} style={{ fontSize: 18, marginTop: 2 }} />
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: '#a9adb6' }}>Sales</Text>
          <Money value={summary.sales_total} style={{ fontSize: 18, marginTop: 2 }} />
        </Card>
      </View>
      <Card style={{ marginTop: 10 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>
          Grand Total: <Money value={summary.grand_total} />
        </Text>
      </Card>

      {/* Per-staff (owner/receptionist only) */}
      {isOwnerOrReception && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>By Staff</Text>

          <Card style={{ marginTop: 10 }}>
            <Text style={{ color: '#a9adb6' }}>All Staff Totals</Text>
            <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
              <Card style={{ flex: 1 }}>
                <Text style={{ color: '#a9adb6' }}>Services</Text>
                <Money value={byStaff.totals?.services_total} />
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={{ color: '#a9adb6' }}>Tips</Text>
                <Money value={byStaff.totals?.tips_total} />
              </Card>
              <Card style={{ flex: 1 }}>
                <Text style={{ color: '#a9adb6' }}>Sales</Text>
                <Money value={byStaff.totals?.sales_total} />
              </Card>
            </View>
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: '#a9adb6' }}>Grand Total</Text>
              <Money value={byStaff.totals?.grand_total} style={{ fontSize: 18 }} />
            </View>
          </Card>

          {Array.isArray(byStaff.staff) && byStaff.staff.map(s => (
            <Card key={s.staff_id} style={{ marginTop: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{s.staff_name}</Text>
              <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                <Card style={{ flex: 1 }}>
                  <Text style={{ color: '#a9adb6' }}>Services</Text>
                  <Money value={s.services_total} />
                </Card>
                <Card style={{ flex: 1 }}>
                  <Text style={{ color: '#a9adb6' }}>Tips</Text>
                  <Money value={s.tips_total} />
                </Card>
                <Card style={{ flex: 1 }}>
                  <Text style={{ color: '#a9adb6' }}>Sales</Text>
                  <Money value={s.sales_total} />
                </Card>
              </View>
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: '#a9adb6' }}>Total</Text>
                <Money value={s.grand_total} style={{ fontSize: 18 }} />
              </View>
            </Card>
          ))}
        </View>
      )}

      <Text style={{ color: '#fff', fontWeight: '600', marginTop: 20 }}>
        {isOwnerOrReception ? 'Appointments in Range (all staff)' : 'Your Appointments in Range'}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#111827' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar style="light" backgroundColor="#111827" />

          <FlatList
            data={appointments}
            keyExtractor={(a) => String(a.id)}
            ListHeaderComponent={header}
            renderItem={({ item }) => (
              <Card style={{ marginHorizontal: 16, marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>{item.service_name}</Text>
                <Text style={{ color: '#a9adb6' }}>{fmtRange(item.start_time, item.end_time)}</Text>
                <Text style={{ color: '#a9adb6' }}>
                  Price: ${Number(item.price || 0).toFixed(2)} | Tip: ${Number(item.tip || 0).toFixed(2)}
                </Text>
                <Text style={{ color: '#a9adb6', marginTop: 2 }}>
                  Client: {(() => {
                    const c = clients.find(x => x.id === item.client_id);
                    return c ? `${c.first_name} ${c.last_name}` : `Client #${item.client_id}`;
                  })()} | Staff: {(() => {
                    const s = staff.find(x => x.id === item.staff_id);
                    return s ? s.name : `Staff #${item.staff_id}`;
                  })()}
                </Text>
              </Card>
            )}
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          />

          <View style={{ padding: 16 }}>
            <Button title="Logout" onPress={onLogout} color={Platform.OS === 'ios' ? undefined : '#e11d48'} />
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}