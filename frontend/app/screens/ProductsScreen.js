// Frontend/app/screens/ProductsScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Button, Alert, Platform, FlatList, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config';
import { StatusBar } from 'expo-status-bar';

export default function ProductsScreen({ token, onLogout }) {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name"); // 'name' | 'price_asc' | 'price_desc'

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products/`, { headers: authHeaders });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`${res.status} ${t}`);
      }
      const list = await res.json();
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      Alert.alert('Load failed', e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q));

    if (sort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'price_asc') {
      list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sort === 'price_desc') {
      list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    }
    return list;
  }, [products, search, sort]);

  const createProduct = async () => {
    try {
      if (!name.trim()) return Alert.alert('Missing name', 'Please enter a product name.');
      const priceNum = Number(price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return Alert.alert('Invalid price', 'Please enter a valid non-negative price.');
      }

      const res = await fetch(`${API_BASE_URL}/products/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: name.trim(), price: priceNum })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`${res.status} ${t}`);
      }
      setName("");
      setPrice("");
      Keyboard.dismiss();
      await load();
      Alert.alert('Product created', 'Saved successfully.');
    } catch (e) {
      Alert.alert('Create failed', e.message);
    }
  };

  const updateProduct = async (id, patch) => {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(patch)
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`${res.status} ${t}`);
      }
      await load();
    } catch (e) {
      Alert.alert('Update failed', e.message);
    }
  };

  const deleteProduct = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`${res.status} ${t}`);
      }
      await load();
    } catch (e) {
      Alert.alert('Delete failed', e.message);
    }
  };

  const Item = ({ item }) => (
    <View style={{ backgroundColor: '#14141a', marginHorizontal: 16, marginVertical: 6, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a33' }}>
      <Text style={{ color: '#fff', fontWeight: '600' }}>{item.name}</Text>
      <Text style={{ color: '#a9adb6', marginTop: 2 }}>${(item.price ?? 0).toFixed(2)}</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
          <Button
            title="- $1"
            onPress={() => updateProduct(item.id, { price: Math.max(0, (item.price ?? 0) - 1) })}
            color={Platform.OS === 'ios' ? undefined : '#6b7280'}
          />
        </View>
        <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
          <Button
            title="+ $1"
            onPress={() => updateProduct(item.id, { price: (item.price ?? 0) + 1 })}
            color={Platform.OS === 'ios' ? undefined : '#6b7280'}
          />
        </View>
        <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
          <Button
            title="Delete"
            onPress={() =>
              Alert.alert('Delete product?', `Remove ${item.name}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteProduct(item.id) },
              ])
            }
            color={Platform.OS === 'ios' ? undefined : '#e11d48'}
          />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      <StatusBar style="light" backgroundColor="#111827" />
      <View style={{ padding: 16 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '600', marginBottom: 8 }}>Products</Text>
        <Text style={{ color: '#a9adb6', marginBottom: 12 }}>API: {API_BASE_URL}</Text>

        {/* Create form */}
        <Text style={{ color: '#fff', marginBottom: 6 }}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Shampoo"
          placeholderTextColor="#7a7f88"
          style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginBottom: 10 }}
          returnKeyType="next"
        />

        <Text style={{ color: '#fff', marginBottom: 6 }}>Price ($)</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="12.00"
          placeholderTextColor="#7a7f88"
          style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginBottom: 12 }}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />

        <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33', marginBottom: 12 }}>
          <Button title="Create Product" onPress={createProduct} color={Platform.OS === 'ios' ? undefined : '#3b82f6'} />
        </View>

        {/* Search & sort */}
        <Text style={{ color: '#fff', marginBottom: 6 }}>Search</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Type to filter…"
          placeholderTextColor="#7a7f88"
          style={{ color: '#f2f3f5', backgroundColor: '#1b1b22', borderWidth: 1, borderColor: '#2a2a33', borderRadius: 8, padding: 12, marginBottom: 12 }}
          returnKeyType="search"
          onSubmitEditing={Keyboard.dismiss}
        />

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
            <Button title="Sort: Name" onPress={() => setSort('name')} color={Platform.OS === 'ios' ? undefined : (sort === 'name' ? '#3b82f6' : '#6b7280')} />
          </View>
          <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
            <Button title="Price ↑" onPress={() => setSort('price_asc')} color={Platform.OS === 'ios' ? undefined : (sort === 'price_asc' ? '#3b82f6' : '#6b7280')} />
          </View>
          <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a33' }}>
            <Button title="Price ↓" onPress={() => setSort('price_desc')} color={Platform.OS === 'ios' ? undefined : (sort === 'price_desc' ? '#3b82f6' : '#6b7280')} />
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <Item item={item} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}