
import React from 'react';
import { TextInput, View, Text } from 'react-native';

export default function TextInputField({ label, value, onChangeText, secureTextEntry=false }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        style={{ borderWidth: 1, padding: 10, borderRadius: 6 }}
        autoCapitalize="none"
      />
    </View>
  );
}
