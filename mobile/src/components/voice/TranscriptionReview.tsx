import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';

interface Props {
  visible: boolean;
  text: string;
  language: string;
  confidence: number;
  isRTL: boolean;
  onConfirm: (text: string) => void;
  onReRecord: () => void;
  onDismiss: () => void;
}

export default function TranscriptionReview({
  visible,
  text,
  language,
  confidence,
  isRTL,
  onConfirm,
  onReRecord,
  onDismiss,
}: Props) {
  const isLowConfidence = confidence < 0.8;

  const langLabel: Record<string, string> = {
    english: 'English',
    urdu: 'اردو',
    sindhi: 'سنڌي',
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Review Transcription</Text>
              <Text style={styles.langBadge}>
                {langLabel[language.toLowerCase()] ?? language}
              </Text>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Low-confidence warning */}
          {isLowConfidence && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                ⚠ Low confidence ({Math.round(confidence * 100)}%) — please review carefully
              </Text>
            </View>
          )}

          {/* Confidence indicator */}
          <View style={styles.confRow}>
            <Text style={styles.confLabel}>Confidence</Text>
            <View style={styles.confBar}>
              <View
                style={[
                  styles.confFill,
                  { width: `${confidence * 100}%` as any },
                  isLowConfidence ? styles.confLow : styles.confHigh,
                ]}
              />
            </View>
            <Text style={[styles.confValue, isLowConfidence ? styles.confLowText : styles.confHighText]}>
              {Math.round(confidence * 100)}%
            </Text>
          </View>

          {/* Transcribed text */}
          <ScrollView style={styles.textBox} contentContainerStyle={styles.textBoxContent}>
            <Text
              style={[styles.transcribedText, isRTL && styles.rtlText]}
              selectable
            >
              {text}
            </Text>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.reRecordBtn} onPress={onReRecord}>
              <Text style={styles.reRecordText}>🎙 Re-record</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => onConfirm(text)}
            >
              <Text style={styles.confirmText}>✓ Use This</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  langBadge: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 22, color: '#9ca3af', lineHeight: 22 },
  warningBanner: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  warningText: { fontSize: 13, color: '#92400e', fontWeight: '500' },
  confRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  confLabel: { fontSize: 12, color: '#6b7280', width: 70 },
  confBar: { flex: 1, height: 6, backgroundColor: '#e5e7eb', borderRadius: 3 },
  confFill: { height: '100%', borderRadius: 3 },
  confHigh: { backgroundColor: '#22c55e' },
  confLow: { backgroundColor: '#f59e0b' },
  confValue: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
  confHighText: { color: '#16a34a' },
  confLowText: { color: '#d97706' },
  textBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 200,
    marginBottom: 20,
  },
  textBoxContent: { padding: 16 },
  transcribedText: { fontSize: 15, color: '#111827', lineHeight: 24 },
  rtlText: { textAlign: 'right', writingDirection: 'rtl', fontFamily: 'System' },
  actions: { flexDirection: 'row', gap: 10 },
  reRecordBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  reRecordText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
