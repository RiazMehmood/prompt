import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useDocumentUpload } from '../../lib/hooks/useDocumentUpload';

export default function DocumentUploadScreen() {
  const router = useRouter();
  const { upload, uploading, progress, error } = useDocumentUpload();
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    size?: number;
    type?: string;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'camera'>('file');

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        size: asset.size,
        type: asset.mimeType,
      });
      if (!title) setTitle(asset.name.replace('.pdf', ''));
    }
  };

  const handleCameraCapture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Camera access is needed to photograph documents.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.95,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: `captured_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
      if (!title) setTitle(`Captured Document ${new Date().toLocaleDateString()}`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      Alert.alert('No file selected', 'Please select a PDF or take a photo first.');
      return;
    }
    try {
      const doc = await upload({
        fileUri: selectedFile.uri,
        fileName: selectedFile.name,
        fileType: selectedFile.type ?? 'application/pdf',
        title: title || selectedFile.name,
      });
      Alert.alert(
        'Upload Successful',
        'Your document is being processed. It will appear in your document list once OCR is complete.',
        [{ text: 'View Documents', onPress: () => router.push('/documents/list') }]
      );
    } catch {}
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Upload Document</Text>
      <Text style={styles.subheading}>
        Upload PDFs including photographed books. Urdu & Sindhi text will be extracted automatically.
      </Text>

      {/* Upload mode toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, uploadMode === 'file' && styles.modeBtnActive]}
          onPress={() => setUploadMode('file')}
        >
          <Text style={[styles.modeBtnText, uploadMode === 'file' && styles.modeBtnTextActive]}>
            📄 PDF File
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, uploadMode === 'camera' && styles.modeBtnActive]}
          onPress={() => setUploadMode('camera')}
        >
          <Text style={[styles.modeBtnText, uploadMode === 'camera' && styles.modeBtnTextActive]}>
            📷 Camera
          </Text>
        </TouchableOpacity>
      </View>

      {/* File selection area */}
      <TouchableOpacity
        style={styles.dropZone}
        onPress={uploadMode === 'file' ? handlePickFile : handleCameraCapture}
      >
        {selectedFile ? (
          <View style={styles.filePreview}>
            <Text style={styles.fileIcon}>
              {selectedFile.type?.includes('image') ? '🖼️' : '📄'}
            </Text>
            <Text style={styles.fileName} numberOfLines={1}>
              {selectedFile.name}
            </Text>
            {selectedFile.size && (
              <Text style={styles.fileSize}>{formatSize(selectedFile.size)}</Text>
            )}
            <Text style={styles.changeFile}>Tap to change</Text>
          </View>
        ) : (
          <View style={styles.emptyDrop}>
            <Text style={styles.dropIcon}>{uploadMode === 'file' ? '📁' : '📷'}</Text>
            <Text style={styles.dropText}>
              {uploadMode === 'file' ? 'Tap to select a PDF file' : 'Tap to photograph a document'}
            </Text>
            <Text style={styles.dropHint}>
              {uploadMode === 'file'
                ? 'Supports text PDFs and scanned image PDFs'
                : 'Hold steady for best OCR results'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Title field */}
      {selectedFile && (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Document Title</Text>
          <View style={styles.titleInput}>
            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
          </View>
        </View>
      )}

      {/* Upload progress */}
      {uploading && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.uploadBtn, (!selectedFile || uploading) && styles.uploadBtnDisabled]}
        onPress={handleUpload}
        disabled={!selectedFile || uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.uploadBtnText}>Upload & Process</Text>
        )}
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Processing Steps</Text>
        <Text style={styles.infoItem}>1. OCR extraction (Tesseract + EasyOCR fallback)</Text>
        <Text style={styles.infoItem}>2. RTL text normalisation for Urdu/Sindhi</Text>
        <Text style={styles.infoItem}>3. Admin review (required for knowledge base)</Text>
        <Text style={styles.infoItem}>4. RAG indexing on approval</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 20 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subheading: { fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 20 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modeBtnActive: { borderColor: '#111827', backgroundColor: '#111827' },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modeBtnTextActive: { color: '#fff' },
  dropZone: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyDrop: { alignItems: 'center' },
  dropIcon: { fontSize: 48, marginBottom: 12 },
  dropText: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 6 },
  dropHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
  filePreview: { alignItems: 'center' },
  fileIcon: { fontSize: 40, marginBottom: 8 },
  fileName: { fontSize: 14, fontWeight: '600', color: '#111827', maxWidth: 240 },
  fileSize: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  changeFile: { fontSize: 12, color: '#2563eb', marginTop: 8 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  titleInput: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  titleText: { fontSize: 14, color: '#374151' },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: { height: '100%', backgroundColor: '#111827', borderRadius: 4 },
  progressText: { fontSize: 11, color: '#6b7280', textAlign: 'center', marginTop: 4 },
  errorText: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  uploadBtn: {
    backgroundColor: '#111827',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  uploadBtnDisabled: { opacity: 0.4 },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1d4ed8', marginBottom: 8 },
  infoItem: { fontSize: 12, color: '#374151', lineHeight: 20 },
});
