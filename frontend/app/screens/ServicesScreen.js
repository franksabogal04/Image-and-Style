import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Button, Platform, Alert, FlatList, TouchableOpacity, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { API_BASE_URL } from '../config';

async function fetchOk(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${r.status} ${t}`);
  }
  return r;
}

export default function ServicesScreen({ token, me }) {
  const color = {
    bg: '#111827',
    card: '#14141a',
    text: '#f2f3f5',
    sub: '#a9adb6',
    border: '#2a2a33',
    inputBg: '#1b1b22',
    primary: '#3b82f6',
    muted: '#6b7280',
    danger: '#e11d48',
    success: '#10b981',
  };

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Owner gate
  if (me?.role !== 'owner') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
        <StatusBar style="light" backgroundColor={color.bg} />
        <View style={{ padding: 16 }}>
          <Text style={{ color: color.text, fontSize: 20, fontWeight: '700' }}>Services</Text>
          <Text style={{ color: color.sub, marginTop: 8 }}>
            Only the owner can manage services and specialties.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Specialties (categories) come from /public/specialties
  const [specialties, setSpecialties] = useState([]); // [{slug,label}]
  const [selectedCat, setSelectedCat] = useState(''); // slug
  const [newCat, setNewCat] = useState(''); // input for creating new specialty label/slug

  // Services in selected category
  const [services, setServices] = useState([]); // [{id,name,duration_minutes,price,category}]
  const [loading, setLoading] = useState(false);

  // Create form
  const [svcName, setSvcName] = useState('');
  const [svcDuration, setSvcDuration] = useState('30');
  const [svcPrice, setSvcPrice] = useState('0');

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('30');
  const [editPrice, setEditPrice] = useState('0');

  const selectedLabel = useMemo(
    () => specialties.find(s => s.slug === selectedCat)?.label || selectedCat || '',
    [specialties, selectedCat]
  );

  const loadSpecialties = async () => {
    try {
      const r = await fetchOk(`${API_BASE_URL}/public/specialties`);
      const list = await r.json();
      setSpecialties(Array.isArray(list) ? list : []);
      if (!selectedCat && Array.isArray(list) && list.length) {
        setSelectedCat(list[0].slug);
      }
    } catch (e) {
      setSpecialties([]);
      Alert.alert('Load error', `Failed to load specialties: ${e.message}`);
    }
  };

  const loadServicesFor = async (cat) => {
    setLoading(true);
    setServices([]);
    try {
      if (!cat) { setLoading(false); return; }
      const r = await fetchOk(`${API_BASE_URL}/public/services?category=${encodeURIComponent(cat)}`);
      const list = await r.json();
      setServices(Array.isArray(list) ? list : []);
    } catch (e) {
      setServices([]);
      Alert.alert('Load error', `Failed to load services: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadSpecialties();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await loadServicesFor(selectedCat);
    })();
  }, [selectedCat]);

  const resetCreateForm = () => {
    setSvcName('');
    setSvcDuration('30');
    setSvcPrice('0');
  };

  const createService = async () => {
    try {
      const category = selectedCat || newCat.trim().toLowerCase();
      if (!category) return Alert.alert('Missing', 'Choose a specialty or create a new one.');
      if (!svcName.trim()) return Alert.alert('Missing', 'Enter a service name.');
      const duration = Math.max(1, parseInt(svcDuration || '0', 10));
      const price = Number.isFinite(parseFloat(svcPrice)) ? parseFloat(svcPrice) : 0;

      const body = JSON.stringify({
        name: svcName.trim(),
        duration_minutes: duration,
        price,
        category, // create new specialty if not existing
      });

      await fetchOk(`${API_BASE_URL}/services/`, {
        method: 'POST',
        headers: authHeaders,
        body,
      });

      if (!selectedCat) setSelectedCat(category); // lock selection to the newly created specialty
      await Promise.all([loadServicesFor(category), loadSpecialties()]);
      resetCreateForm();
      setNewCat('');
      Keyboard.dismiss();
      Alert.alert('Created', 'Service added.');
    } catch (e) {
      Alert.alert('Create failed', String(e.message || e));
    }
  };

  const startEdit = (svc) => {
    setEditingId(svc.id);
    setEditName(svc.name || '');
    setEditDuration(String(svc.duration_minutes ?? 30));
    setEditPrice(String(svc.price ?? 0));
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    try {
      if (!editingId) return;
      const duration = Math.max(1, parseInt(editDuration || '0', 10));
      const price = Number.isFinite(parseFloat(editPrice)) ? parseFloat(editPrice) : 0;

      const body = JSON.stringify({
        name: editName.trim() || undefined,
        duration_minutes: duration,
        price,
        category: selectedCat || undefined, // keep same category
      });

      await fetchOk(`${API_BASE_URL}/services/${editingId}`, {
        method: 'PUT',
        headers: authHeaders,
        body,
      });

      setEditingId(null);
      await loadServicesFor(selectedCat);
      Alert.alert('Saved', 'Service updated.');
    } catch (e) {
      Alert.alert('Update failed', String(e.message || e));
    }
  };

  const deleteService = async (id, name) => {
    Alert.alert(
      'Delete service?',
      `Remove "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await fetchOk(`${API_BASE_URL}/services/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              await Promise.all([loadServicesFor(selectedCat), loadSpecialties()]);
            } catch (e) {
              Alert.alert('Delete failed', String(e.message || e));
            }
          }
        }
      ]
    );
  };

  const CategoryFilters = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {specialties.map(s => {
        const active = selectedCat === s.slug;
        return (
          <TouchableOpacity
            key={s.slug}
            onPress={() => setSelectedCat(s.slug)}
            style={{
              paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999,
              borderWidth: 1, borderColor: color.border,
              backgroundColor: active ? color.card : color.inputBg
            }}
          >
            <Text style={{ color: active ? color.text : color.sub }}>
              {s.label || s.slug}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const CreateCard = (
    <View style={{ backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: 10, padding: 12 }}>
      <Text style={{ color: color.text, fontWeight: '700', marginBottom: 8 }}>Add a service</Text>

      <Text style={{ color: color.text, marginBottom: 6 }}>Specialty</Text>
      {selectedCat ? (
        <View style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: color.border, backgroundColor: color.inputBg, marginBottom: 10 }}>
          <Text style={{ color: color.text }}>{selectedLabel || selectedCat}</Text>
          <Text style={{ color: color.sub, marginTop: 4, fontSize: 12 }}>Selected above</Text>
        </View>
      ) : (
        <>
          <TextInput
            value={newCat}
            onChangeText={setNewCat}
            autoCapitalize="none"
            placeholder="Type a new specialty (e.g., hair, nails, makeup)"
            placeholderTextColor="#7a7f88"
            style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 10 }}
          />
          <Text style={{ color: color.sub, fontSize: 12, marginBottom: 6 }}>
            Tip: You can also tap an existing specialty above to add into it.
          </Text>
        </>
      )}

      <Text style={{ color: color.text, marginBottom: 6 }}>Service name</Text>
      <TextInput
        value={svcName}
        onChangeText={setSvcName}
        placeholder="e.g., Haircut, Full Color"
        placeholderTextColor="#7a7f88"
        style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 10 }}
      />

      <Text style={{ color: color.text, marginBottom: 6 }}>Duration (minutes)</Text>
      <TextInput
        value={svcDuration}
        onChangeText={setSvcDuration}
        keyboardType="number-pad"
        placeholder="30"
        placeholderTextColor="#7a7f88"
        style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 10 }}
      />

      <Text style={{ color: color.text, marginBottom: 6 }}>Price ($)</Text>
      <TextInput
        value={svcPrice}
        onChangeText={setSvcPrice}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor="#7a7f88"
        style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 12 }}
      />

      <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
        <Button title="Create Service" onPress={createService} color={Platform.OS === 'ios' ? undefined : color.primary} />
      </View>
    </View>
  );

  const ServiceItem = ({ item }) => {
    const isEditing = editingId === item.id;

    if (!isEditing) {
      return (
        <View style={{ backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <Text style={{ color: color.text, fontWeight: '600' }}>{item.name}</Text>
          <Text style={{ color: color.sub, marginTop: 4 }}>
            {item.duration_minutes} min • ${Number(item.price || 0).toFixed(2)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
              <Button title="Edit" onPress={() => startEdit(item)} color={Platform.OS === 'ios' ? undefined : color.success} />
            </View>
            <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
              <Button title="Delete" onPress={() => deleteService(item.id, item.name)} color={Platform.OS === 'ios' ? undefined : color.danger} />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={{ backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: 10, padding: 12, marginBottom: 10 }}>
        <Text style={{ color: color.text, fontWeight: '700', marginBottom: 8 }}>Edit service</Text>

        <Text style={{ color: color.text, marginBottom: 6 }}>Name</Text>
        <TextInput
          value={editName}
          onChangeText={setEditName}
          placeholder="Service name"
          placeholderTextColor="#7a7f88"
          style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 10 }}
        />

        <Text style={{ color: color.text, marginBottom: 6 }}>Duration (minutes)</Text>
        <TextInput
          value={editDuration}
          onChangeText={setEditDuration}
          keyboardType="number-pad"
          placeholder="30"
          placeholderTextColor="#7a7f88"
          style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 10 }}
        />

        <Text style={{ color: color.text, marginBottom: 6 }}>Price ($)</Text>
        <TextInput
          value={editPrice}
          onChangeText={setEditPrice}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#7a7f88"
          style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 12 }}
        />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
            <Button title="Save" onPress={saveEdit} color={Platform.OS === 'ios' ? undefined : color.primary} />
          </View>
          <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
            <Button title="Cancel" onPress={cancelEdit} color={Platform.OS === 'ios' ? undefined : color.muted} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <StatusBar style="light" backgroundColor={color.bg} />
      <FlatList
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            <Text style={{ color: color.text, fontSize: 22, fontWeight: '700' }}>Services (Owner Only)</Text>
            <Text style={{ color: color.sub, marginTop: 6 }}>
              Choose a specialty (category) or type a new one, then add or edit services.
            </Text>

            {/* Specialty filter chips */}
            <Text style={{ color: color.text, fontWeight: '600', marginTop: 14, marginBottom: 6 }}>Specialties</Text>
            {CategoryFilters}

            {/* Create new specialty hint */}
            <Text style={{ color: color.sub, marginTop: 10, fontSize: 12 }}>
              Don’t see the specialty you want? Leave the selection empty and type a new one below when creating a service.
            </Text>

            {/* Create service */}
            <Text style={{ color: color.text, fontWeight: '600', marginTop: 16, marginBottom: 6 }}>
              Create a service {selectedLabel ? `in “${selectedLabel}”` : '(choose or type a new specialty)'}
            </Text>
            {CreateCard}

            {/* Services list header */}
            <Text style={{ color: color.text, fontWeight: '600', marginTop: 18 }}>
              {selectedLabel ? `Services in “${selectedLabel}”` : 'Pick a specialty to view its services'}
            </Text>
            <Text style={{ color: color.sub, marginTop: 4, marginBottom: 8 }}>
              {loading ? 'Loading…' : (selectedCat ? '' : 'No specialty selected.')}
            </Text>
          </View>
        }
        data={services}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => <ServiceItem item={item} />}
        ListEmptyComponent={
          selectedCat ? (
            <View style={{ paddingHorizontal: 16 }}>
              <View style={{ backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: 10, padding: 12 }}>
                <Text style={{ color: color.sub }}>
                  No services yet in this specialty. Add one above.
                </Text>
              </View>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
}