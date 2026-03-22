import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { apiClient } from '../../../lib/api-client';

interface SlotPreview {
  name: string;
  required: boolean;
  type: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  output_languages: string[];
  slot_definitions: SlotPreview[];
  is_active: boolean;
}

export default function TemplateSelectScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<Template[]>('/templates');
      setTemplates(data.filter((t) => t.is_active));
    } catch (err: any) {
      setError(err.message ?? 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (template: Template) => {
    router.push({
      pathname: '/generate/[template_id]',
      params: { template_id: template.id, name: template.name },
    });
  };

  const requiredSlots = (t: Template) =>
    t.slot_definitions.filter((s) => s.required).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Loading templates…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadTemplates}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Select a Template</Text>
      <Text style={styles.subheading}>Choose the document type you want to generate</Text>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.category}</Text>
              </View>
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.slotInfo}>
                {requiredSlots(item)} required field{requiredSlots(item) !== 1 ? 's' : ''}
                {item.slot_definitions.length > requiredSlots(item)
                  ? ` + ${item.slot_definitions.length - requiredSlots(item)} optional`
                  : ''}
              </Text>
              <View style={styles.langRow}>
                {item.output_languages.map((lang) => (
                  <View key={lang} style={styles.langPill}>
                    <Text style={styles.langText}>{lang}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No templates available for your domain.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', padding: 20, paddingBottom: 4 },
  subheading: { fontSize: 14, color: '#6b7280', paddingHorizontal: 20, paddingBottom: 12 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  badge: { backgroundColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: '#374151', fontWeight: '500' },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotInfo: { fontSize: 12, color: '#9ca3af' },
  langRow: { flexDirection: 'row', gap: 4 },
  langPill: { backgroundColor: '#dbeafe', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  langText: { fontSize: 10, color: '#1d4ed8', fontWeight: '600' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#111827', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
});
