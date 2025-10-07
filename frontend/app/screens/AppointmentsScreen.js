// Frontend/app/screens/AppointmentsScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import {
  View, Text, Button, TouchableOpacity, Alert,
  FlatList, Platform, TextInput,
  KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard,
  Animated, Dimensions, Pressable, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const OPEN_TIME = 9;   // 9am
const CLOSE_TIME = 19; // 7pm
const SLOT_MINUTES = 15;

const pad = (n) => String(n).padStart(2, '0');
function generateSlots(openHour = OPEN_TIME, closeHour = CLOSE_TIME, step = SLOT_MINUTES) {
  const slots = [];
  for (let h = openHour; h < closeHour; h++) {
    for (let m = 0; m < 60; m += step) {
      slots.push(`${pad(h)}:${pad(m)}`);
    }
  }
  return slots;
}

// Keep times in LOCAL time
function addMinutesLocal(dateTimeLocalStr, minutes) {
  const [dateStr, timeStr] = dateTimeLocalStr.split('T');
  const [Y, M, D] = dateStr.split('-').map(Number);
  const [h, m, s] = timeStr.split(':').map(Number);
  const base = new Date(Y, M - 1, D, h, m, s || 0);
  const added = new Date(base.getTime() + minutes * 60000);
  return `${added.getFullYear()}-${pad(added.getMonth() + 1)}-${pad(added.getDate())}T${pad(added.getHours())}:${pad(added.getMinutes())}:${pad(added.getSeconds())}`;
}

async function fetchOk(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status} ${t}`);
  }
  return res;
}

function computePanelWidth(winWidth) {
  return Math.round(Math.min(420, Math.max(320, winWidth * 0.88)));
}

/** ------- NEW: Format helpers ------- **/
function fmtMDY(date) {
  return new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}
function fmtTime12(date) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace('am','AM').replace('pm','PM');
}
function fmtRange(startISO, endISO) {
  const d = fmtMDY(startISO);
  const t1 = fmtTime12(startISO);
  const t2 = fmtTime12(endISO);
  return { date: d, times: `${t1} to ${t2}` };
}

export default function AppointmentsScreen({ token, onLogout, me }) {
  const [appointments, setAppointments] = useState([]);

  // staff (app side: show all, optionally filter by specialty)
  const [staff, setStaff] = useState([]);
  const [staffId, setStaffId] = useState(null);

  // clients
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(null);
  const [clientSearch, setClientSearch] = useState("");

  // add-client
  const [showAddClient, setShowAddClient] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [phone,     setPhone]     = useState("");
  const [email,     setEmail]     = useState("");

  // products (for add to ticket when editing)
  const [products, setProducts] = useState([]);

  // ------- NEW: dynamic specialties/services -------
  const [specialties, setSpecialties] = useState([]); // [{slug,label}]
  const [specialtySlug, setSpecialtySlug] = useState(""); // 'hair', 'nails', etc.
  const specialtyLabel = useMemo(
    () => (specialties.find(s => s.slug === specialtySlug)?.label || specialtySlug || ""),
    [specialties, specialtySlug]
  );

  const [services, setServices] = useState([]); // [{id,name,duration_minutes,price,category}]
  const [serviceId, setServiceId] = useState(null);
  const selectedService = useMemo(
    () => services.find(s => s.id === serviceId) || null,
    [services, serviceId]
  );

  // durations/pricing (can override)
  const [hours, setHours] = useState("0");
  const [minutesOverride, setMinutesOverride] = useState("30");
  const [price, setPrice] = useState("0");

  const today = new Date().toISOString().slice(0,10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState(null);
  const slotsForDay = useMemo(() => generateSlots(), []);

  // availability
  const [takenSlots, setTakenSlots] = useState(new Set());

  // EDITOR state
  const [editingId, setEditingId] = useState(null);
  const [editStartDate, setEditStartDate] = useState(today);
  const [editStartTime, setEditStartTime] = useState(null);
  const [editHours, setEditHours] = useState("0");
  const [editMinutes, setEditMinutes] = useState("30");
  const [editPrice, setEditPrice] = useState("0");
  const [editTip, setEditTip] = useState("0");
  const [editServiceName, setEditServiceName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // add product in editor
  const [addProdId, setAddProdId] = useState(null);
  const [addQty, setAddQty] = useState("1");

  // RIGHT SIDEBAR (create panel)
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(computePanelWidth(Dimensions.get('window').width));
  const slide = useRef(new Animated.Value(1)).current; // 1 = offscreen, 0 = visible

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setPanelWidth(computePanelWidth(window.width));
    });
    return () => sub?.remove?.();
  }, []);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const canPickStaff = me?.role === 'owner' || me?.role === 'receptionist';

  // loaders
  const loadAppointments = async () => {
    const r = await fetchOk(`${API_BASE_URL}/appointments/`, { headers: authHeaders });
    setAppointments(await r.json());
  };

  const loadClients = async () => {
    const url = new URL(`${API_BASE_URL}/clients/search`);
    url.searchParams.set('limit', '200');
    const r = await fetchOk(url.toString(), { headers: authHeaders });
    const list = await r.json();
    setClients(Array.isArray(list) ? list : []);
    if (!clientId && Array.isArray(list) && list.length > 0) setClientId(list[0].id);
  };

  const loadStaff = async () => {
    const r = await fetchOk(`${API_BASE_URL}/users/?role=staff`, { headers: authHeaders });
    const list = await r.json();
    setStaff(Array.isArray(list) ? list : []);
    if ((me?.role === 'owner' || me?.role === 'receptionist') && !staffId && list.length) {
      setStaffId(list[0].id);
    }
  };

  const loadProducts = async () => {
    try {
      const r = await fetchOk(`${API_BASE_URL}/products/`, { headers: authHeaders });
      const list = await r.json();
      setProducts(Array.isArray(list) ? list : []);
      if (Array.isArray(list) && list.length > 0) setAddProdId(list[0].id);
    } catch {
      setProducts([]);
    }
  };

  const loadAvailability = async (dateStr, staffVal) => {
    if (!dateStr || !staffVal) { setTakenSlots(new Set()); return; }
    const dayStart = `${dateStr}T00:00:00`;
    const dayEnd   = `${dateStr}T23:59:59`;
    const url = new URL(`${API_BASE_URL}/appointments/`);
    url.searchParams.set('start', dayStart);
    url.searchParams.set('end', dayEnd);
    url.searchParams.set('staff_id', String(staffVal));
    const r = await fetchOk(url.toString(), { headers: authHeaders });
    const list = await r.json();
    const set = new Set();
    list.forEach(appt => {
      const start = new Date(appt.start_time);
      const end   = new Date(appt.end_time);
      for (let t = new Date(start) ; t < end ; t = new Date(t.getTime() + SLOT_MINUTES * 60000)) {
        set.add(`${pad(t.getHours())}:${pad(t.getMinutes())}`);
      }
    });
    setTakenSlots(set);
  };

  // NEW: load specialties on mount
  const loadSpecialties = async () => {
    try {
      const r = await fetchOk(`${API_BASE_URL}/public/specialties`);
      const data = await r.json(); // [{slug,label}]
      setSpecialties(Array.isArray(data) ? data : []);
      // pick first specialty by default (optional)
      if (Array.isArray(data) && data.length && !specialtySlug) {
        setSpecialtySlug(data[0].slug);
      }
    } catch {
      setSpecialties([]);
    }
  };

  // NEW: load services when specialty changes
  useEffect(() => {
    (async () => {
      if (!specialtySlug) { setServices([]); setServiceId(null); return; }
      try {
        const r = await fetchOk(`${API_BASE_URL}/public/services?category=${encodeURIComponent(specialtySlug)}`);
        const svcs = await r.json();
        setServices(Array.isArray(svcs) ? svcs : []);
        if (Array.isArray(svcs) && svcs.length) {
          setServiceId(svcs[0].id);
          setHours("0");
          setMinutesOverride(String(svcs[0].duration_minutes ?? 30));
          setPrice(String(svcs[0].price ?? 0));
        } else {
          setServiceId(null);
          setMinutesOverride("30");
          setPrice("0");
        }

        // optionally auto-pick a staff who matches the specialty
        const match = staff.find(s => (s.profession || '').toLowerCase() === specialtySlug.toLowerCase());
        if (match) setStaffId(match.id);
      } catch {
        setServices([]);
        setServiceId(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialtySlug]);

  // Init
  useEffect(() => {
    (async () => {
      try {
        if (me?.id && !staffId && !canPickStaff) setStaffId(me.id);
        if (canPickStaff) await loadStaff();
        await Promise.all([loadClients(), loadAppointments(), loadProducts(), loadSpecialties()]);
      } catch (e) {
        Alert.alert('Init error', String(e.message || e));
      }
    })();
  }, [me?.id, me?.role]);

  useEffect(() => {
    (async () => {
      try {
        if (selectedDate && staffId) await loadAvailability(selectedDate, staffId);
        else setTakenSlots(new Set());
      } catch {
        setTakenSlots(new Set());
      }
    })();
  }, [selectedDate, staffId]);

  // actions
  const createClient = async () => {
    try {
      if (!firstName.trim() || !lastName.trim()) return Alert.alert('Missing info', 'First and last name are required.');
      const body = JSON.stringify({
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        phone:      phone.trim() || null,
        email:      email.trim() || null,
      });
      const res = await fetchOk(`${API_BASE_URL}/clients/`, { method: 'POST', headers: authHeaders, body });
      const cli = await res.json();
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
      if (!staffId) return Alert.alert('Select staff', 'Please pick who will perform the service.');
      if (!clientId) return Alert.alert('Select client', 'Please pick or create a client.');
      if (!selectedTime) return Alert.alert('Select time', 'Please choose a time slot.');
      if (takenSlots.has(selectedTime)) return Alert.alert('Time unavailable', 'That slot is already booked.');
      if (!selectedService) return Alert.alert('Select service', 'Please choose a service.');
      if (!specialtySlug) return Alert.alert('Select specialty', 'Please choose a specialty.');

      const totalMins = Math.max(5, (parseInt(hours || "0", 10) * 60) + parseInt(minutesOverride || "0", 10));
      const startISO = `${selectedDate}T${selectedTime}:00`;
      const endISO = addMinutesLocal(startISO, totalMins);
      const notes = `${specialtyLabel}${price ? ` | $${Number(price).toFixed(2)}` : ''} | ${totalMins} min`;

      const body = JSON.stringify({
        client_id: Number(clientId),
        staff_id: Number(staffId),
        service_name: selectedService.name,  // store name on appointment
        start_time: startISO,
        end_time: endISO,
        notes,
        price: Number(price)
      });

      await fetchOk(`${API_BASE_URL}/appointments/`, { method: 'POST', headers: authHeaders, body });

      setSelectedTime(null);
      await Promise.all([loadAppointments(), loadAvailability(selectedDate, staffId)]);
      Alert.alert('Success', `${selectedService.name} booked on ${selectedDate} at ${selectedTime}`);
      closePanel();
    } catch (e) {
      Alert.alert('Create failed', e.message);
    }
  };

  const deleteAppointment = async (id) => {
    try {
      await fetchOk(`${API_BASE_URL}/appointments/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      await Promise.all([loadAppointments(), loadAvailability(selectedDate, staffId)]);
    } catch (e) {
      Alert.alert('Delete failed', e.message);
    }
  };

  // ---- EDITOR ----
  const openEditor = (a) => {
    setEditingId(a.id);
    const start = new Date(a.start_time);
    const end = new Date(a.end_time);
    const mins = Math.max(5, Math.round((end - start) / 60000));
    setEditStartDate(a.start_time.slice(0,10));
    setEditStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
    setEditHours(String(Math.floor(mins / 60)));
    setEditMinutes(String(mins % 60));
    setEditPrice(String(a.price ?? 0));
    setEditTip(String(a.tip ?? 0));
    setEditServiceName(a.service_name || '');
    setEditNotes(a.notes || '');
    if (products.length > 0) setAddProdId(products[0].id);
    setAddQty("1");
  };

  const closeEditor = () => setEditingId(null);

  const saveEdits = async () => {
    try {
      if (!editingId) return;
      if (!editStartDate || !editStartTime) return Alert.alert('Missing', 'Pick start date/time.');
      const totalMins = Math.max(5, (parseInt(editHours || "0",10)*60) + parseInt(editMinutes || "0",10));
      const startISO = `${editStartDate}T${editStartTime}:00`;
      const endISO = addMinutesLocal(startISO, totalMins);

      const body = {
        start_time: startISO,
        end_time: endISO,
        price: Number(editPrice || 0),
        tip: Number(editTip || 0),
        service_name: editServiceName || undefined,
        notes: editNotes || undefined,
      };

      await fetchOk(`${API_BASE_URL}/appointments/${editingId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(body),
      });

      await Promise.all([loadAppointments(), loadAvailability(selectedDate, staffId)]);
      closeEditor();
      Alert.alert('Saved', 'Appointment updated.');
    } catch (e) {
      Alert.alert('Update failed', String(e.message || e));
    }
  };

  const addProductToTicket = async () => {
    try {
      if (!editingId) return;
      if (!addProdId) return Alert.alert('Pick a product', 'Please select a product.');
      const qty = Math.max(1, parseInt(addQty || "1", 10));
      await fetchOk(`${API_BASE_URL}/appointments/${editingId}/add_sale`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ product_id: Number(addProdId), quantity: qty }),
      });
      Alert.alert('Added', 'Product added to this ticket.');
    } catch (e) {
      Alert.alert('Add product failed', String(e.message || e));
    }
  };

  // ---------- RIGHT PANEL ----------
  const openPanel = async (dateString) => {
    if (dateString) setSelectedDate(dateString);
    if (staffId && (dateString || selectedDate)) {
      try { await loadAvailability(dateString || selectedDate, staffId); } catch {}
    }
    setPanelOpen(true);
    slide.setValue(1);
    Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };

  const closePanel = () => {
    Animated.timing(slide, { toValue: 1, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setPanelOpen(false);
    });
  };

  const translateX = useMemo(
    () => slide.interpolate({ inputRange: [0, 1], outputRange: [0, panelWidth] }),
    [slide, panelWidth]
  );

  // ui parts
  const Slot = ({ time }) => {
    const active = selectedTime === time;
    const isTaken = takenSlots.has(time);
    const disabled = isTaken;

    return (
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setSelectedTime(time)}
        style={{
          paddingVertical: 10, paddingHorizontal: 12, margin: 6,
          borderRadius: 8, borderWidth: 1,
          backgroundColor: disabled ? '#2a2a33' : active ? '#111827' : '#1b1b22',
          borderColor: disabled ? '#2a2a33' : active ? '#111827' : '#2a2a33',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Text style={{ color: disabled ? '#9aa0a6' : (active ? '#fff' : '#e4e6eb') }}>
          {time}{disabled ? ' • taken' : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c => {
      const name = `${c.first_name} ${c.last_name}`.toLowerCase();
      return name.includes(q) || (c.phone || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
    });
  }, [clients, clientSearch]);

  const getClientName = (id) => {
    const c = clients.find(x => x.id === id);
    return c ? `${c.first_name} ${c.last_name}` : `Client #${id}`;
  };
  const getStaffName = (id) => {
    if (canPickStaff) {
      const s = staff.find(x => x.id === id);
      return s ? s.name : `Staff #${id}`;
    }
    if (me?.id === id && me?.name) return me.name;
    return `Staff #${id}`;
  };

  // --------- SIDEBAR CONTENT ----------
  const SidebarContent = (
    <View style={{ flex: 1, backgroundColor: '#0d0f16' }}>
      {/* Header */}
      <View style={{ padding: 14, paddingTop: 18, borderBottomWidth: 1, borderBottomColor: '#222635', backgroundColor: '#0d0f16' }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Create a new appointment</Text>
        <Text style={{ color: '#9aa0a6', marginTop: 2 }}>For {selectedDate}</Text>
      </View>

      {/* Scrollable body */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        {/* Client select / add */}
        <Text style={{ fontWeight: '600', color: '#fff' }}>Client</Text>
        <TextInput
          value={clientSearch}
          onChangeText={setClientSearch}
          placeholder="Search clients by name/phone/email"
          placeholderTextColor="#7a7f88"
          style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
        />
        {filteredClients.length > 0 ? (
          <View style={{ borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, marginTop: 6, backgroundColor: '#14141a', minHeight: Platform.OS === 'ios' ? 180 : undefined }}>
            <Picker
              selectedValue={clientId}
              onValueChange={(val) => setClientId(val)}
              mode={Platform.OS === 'android' ? 'dropdown' : undefined}
              dropdownIconColor="#f2f3f5"
              style={{ color: '#f2f3f5', backgroundColor: '#14141a', height: Platform.OS === 'android' ? 48 : undefined }}
              itemStyle={{ color: '#f2f3f5' }}
            >
              {filteredClients.map(c => (
                <Picker.Item key={c.id} label={`${c.first_name} ${c.last_name}${c.phone ? ` • ${c.phone}` : ''}`} value={c.id} />
              ))}
            </Picker>
          </View>
        ) : (
          <Text style={{ color: '#a9adb6', marginTop: 6 }}>No clients match. Add one below.</Text>
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
            <TextInput value={firstName} onChangeText={setFirstName} placeholder="Jane" placeholderTextColor="#7a7f88"
              style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginBottom: 10 }} />

            <Text style={{ color: '#fff', marginBottom: 6 }}>Last name</Text>
            <TextInput value={lastName} onChangeText={setLastName} placeholder="Doe" placeholderTextColor="#7a7f88"
              style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginBottom: 10 }} />

            <Text style={{ color: '#fff', marginBottom: 6 }}>Phone</Text>
            <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="555-123-4567" placeholderTextColor="#7a7f88"
              style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginBottom: 10 }} />

            <Text style={{ color: '#fff', marginBottom: 6 }}>Email</Text>
            <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="jane@example.com" placeholderTextColor="#7a7f88"
              style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginBottom: 12 }}
              returnKeyType="done" blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} />

            <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
              <Button title="Create Client" onPress={createClient} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
            </View>
          </View>
        )}

        {/* Staff (owner/receptionist) */}
        {canPickStaff && (
          <>
            <Text style={{ fontWeight: '600', marginTop: 16, color: '#fff' }}>Staff</Text>
            <View style={{ borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, marginTop: 6, backgroundColor: '#14141a', minHeight: Platform.OS === 'ios' ? 180 : undefined }}>
              <Picker
                selectedValue={staffId}
                onValueChange={(val) => setStaffId(val)}
                mode={Platform.OS === 'android' ? 'dropdown' : undefined}
                dropdownIconColor="#f2f3f5"
                style={{ color: '#f2f3f5', backgroundColor: '#14141a', height: Platform.OS === 'android' ? 48 : undefined }}
                itemStyle={{ color: '#f2f3f5' }}
              >
                {staff
                  .filter(s => !specialtySlug || (s.profession || '').toLowerCase() === specialtySlug.toLowerCase())
                  .map(s => (
                    <Picker.Item key={s.id} label={`${s.name}${s.email ? ` (${s.email})` : ''}`} value={s.id} />
                  ))}
              </Picker>
            </View>
          </>
        )}

        {/* Specialty */}
        <Text style={{ fontWeight: '600', marginTop: 16, color: '#fff' }}>Specialty</Text>
        <View style={{ borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, marginTop: 6, backgroundColor: '#14141a', minHeight: Platform.OS === 'ios' ? 180 : undefined }}>
          <Picker
            selectedValue={specialtySlug}
            onValueChange={(val) => setSpecialtySlug(val)}
            mode={Platform.OS === 'android' ? 'dropdown' : undefined}
            dropdownIconColor="#f2f3f5"
            style={{ color: '#f2f3f5', backgroundColor: '#14141a', height: Platform.OS === 'android' ? 48 : undefined }}
            itemStyle={{ color: '#f2f3f5' }}
          >
            {specialties.map(s => <Picker.Item key={s.slug} label={s.label || s.slug} value={s.slug} />)}
          </Picker>
        </View>
        <Text style={{ color: '#a9adb6', marginTop: 4 }}>Selected: {specialtyLabel || '—'}</Text>

        {/* Service */}
        <Text style={{ fontWeight: '600', marginTop: 12, color: '#fff' }}>Service</Text>
        <View style={{ borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, marginTop: 6, backgroundColor: '#14141a', minHeight: Platform.OS === 'ios' ? 180 : undefined }}>
          <Picker
            selectedValue={serviceId}
            onValueChange={(val) => {
              setServiceId(val);
              const meta = (services || []).find(s => s.id === val);
              setHours("0");
              setMinutesOverride(String(meta?.duration_minutes ?? 30));
              setPrice(String(meta?.price ?? 0));
            }}
            mode={Platform.OS === 'android' ? 'dropdown' : undefined}
            dropdownIconColor="#f2f3f5"
            style={{ color: '#f2f3f5', backgroundColor: '#14141a', height: Platform.OS === 'android' ? 48 : undefined }}
            itemStyle={{ color: '#f2f3f5' }}
          >
            {services.map(s => <Picker.Item key={s.id} label={`${s.name} (${s.duration_minutes} min)`} value={s.id} />)}
          </Picker>
        </View>
        <Text style={{ color: '#a9adb6', marginTop: 4 }}>Selected: {selectedService?.name || '—'}</Text>

        {/* Hours / Minutes / Price */}
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

        <Text style={{ fontWeight: '600', marginTop: 12, color: '#fff' }}>Minutes</Text>
        <TextInput
          value={minutesOverride}
          onChangeText={setMinutesOverride}
          keyboardType="number-pad"
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={() => Keyboard.dismiss()}
          placeholder={`${selectedService?.duration_minutes ?? 30}`}
          placeholderTextColor="#7a7f88"
          style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginTop: 6 }}
        />

        <Text style={{ fontWeight: '600', marginTop: 12, color: '#fff' }}>Price ($)</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={() => Keyboard.dismiss()}
          placeholder={`${selectedService?.price ?? 0}`}
          placeholderTextColor="#7a7f88"
          style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginTop: 6 }}
        />

        {/* Time slots */}
        <Text style={{ fontWeight: '700', marginTop: 18, marginBottom: 6, color: '#fff' }}>Pick a time</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {slotsForDay.map((t) => <Slot key={t} time={t} />)}
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View
        style={{
          position: 'absolute',
          left: 0, right: 0, bottom: 0,
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: '#222635',
          backgroundColor: '#0d0f16'
        }}
      >
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
            <Button title="Book" onPress={createAppointment} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
          </View>
          <View style={{ width: 110, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
            <Button title="Close" onPress={closePanel} color={Platform.OS === 'ios' ? undefined : '#6b7280'} />
          </View>
        </View>
      </View>
    </View>
  );

  // ---------- MAIN RENDER ----------
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#111827' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar style="light" backgroundColor="#111827" />

          {/* Header: Calendar only; clicking a date opens sidebar */}
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: '600', marginBottom: 8, color: '#fff' }}>Calendar</Text>
            <Calendar
              onDayPress={(d) => openPanel(d.dateString)}
              markedDates={{ [selectedDate]: { selected: true, selectedColor: '#3b82f6' } }}
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

            <View style={{ marginTop: 8, marginBottom: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
              <Button
                title="Refresh"
                onPress={async () => {
                  try {
                    await Promise.all([
                      loadClients(),
                      loadAppointments(),
                      loadAvailability(selectedDate, staffId),
                      loadProducts(),
                      loadSpecialties(),
                    ]);
                  } catch (e) {
                    Alert.alert('Refresh failed', String(e.message || e));
                  }
                }}
                color={Platform.OS === 'ios' ? undefined : '#3b82f6'}
              />
            </View>

            <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 8, color: '#fff' }}>Appointments</Text>
          </View>

          {/* Appointments list */}
          <FlatList
            data={appointments}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const { date, times } = fmtRange(item.start_time, item.end_time);
              const staffName = getStaffName(item.staff_id);
              const clientName = getClientName(item.client_id);

              return (
                <View style={{ backgroundColor: '#14141a', marginHorizontal: 16, marginVertical: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a33' }}>
                  <Text style={{ fontWeight: '600', color: '#fff' }}>{item.service_name}</Text>
                  <Text style={{ color: '#ccc' }}>{date} • {times}</Text>
                  <Text style={{ color: '#ccc' }}>Client: {clientName} • Staff: {staffName}</Text>
                  {!!item.notes && <Text style={{ color: '#a9adb6', marginTop: 4 }}>{item.notes}</Text>}
                  <Text style={{ color: '#a9adb6', marginTop: 4 }}>
                    Price: ${Number(item.price || 0).toFixed(2)} • Tip: ${Number(item.tip || 0).toFixed(2)}
                  </Text>

                  {/* Actions */}
                  <View style={{ marginTop: 8, flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
                      <Button title="Edit" onPress={() => openEditor(item)} color={Platform.OS === 'ios' ? undefined : '#10b981'} />
                    </View>
                    <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
                      <Button title="Delete" onPress={() => {
                        Alert.alert('Delete appointment?', 'This cannot be undone.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteAppointment(item.id) },
                        ]);
                      }} color={Platform.OS === 'ios' ? undefined : '#e11d48'} />
                    </View>
                  </View>

                  {/* Inline editor */}
                  {editingId === item.id && (
                    <View style={{ marginTop: 12, backgroundColor: '#0f1729', borderWidth: 1, borderColor: '#273043', borderRadius: 10, padding: 12 }}>
                      <Text style={{ color: '#fff', fontWeight: '700', marginBottom: 6 }}>Edit Appointment</Text>

                      <Text style={{ color: '#fff' }}>Date (YYYY-MM-DD)</Text>
                      <TextInput
                        value={editStartDate}
                        onChangeText={setEditStartDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#7a7f88"
                        style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
                      />

                      <Text style={{ color: '#fff', marginTop: 10 }}>Time (HH:MM)</Text>
                      <TextInput
                        value={editStartTime}
                        onChangeText={setEditStartTime}
                        placeholder="HH:MM"
                        placeholderTextColor="#7a7f88"
                        style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
                      />

                      <Text style={{ color: '#fff', marginTop: 10 }}>Hours</Text>
                      <TextInput
                        value={editHours}
                        onChangeText={setEditHours}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#7a7f88"
                        style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
                      />

                      <Text style={{ color: '#fff', marginTop: 10 }}>Minutes</Text>
                      <TextInput
                        value={editMinutes}
                        onChangeText={setEditMinutes}
                        keyboardType="number-pad"
                        placeholder="30"
                        placeholderTextColor="#7a7f88"
                        style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
                      />

                      <Text style={{ color: '#fff', marginTop: 10 }}>Service Name</Text>
                      <TextInput
                        value={editServiceName}
                        onChangeText={setEditServiceName}
                        placeholder="Service name"
                        placeholderTextColor="#7a7f88"
                        style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
                      />

                      <Text style={{ color: '#fff', marginTop: 10 }}>Price ($)</Text>
                      <TextInput
                        value={editPrice}
                        onChangeText={setEditPrice}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#7a7f88"
                        style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
                      />

                      <Text style={{ color: '#fff', marginTop: 10 }}>Tip ($)</Text>
                      <TextInput
                        value={editTip}
                        onChangeText={setEditTip}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#7a7f88"
                        style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
                      />

                      <Text style={{ color: '#fff', marginTop: 10 }}>Notes</Text>
                      <TextInput
                        value={editNotes}
                        onChangeText={setEditNotes}
                        placeholder="Notes"
                        placeholderTextColor="#7a7f88"
                        style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
                      />

                      {/* Add Product to this ticket */}
                      <View style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#273043' }}>
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Add Product</Text>
                        <View style={{ borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, marginTop: 6, backgroundColor: '#14141a', minHeight: Platform.OS === 'ios' ? 180 : undefined }}>
                          <Picker
                            selectedValue={addProdId}
                            onValueChange={(val) => setAddProdId(val)}
                            mode={Platform.OS === 'android' ? 'dropdown' : undefined}
                            dropdownIconColor="#f2f3f5"
                            style={{ color: '#f2f3f5', backgroundColor: '#14141a', height: Platform.OS === 'android' ? 48 : undefined }}
                            itemStyle={{ color: '#f2f3f5' }}
                          >
                            {products.map(p => (
                              <Picker.Item key={p.id} label={`${p.name} ($${Number(p.price || 0).toFixed(2)})`} value={p.id} />
                            ))}
                          </Picker>
                        </View>

                        <Text style={{ color: '#fff', marginTop: 10 }}>Quantity</Text>
                        <TextInput
                          value={addQty}
                          onChangeText={setAddQty}
                          keyboardType="number-pad"
                          placeholder="1"
                          placeholderTextColor="#7a7f88"
                          style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 10, marginTop: 6 }}
                        />

                        <View style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
                          <Button title="Add Product to Ticket" onPress={addProductToTicket} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
                        </View>
                      </View>

                      {/* Save / Cancel */}
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                        <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
                          <Button title="Save" onPress={saveEdits} color={Platform.OS === 'ios' ? undefined : '#10b981'} />
                        </View>
                        <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
                          <Button title="Cancel" onPress={closeEditor} color={Platform.OS === 'ios' ? undefined : '#6b7280'} />
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            }}
            ListFooterComponent={
              <View style={{ padding: 16 }}>
                <Button title="Logout" onPress={onLogout} color={Platform.OS === 'ios' ? undefined : '#e11d48' } />
              </View>
            }
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          />

          {/* RIGHT DRAWER & OVERLAY */}
          {panelOpen && (
            <>
              <Pressable
                onPress={closePanel}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
              />
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  right: 0,
                  width: panelWidth,
                  transform: [{ translateX }],
                  backgroundColor: '#0d0f16',
                  borderLeftWidth: 1,
                  borderLeftColor: '#1f2330',
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                {SidebarContent}
              </Animated.View>
            </>
          )}
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}