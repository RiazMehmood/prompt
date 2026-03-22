import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../../../lib/api-client';
import ExportShareButton from '../../../components/generate/ExportShareButton';

interface ProvenanceEntry {
  slot_name: string;
  source_type: 'user_input' | 'rag_retrieval';
  source_doc_id?: string;
  chunk_id?: string;
  confidence?: number;
}

interface GeneratedDocument {
  id: string;
  template_id: string;
  template_name: string;
  status: 'completed' | 'failed' | 'processing';
  rendered_content: string;
  output_language: string;
  output_format: string;
  provenance: ProvenanceEntry[];
  validation_passed: boolean;
  validation_errors?: string[];
  created_at: string;
}

export default function DocumentResultViewer() {
  const { doc_id } = useLocalSearchParams<{ doc_id: string }>();
  const [doc, setDoc] = useState<GeneratedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProvenance, setShowProvenance] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [doc_id]);

  const loadDocument = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<GeneratedDocument>(`/api/generate/${doc_id}`);
      setDoc(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const isRTL = (lang: string) => ['urdu', 'sindhi'].includes(lang?.toLowerCase());

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Loading document…</Text>
      </View>
    );
  }

  if (error || !doc) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Document not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadDocument}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rtl = isRTL(doc.output_language);
  const ragSources = doc.provenance.filter((p) => p.source_type === 'rag_retrieval');
  const minConfidence = ragSources.length
    ? Math.min(...ragSources.map((p) => p.confidence ?? 1))
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.docTitle}>{doc.template_name}</Text>
          <Text style={styles.docMeta}>
            {new Date(doc.created_at).toLocaleDateString()} ·{' '}
            {doc.output_language.charAt(0).toUpperCase() + doc.output_language.slice(1)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            doc.validation_passed ? styles.statusPass : styles.statusFail,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              doc.validation_passed ? styles.statusTextPass : styles.statusTextFail,
            ]}
          >
            {doc.validation_passed ? '✓ Validated' : '✗ Issues Found'}
          </Text>
        </View>
      </View>

      {/* RAG confidence summary */}
      {minConfidence !== null && (
        <View style={styles.confidenceBanner}>
          <Text style={styles.confidenceLabel}>RAG Confidence</Text>
          <Text
            style={[
              styles.confidenceValue,
              minConfidence >= 0.75 ? styles.confHigh : styles.confLow,
            ]}
          >
            {Math.round(minConfidence * 100)}% min · {ragSources.length} source
            {ragSources.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Validation errors */}
      {!doc.validation_passed && doc.validation_errors && (
        <View style={styles.errorBanner}>
          {doc.validation_errors.map((e, i) => (
            <Text key={i} style={styles.errorItem}>• {e}</Text>
          ))}
        </View>
      )}

      {/* Document content */}
      <View style={[styles.docCard, rtl && styles.docCardRTL]}>
        <Text
          style={[styles.docContent, rtl && styles.docContentRTL]}
          selectable
        >
          {doc.rendered_content}
        </Text>
      </View>

      {/* Export buttons */}
      <View style={styles.exportRow}>
        <ExportShareButton docId={doc.id} format="pdf" label="Export PDF" />
        <ExportShareButton docId={doc.id} format="docx" label="Export DOCX" />
      </View>

      {/* Provenance sidebar toggle */}
      <TouchableOpacity
        style={styles.provenanceToggle}
        onPress={() => setShowProvenance((v) => !v)}
      >
        <Text style={styles.provenanceToggleText}>
          {showProvenance ? '▲ Hide' : '▼ Show'} Sources ({doc.provenance.length} slots)
        </Text>
      </TouchableOpacity>

      {showProvenance && (
        <View style={styles.provenanceList}>
          {doc.provenance.map((entry, i) => (
            <View key={i} style={styles.provenanceEntry}>
              <Text style={styles.provenanceSlot}>{entry.slot_name}</Text>
              <View style={styles.provenanceMeta}>
                <Text
                  style={[
                    styles.provenanceSource,
                    entry.source_type === 'rag_retrieval'
                      ? styles.sourceRAG
                      : styles.sourceUser,
                  ]}
                >
                  {entry.source_type === 'rag_retrieval' ? 'RAG' : 'User Input'}
                </Text>
                {entry.confidence != null && (
                  <Text style={styles.provenanceConf}>
                    {Math.round(entry.confidence * 100)}%
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#6b7280' },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#111827', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { flex: 1 },
  docTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  docMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  statusPass: { backgroundColor: '#dcfce7' },
  statusFail: { backgroundColor: '#fef2f2' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusTextPass: { color: '#16a34a' },
  statusTextFail: { color: '#dc2626' },
  confidenceBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  confidenceLabel: { fontSize: 12, color: '#374151', fontWeight: '500' },
  confidenceValue: { fontSize: 12, fontWeight: '700' },
  confHigh: { color: '#16a34a' },
  confLow: { color: '#d97706' },
  errorBanner: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginBottom: 8 },
  errorItem: { color: '#dc2626', fontSize: 13, lineHeight: 20 },
  docCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  docCardRTL: { alignItems: 'flex-end' },
  docContent: { fontSize: 14, color: '#111827', lineHeight: 22 },
  docContentRTL: { textAlign: 'right', writingDirection: 'rtl', fontFamily: 'System' },
  exportRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  provenanceToggle: { paddingVertical: 12, alignItems: 'center' },
  provenanceToggleText: { fontSize: 13, color: '#2563eb', fontWeight: '500' },
  provenanceList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  provenanceEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  provenanceSlot: { fontSize: 13, color: '#374151', fontWeight: '500', flex: 1 },
  provenanceMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  provenanceSource: { fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sourceRAG: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  sourceUser: { backgroundColor: '#e0f2fe', color: '#0369a1' },
  provenanceConf: { fontSize: 11, color: '#6b7280' },
});
