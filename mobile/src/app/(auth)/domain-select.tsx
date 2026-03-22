/**
 * Domain Selection screen — shown after first login when no domain assigned.
 * Domain assignment is PERMANENT.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
interface Domain {
  id: string;
  name: string;
  slug: string;
  description?: string;
}
import { useAuth } from '../../lib/auth';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:8000';

export default function DomainSelectScreen() {
  const { assignDomain, user, accessToken } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/domains`)
      .then((r) => r.json())
      .then((data: Domain[]) => { setDomains(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleConfirm = async () => {
    if (!selected) return;
    const domain = domains.find((d) => d.id === selected);
    Alert.alert(
      'Confirm Domain Selection',
      `You are selecting "${domain?.name}". This cannot be changed later. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSubmitting(true);
            try {
              await assignDomain(selected);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to assign domain');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Domain</Text>
      <Text style={styles.warning}>
        ⚠️ This selection is permanent and cannot be changed.
      </Text>

      <ScrollView style={styles.list}>
        {domains.map((domain) => (
          <TouchableOpacity
            key={domain.id}
            style={[styles.domainCard, selected === domain.id && styles.domainCardSelected]}
            onPress={() => setSelected(domain.id)}
          >
            <Text style={[styles.domainName, selected === domain.id && styles.selectedText]}>
              {domain.name}
            </Text>
            <Text style={[styles.domainDesc, selected === domain.id && styles.selectedDescText]}>
              {domain.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, (!selected || submitting) && styles.buttonDisabled]}
        onPress={handleConfirm}
        disabled={!selected || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {selected ? `Select ${domains.find((d) => d.id === selected)?.name}` : 'Select a Domain'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  warning: { fontSize: 13, color: '#c0392b', marginBottom: 20, fontWeight: '500' },
  list: { flex: 1 },
  domainCard: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  domainCardSelected: { borderColor: '#1a1a2e', backgroundColor: '#f0f4ff' },
  domainName: { fontSize: 18, fontWeight: '700', color: '#333' },
  selectedText: { color: '#1a1a2e' },
  domainDesc: { fontSize: 14, color: '#888', marginTop: 4 },
  selectedDescText: { color: '#444' },
  button: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
