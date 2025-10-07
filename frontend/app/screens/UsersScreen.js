// Frontend/app/screens/UsersScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button, Platform, Alert, FlatList, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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

export default function UsersScreen({ token }) {
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [list, setList] = useState([]);
  const [filterRole, setFilterRole] = useState('all');

  // create form
  const [email, setEmail] = useState('');
  const [name, setName]   = useState('');
  const [role, setRole]   = useState('staff');
  const [password, setPassword] = useState('');
  const [profession, setProfession] = useState('');
  const [avatarUrl, setAvatarUrl]   = useState('');     // final URL (create)
  const [avatarLocal, setAvatarLocal] = useState(null); // preview (create)

  // edit form (inline per-item)
  const [editingId, setEditingId] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('staff');
  const [editProfession, setEditProfession] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editPassword, setEditPassword] = useState(''); // optional reset
  const [editAvatarLocal, setEditAvatarLocal] = useState(null);

  // scoped here to avoid redeclare issues on HMR
  const ROLE_CHOICES = [
    { label: 'Receptionist', value: 'receptionist' },
    { label: 'Staff', value: 'staff' },
  ];

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
  };

  const load = async () => {
    try {
      const url = new URL(`${API_BASE_URL}/users/`);
      if (filterRole !== 'all') url.searchParams.set('role', filterRole);
      const r = await fetchOk(url.toString(), { headers: authHeaders });
      setList(await r.json());
    } catch (e) {
      Alert.alert('Error', String(e.message || e));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRole]);

  // -------- image pick & upload helpers (shared) --------
  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return null;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (res.canceled) return null;
    return res.assets?.[0] || null;
  };

  const uploadAvatarFile = async (asset) => {
    const form = new FormData();
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName || 'avatar.jpg',
      type: asset.mimeType || 'image/jpeg',
    });
    const up = await fetch(`${API_BASE_URL}/upload/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // don't set content-type manually
      body: form,
    });
    if (!up.ok) throw new Error(`${up.status} ${await up.text()}`);
    const data = await up.json();
    if (!data?.url) throw new Error('Upload did not return a URL');
    return data.url;
  };

  // -------- create flow --------
  const pickAndUploadAvatar = async () => {
    try {
      const asset = await pickFromLibrary();
      if (!asset) return;
      setAvatarLocal(asset.uri);
      const url = await uploadAvatarFile(asset);
      setAvatarUrl(url);
      Alert.alert('Uploaded', 'Avatar uploaded—ready to save the user.');
    } catch (e) {
      Alert.alert('Upload failed', String(e.message || e));
    }
  };

  const createUser = async () => {
    try {
      const body = {
        email: email.trim(),
        name: name.trim(),
        role,                // 'staff' | 'receptionist'
        password,
        profession: profession.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      };
      if (!body.email || !body.name || !body.password) {
        return Alert.alert('Missing fields', 'Email, name, and password are required.');
      }
      await fetchOk(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      setEmail(''); setName(''); setPassword('');
      setProfession(''); setAvatarUrl(''); setAvatarLocal(null);
      Alert.alert('User created', `${body.name} (${body.role})`);
      await load();
    } catch (e) {
      Alert.alert('Create failed', String(e.message || e));
    }
  };

  // -------- edit flow --------
  const startEdit = (u) => {
    setEditingId(u.id);
    setEditEmail(u.email || '');
    setEditName(u.name || '');
    setEditRole(u.role || 'staff');
    setEditProfession(u.profession || '');
    setEditAvatarUrl(u.avatar_url || '');
    setEditPassword('');
    setEditAvatarLocal(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPassword('');
    setEditAvatarLocal(null);
  };

  const pickAndUploadAvatarEdit = async () => {
    try {
      const asset = await pickFromLibrary();
      if (!asset) return;
      setEditAvatarLocal(asset.uri);
      const url = await uploadAvatarFile(asset);
      setEditAvatarUrl(url);
      Alert.alert('Uploaded', 'Avatar uploaded—ready to save.');
    } catch (e) {
      Alert.alert('Upload failed', String(e.message || e));
    }
  };

  const saveEdit = async () => {
    try {
      if (!editingId) return;
      const body = {
        email: editEmail.trim(),
        name: editName.trim(),
        role: editRole,
        profession: editProfession.trim() || null,
        avatar_url: editAvatarUrl.trim() || null,
      };
      if (editPassword.trim()) {
        body.password = editPassword.trim(); // optional password reset
      }
      await fetchOk(`${API_BASE_URL}/users/${editingId}`, {
        method: 'PUT', // matches backend
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      cancelEdit();
      await load();
      Alert.alert('Saved', 'User updated.');
    } catch (e) {
      Alert.alert('Update failed', String(e.message || e));
    }
  };

  const deleteUser = async (id, displayName) => {
    Alert.alert(
      'Delete user?',
      `Remove ${displayName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetchOk(`${API_BASE_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              await load();
            } catch (e) {
              Alert.alert('Delete failed', String(e.message || e));
            }
          },
        },
      ]
    );
  };

  const Header = (
    <View style={{ padding: 16 }}>
      <Text style={{ color: color.text, fontSize: 22, fontWeight: '600', marginBottom: 8 }}>
        Users (Owner Only)
      </Text>
      <Text style={{ color: color.sub, marginBottom: 12 }}>API: {API_BASE_URL}</Text>

      {/* Filter */}
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {['all', 'receptionist', 'staff'].map(r => {
          const active = filterRole === r;
          return (
            <View
              key={r}
              style={{
                marginRight: 8, borderWidth: 1, borderColor: color.border,
                backgroundColor: active ? color.card : '#1b1b22', borderRadius: 8, overflow: 'hidden'
              }}
            >
              <Button
                title={r.charAt(0).toUpperCase() + r.slice(1)}
                onPress={() => setFilterRole(r)}
                color={Platform.OS === 'ios' ? undefined : (active ? color.primary : color.muted)}
              />
            </View>
          );
        })}
      </View>

      {/* Create form */}
      <View style={{ backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: 10, padding: 12 }}>
        <Text style={{ color: color.text, fontWeight: '600', marginBottom: 8 }}>Create user</Text>

        <Text style={{ color: color.text, marginBottom: 6 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="user@example.com"
          placeholderTextColor="#7a7f88"
          style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 10 }}
        />

        <Text style={{ color: color.text, marginBottom: 6 }}>Full name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor="#7a7f88"
          style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 10 }}
        />

        <Text style={{ color: color.text, marginBottom: 6 }}>Role</Text>
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          {ROLE_CHOICES.map(opt => {
            const active = role === opt.value;
            return (
              <View key={opt.value}
                style={{
                  marginRight: 8, borderWidth: 1, borderColor: color.border,
                  backgroundColor: active ? color.card : '#1b1b22', borderRadius: 8, overflow: 'hidden'
                }}>
                <Button
                  title={opt.label}
                  onPress={() => setRole(opt.value)}
                  color={Platform.OS === 'ios' ? undefined : (active ? color.primary : color.muted)}
                />
              </View>
            );
          })}
        </View>

        {/* Profession */}
        <Text style={{ color: color.text, marginBottom: 6 }}>Profession (e.g., hair, nails, skincare)</Text>
        <TextInput
          value={profession}
          onChangeText={setProfession}
          placeholder="hair"
          placeholderTextColor="#7a7f88"
          style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 10 }}
        />

        {/* Avatar URL (still supported) */}
        <Text style={{ color: color.text, marginBottom: 6 }}>Avatar URL (optional)</Text>
        <TextInput
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="https://…/photo.jpg"
          placeholderTextColor="#7a7f88"
          autoCapitalize="none"
          style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 8 }}
        />

        {/* Pick/Upload photo helper */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
            <Button
              title={avatarUrl ? "Change Photo" : "Pick & Upload Photo"}
              onPress={pickAndUploadAvatar}
              color={Platform.OS === 'ios' ? undefined : color.primary}
            />
          </View>
          {!!avatarUrl && (
            <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
              <Button
                title="Clear Photo"
                onPress={() => { setAvatarUrl(''); setAvatarLocal(null); }}
                color={Platform.OS === 'ios' ? undefined : color.muted}
              />
            </View>
          )}
        </View>

        {/* Preview */}
        {(avatarLocal || avatarUrl) && (
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Image
              source={{ uri: avatarLocal || avatarUrl }}
              style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: color.border }}
            />
            <Text style={{ color: color.sub, marginTop: 6, fontSize: 12 }}>
              {avatarUrl ? 'Ready to save with this photo' : 'Local preview'}
            </Text>
          </View>
        )}

        <Text style={{ color: color.text, marginBottom: 6 }}>Temporary password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Temp password"
          placeholderTextColor="#7a7f88"
          style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 12 }}
        />

        <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
          <Button title="Create" onPress={createUser} color={Platform.OS === 'ios' ? undefined : color.primary} />
        </View>
      </View>

      <Text style={{ color: color.text, fontWeight: '600', marginTop: 16 }}>Users</Text>
    </View>
  );

  const Item = ({ item }) => {
    const isEditing = editingId === item.id;
    return (
      <View style={{
        backgroundColor: color.card, marginHorizontal: 16, marginBottom: 10,
        borderWidth: 1, borderColor: color.border, borderRadius: 10, padding: 12
      }}>
        {!isEditing ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {item.avatar_url ? (
                <Image
                  source={{ uri: item.avatar_url }}
                  style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: color.border }}
                />
              ) : (
                <View style={{
                  width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: color.border,
                  alignItems: 'center', justifyContent: 'center', backgroundColor: '#1b1b22'
                }}>
                  <Text style={{ color: color.sub, fontWeight: '700' }}>
                    {item.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: color.text, fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: color.sub }}>{item.email}</Text>
                <Text style={{ color: color.sub, marginTop: 2 }}>Role: {item.role}</Text>
                {!!item.profession && (
                  <Text style={{ color: color.sub, marginTop: 2 }}>Profession: {item.profession}</Text>
                )}
              </View>
            </View>

            {/* Row: Edit / Delete */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
                <Button
                  title="Edit"
                  onPress={() => startEdit(item)}
                  color={Platform.OS === 'ios' ? undefined : color.primary}
                />
              </View>
              <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
                <Button
                  title="Delete"
                  onPress={() => deleteUser(item.id, item.name)}
                  color={Platform.OS === 'ios' ? undefined : color.danger}
                />
              </View>
            </View>
          </>
        ) : (
          <>
            {/* EDITING FORM */}
            <Text style={{ color: color.text, fontWeight: '600', marginBottom: 8 }}>Edit user</Text>

            <Text style={{ color: color.text, marginBottom: 6 }}>Email</Text>
            <TextInput
              value={editEmail}
              onChangeText={setEditEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="user@example.com"
              placeholderTextColor="#7a7f88"
              style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 10 }}
            />

            <Text style={{ color: color.text, marginBottom: 6 }}>Full name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Full name"
              placeholderTextColor="#7a7f88"
              style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 10 }}
            />

            <Text style={{ color: color.text, marginBottom: 6 }}>Role</Text>
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              {ROLE_CHOICES.map(opt => {
                const active = editRole === opt.value;
                return (
                  <View key={opt.value}
                    style={{
                      marginRight: 8, borderWidth: 1, borderColor: color.border,
                      backgroundColor: active ? color.card : '#1b1b22', borderRadius: 8, overflow: 'hidden'
                    }}>
                    <Button
                      title={opt.label}
                      onPress={() => setEditRole(opt.value)}
                      color={Platform.OS === 'ios' ? undefined : (active ? color.primary : color.muted)}
                    />
                  </View>
                );
              })}
            </View>

            <Text style={{ color: color.text, marginBottom: 6 }}>Profession</Text>
            <TextInput
              value={editProfession}
              onChangeText={setEditProfession}
              placeholder="hair"
              placeholderTextColor="#7a7f88"
              style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 10 }}
            />

            <Text style={{ color: color.text, marginBottom: 6 }}>Avatar URL</Text>
            <TextInput
              value={editAvatarUrl}
              onChangeText={setEditAvatarUrl}
              placeholder="https://…/photo.jpg"
              placeholderTextColor="#7a7f88"
              autoCapitalize="none"
              style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 8 }}
            />

            {/* Edit pick/upload + preview */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
                <Button
                  title="Pick & Upload Photo"
                  onPress={pickAndUploadAvatarEdit}
                  color={Platform.OS === 'ios' ? undefined : color.primary}
                />
              </View>
              {!!editAvatarUrl && (
                <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
                  <Button
                    title="Clear Photo"
                    onPress={() => { setEditAvatarUrl(''); setEditAvatarLocal(null); }}
                    color={Platform.OS === 'ios' ? undefined : color.muted}
                  />
                </View>
              )}
            </View>

            {(editAvatarLocal || editAvatarUrl) && (
              <View style={{ alignItems: 'center', marginBottom: 10 }}>
                <Image
                  source={{ uri: editAvatarLocal || editAvatarUrl }}
                  style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 1, borderColor: color.border }}
                />
                <Text style={{ color: color.sub, marginTop: 6, fontSize: 12 }}>
                  {editAvatarUrl ? 'Will save with this photo' : 'Local preview'}
                </Text>
              </View>
            )}

            <Text style={{ color: color.text, marginBottom: 6 }}>New password (optional)</Text>
            <TextInput
              value={editPassword}
              onChangeText={setEditPassword}
              secureTextEntry
              placeholder="Leave blank to keep current password"
              placeholderTextColor="#7a7f88"
              style={{ color: color.text, backgroundColor: color.inputBg, borderWidth: 1, borderColor: color.border, borderRadius: 8, padding: 10, marginBottom: 12 }}
            />

            {/* Save / Cancel */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
                <Button
                  title="Save"
                  onPress={saveEdit}
                  color={Platform.OS === 'ios' ? undefined : color.primary}
                />
              </View>
              <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: color.border }}>
                <Button
                  title="Cancel"
                  onPress={cancelEdit}
                  color={Platform.OS === 'ios' ? undefined : color.muted}
                />
              </View>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }}>
      <StatusBar style="light" backgroundColor={color.bg} />
      <FlatList
        data={list}
        keyExtractor={(u) => String(u.id)}
        ListHeaderComponent={Header}
        renderItem={({ item }) => <Item item={item} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}