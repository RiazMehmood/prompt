import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '../../../lib/api-client';

type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'processing';

interface UploadedDocument {
  id: string;
  title: string;
  status: DocumentStatus;
  file_size: number;
  ocr_processed: boolean;
  ocr_confidence_avg?: number;
  has_flagged_pages: boolean;
  page_count?: number;
  rejection_reason?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<DocumentStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pending Review', bg: '#fef9c3', text: '#854d0e', dot: '#eab308' },
  approved: { label: 'Approved', bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
  rejected: { label: 'Rejected', bg: '#fef2f2', text: '#991b1b', dot: '#ef4444' },
  processing: { label: 'Processing', bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
};

export default function DocumentListScreen() {
  const router = useRouter();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setError('');
    try {
      const data = await apiClient.get<UploadedDocument[]>('/documents');
      setDocuments(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load documents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>My Documents</Text>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => router.push('/documents/upload')}
        >
          <Text style={styles.uploadBtnText}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item }) => {
          const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.docTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
                  <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.meta}>{formatDate(item.created_at)}</Text>
                <Text style={styles.meta}>{formatSize(item.file_size)}</Text>
                {item.page_count && <Text style={styles.meta}>{item.page_count} pages</Text>}
              </View>

              {/* OCR info */}
              {item.ocr_processed && (
                <View style={styles.ocrRow}>
                  <View
                    style={[
                      styles.ocrBadge,
                      item.has_flagged_pages ? styles.ocrWarn : styles.ocrOk,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ocrBadgeText,
                        item.has_flagged_pages ? styles.ocrWarnText : styles.ocrOkText,
                      ]}
                    >
                      OCR:{' '}
                      {item.ocr_confidence_avg != null
                        ? `${Math.round(item.ocr_confidence_avg * 100)}% avg`
                        : 'processed'}
                    </Text>
                  </View>
                  {item.has_flagged_pages && (
                    <Text style={styles.flaggedText}>⚠ Some pages need review</Text>
                  )}
                </View>
              )}

              {/* Rejection reason */}
              {item.status === 'rejected' && item.rejection_reason && (
                <Text style={styles.rejectionText}>Rejected: {item.rejection_reason}</Text>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No documents yet</Text>
            <TouchableOpacity
              style={styles.uploadBtnLarge}
              onPress={() => router.push('/documents/upload')}
            >
              <Text style={styles.uploadBtnText}>Upload Your First Document</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 8,
  },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827' },
  uploadBtn: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  uploadBtnLarge: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 12,
  },
  uploadBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  errorText: { color: '#dc2626', fontSize: 13, paddingHorizontal: 20 },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  docTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  meta: { fontSize: 12, color: '#9ca3af' },
  ocrRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ocrBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  ocrOk: { backgroundColor: '#dcfce7' },
  ocrWarn: { backgroundColor: '#fef3c7' },
  ocrBadgeText: { fontSize: 11, fontWeight: '600' },
  ocrOkText: { color: '#166534' },
  ocrWarnText: { color: '#92400e' },
  flaggedText: { fontSize: 11, color: '#d97706' },
  rejectionText: { fontSize: 12, color: '#dc2626', marginTop: 4, fontStyle: 'italic' },
  emptyText: { color: '#9ca3af', fontSize: 15, fontWeight: '500' },
});
