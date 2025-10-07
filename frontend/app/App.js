// Frontend/app/App.js
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Button,
  Platform,
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';

import LoginScreen from './screens/LoginScreen';
import AppointmentsScreen from './screens/AppointmentsScreen';
import EarningsScreen from './screens/EarningsScreen';
import ClientsScreen from './screens/ClientsScreen';
import TimeScreen from './screens/TimeScreen';
import ProductsScreen from './screens/ProductsScreen';
import UsersScreen from './screens/UsersScreen';
import ServicesScreen from './screens/ServicesScreen'; // <-- NEW

const { width } = Dimensions.get('window');
const drawerWidth = width * 0.7;

export default function App() {
  const [token, setToken] = useState(null);
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('appointments');
  const [booting, setBooting] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync('token');
        if (saved) setToken(saved);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) { setMe(null); return; }
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        const user = await res.json();
        if (!cancelled) setMe(user);
      } catch {
        if (!cancelled) {
          Alert.alert('Session error', 'Please log in again.');
          setMe(null);
          setToken(null);
          try { await SecureStore.deleteItemAsync('token'); } catch {}
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const role = me?.role ?? 'staff';
  const isOwner = role === 'owner';
  const isReceptionist = role === 'receptionist';

  const allowedTabs = useMemo(() => {
    if (isOwner) return ['appointments', 'earnings', 'clients', 'products', 'time', 'users', 'services']; // <-- NEW last
    if (isReceptionist) return ['appointments', 'earnings', 'time'];
    return ['appointments', 'earnings', 'time'];
  }, [isOwner, isReceptionist]);

  useEffect(() => {
    if (!allowedTabs.includes(tab)) setTab(allowedTabs[0]);
  }, [allowedTabs, tab]);

  const handleLogin = async (newToken) => {
    setToken(newToken);
    try { await SecureStore.setItemAsync('token', newToken); } catch {}
  };

  const handleLogout = async () => {
    try { await SecureStore.deleteItemAsync('token'); } catch {}
    setToken(null);
    setMe(null);
    setTab('appointments');
  };

  const openMenu = () => {
    setDrawerOpen(true);
    Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  };
  const closeMenu = () => {
    Animated.timing(translateX, { toValue: -drawerWidth, duration: 250, useNativeDriver: true }).start(() => setDrawerOpen(false));
  };

  const labels = {
    appointments: 'Appointments',
    earnings: 'Earnings',
    clients: 'Clients',
    products: 'Products',
    time: 'Time',
    users: 'Users',
    services: 'Services', // <-- NEW
  };

  const MenuItem = ({ code }) => (
    <TouchableOpacity
      onPress={() => { setTab(code); closeMenu(); }}
      style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2330' }}
    >
      <Text style={{ color: tab === code ? '#3b82f6' : '#f9fafb', fontSize: 16, fontWeight: tab === code ? '700' : '500' }}>
        {labels[code]}
      </Text>
    </TouchableOpacity>
  );

  // Early returns
  if (booting) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="light" backgroundColor="#111827" />
        <ActivityIndicator />
        <Text style={{ color: '#fff', marginTop: 8 }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
        <StatusBar style="light" backgroundColor="#111827" />
        <LoginScreen onLogin={handleLogin} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      <StatusBar style="light" backgroundColor="#111827" />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a33' }}>
        <TouchableOpacity onPress={openMenu} style={{ marginRight: 12 }}>
          <Text style={{ color: '#3b82f6', fontSize: 18 }}>☰</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{labels[tab]}</Text>
      </View>

      {/* Screens */}
      {tab === 'appointments' && <AppointmentsScreen token={token} onLogout={handleLogout} me={me} />}
      {tab === 'earnings'     && <EarningsScreen     token={token} onLogout={handleLogout} me={me} />}
      {tab === 'clients'      && <ClientsScreen      token={token} onLogout={handleLogout} me={me} />}
      {tab === 'products'     && <ProductsScreen     token={token} onLogout={handleLogout} me={me} />}
      {tab === 'time'         && <TimeScreen         token={token} onLogout={handleLogout} me={me} />}
      {tab === 'users'        && <UsersScreen        token={token} />}
      {tab === 'services'     && <ServicesScreen     token={token} me={me} />}{/* <-- NEW */}

      {/* Drawer overlay */}
      {drawerOpen && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
          onPress={closeMenu}
        />
      )}

      {/* Drawer panel */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0, bottom: 0, left: 0,
          width: drawerWidth,
          transform: [{ translateX }],
          backgroundColor: '#0b1220',
          borderRightWidth: 1, borderRightColor: '#1f2330',
          paddingHorizontal: 12, paddingTop: 60,
        }}
      >
        <View style={{ backgroundColor: '#111827', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <Text style={{ color: '#f9fafb', fontWeight: '700' }}>{me?.name || 'User'}</Text>
          <Text style={{ color: '#9ca3af', marginTop: 2 }}>{me?.email}</Text>
          <Text style={{ color: '#9ca3af' }}>Role: {me?.role}</Text>
        </View>

        <View style={{ flexGrow: 1 }}>
          {allowedTabs.map((code) => <MenuItem key={code} code={code} />)}
        </View>

        <View style={{ paddingVertical: 12 }}>
          <View style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
            <Button title="Logout" onPress={handleLogout} color={Platform.OS === 'ios' ? undefined : '#e11d48'} />
          </View>
          <TouchableOpacity onPress={closeMenu} style={{ padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#9ca3af' }}>Close Menu</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}