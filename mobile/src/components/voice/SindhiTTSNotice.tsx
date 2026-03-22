import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Dismissible notice shown on first Sindhi audio response.
 * Per ADR-0003: Sindhi TTS uses Urdu WaveNet voice as interim fallback.
 */
export default function SindhiTTSNotice({ visible, onDismiss }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.icon}>ℹ️</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Sindhi Voice Notice</Text>
          <Text style={styles.message}>
            Sindhi voice synthesis uses the Urdu voice model as an interim solution.
            A native Sindhi voice is planned for a future update.
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  icon: { fontSize: 16 },
  textContainer: { flex: 1 },
  title: { fontSize: 12, fontWeight: '700', color: '#1d4ed8', marginBottom: 2 },
  message: { fontSize: 11, color: '#374151', lineHeight: 16 },
  closeBtn: { padding: 2 },
  closeText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
});
