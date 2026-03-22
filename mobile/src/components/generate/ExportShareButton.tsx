import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { apiClient } from '../../../lib/api-client';

interface Props {
  docId: string;
  format: 'pdf' | 'docx';
  label: string;
}

export default function ExportShareButton({ docId, format, label }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Get signed export URL or stream
      const result = await apiClient.get<{ export_url: string; filename: string }>(
        `/api/generate/${docId}/export?format=${format}`
      );

      if (result.export_url) {
        // Download to cache
        const localUri = `${FileSystem.cacheDirectory}${result.filename}`;
        const download = await FileSystem.downloadAsync(result.export_url, localUri);

        if (download.status === 200) {
          await Share.share({
            url: Platform.OS === 'ios' ? download.uri : `file://${download.uri}`,
            title: result.filename,
            message: `Generated document: ${result.filename}`,
          });
        } else {
          throw new Error('Download failed');
        }
      }
    } catch (err: any) {
      Alert.alert(
        'Export Failed',
        err.message ?? `Could not export ${format.toUpperCase()}. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, format === 'pdf' ? styles.pdfBtn : styles.docxBtn, loading && styles.disabled]}
      onPress={handleExport}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={format === 'pdf' ? '#dc2626' : '#2563eb'} size="small" />
      ) : (
        <Text style={[styles.label, format === 'pdf' ? styles.pdfLabel : styles.docxLabel]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  pdfBtn: { borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  docxBtn: { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  disabled: { opacity: 0.5 },
  label: { fontSize: 13, fontWeight: '600' },
  pdfLabel: { color: '#dc2626' },
  docxLabel: { color: '#2563eb' },
});
