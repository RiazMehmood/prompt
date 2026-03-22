import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { apiClient } from '../../../lib/api-client';

interface ValidationResult {
  valid: boolean;
  code: string;
  discount_type?: string;
  discount_value?: number;
  description?: string;
  error?: string;
  already_used?: boolean;
  remaining_uses?: number;
}

interface ApplicationResult {
  success: boolean;
  code: string;
  benefit_applied: string;
  error?: string;
}

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  percentage: '%',
  flat_pkr: ' PKR',
  free_tier_upgrade: ' days',
};

export default function TokenApplyScreen() {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<ApplicationResult | null>(null);

  const handleValidate = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setValidating(true);
    setPreview(null);
    try {
      const result = await apiClient.post<ValidationResult>('/tokens/validate', {
        code: trimmed,
      });
      setPreview(result);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to validate token');
    } finally {
      setValidating(false);
    }
  };

  const handleApply = async () => {
    if (!preview?.valid) return;
    setApplying(true);
    try {
      const result = await apiClient.post<ApplicationResult>('/tokens/apply', {
        code: code.trim().toUpperCase(),
      });
      setApplied(result);
      if (result.success) {
        setCode('');
        setPreview(null);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to apply token');
    } finally {
      setApplying(false);
    }
  };

  const formatBenefit = (r: ValidationResult) => {
    if (!r.discount_type || r.discount_value == null) return '';
    const suffix = DISCOUNT_TYPE_LABELS[r.discount_type] ?? '';
    if (r.discount_type === 'percentage') return `${r.discount_value}% off`;
    if (r.discount_type === 'flat_pkr') return `PKR ${r.discount_value} credit`;
    return `${r.discount_value}-day tier upgrade`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Apply Token</Text>
      <Text style={styles.subheading}>Enter a promotional code to unlock discounts or credits</Text>

      {/* Code input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(v) => {
            setCode(v.toUpperCase());
            setPreview(null);
            setApplied(null);
          }}
          placeholder="Enter code (e.g. LEGAL30)"
          placeholderTextColor="#9ca3af"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleValidate}
        />
        <TouchableOpacity
          style={[styles.validateBtn, (!code.trim() || validating) && styles.btnDisabled]}
          onPress={handleValidate}
          disabled={!code.trim() || validating}
        >
          {validating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.validateBtnText}>Check</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Preview */}
      {preview && (
        <View style={[styles.previewCard, preview.valid ? styles.previewValid : styles.previewInvalid]}>
          {preview.valid ? (
            <>
              <Text style={styles.previewTitle}>✓ Token Valid</Text>
              <Text style={styles.previewBenefit}>{formatBenefit(preview)}</Text>
              {preview.description ? (
                <Text style={styles.previewDesc}>{preview.description}</Text>
              ) : null}
              {preview.remaining_uses != null && (
                <Text style={styles.previewMeta}>{preview.remaining_uses} uses remaining</Text>
              )}

              <TouchableOpacity
                style={[styles.applyBtn, applying && styles.btnDisabled]}
                onPress={handleApply}
                disabled={applying}
              >
                {applying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.applyBtnText}>Apply Token</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.previewTitleInvalid}>✗ Invalid Token</Text>
              <Text style={styles.previewError}>{preview.error}</Text>
            </>
          )}
        </View>
      )}

      {/* Applied success */}
      {applied?.success && (
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Token Applied!</Text>
          <Text style={styles.successBenefit}>{applied.benefit_applied}</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How tokens work</Text>
        <Text style={styles.infoItem}>• Enter the code and tap Check to preview the benefit</Text>
        <Text style={styles.infoItem}>• Confirm with Apply Token — usage is recorded once only</Text>
        <Text style={styles.infoItem}>• Domain-restricted tokens only work for your domain</Text>
        <Text style={styles.infoItem}>• Tokens expire on their listed date</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 20 },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subheading: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 2,
  },
  validateBtn: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  validateBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  previewCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  previewValid: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  previewInvalid: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#166534', marginBottom: 8 },
  previewTitleInvalid: { fontSize: 16, fontWeight: '700', color: '#991b1b', marginBottom: 8 },
  previewBenefit: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  previewDesc: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  previewMeta: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  previewError: { fontSize: 14, color: '#dc2626' },
  applyBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  applyBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
  },
  successIcon: { fontSize: 40, marginBottom: 8 },
  successTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  successBenefit: { fontSize: 15, color: '#16a34a', fontWeight: '600' },
  infoBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, marginTop: 4 },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1d4ed8', marginBottom: 8 },
  infoItem: { fontSize: 12, color: '#374151', lineHeight: 22 },
});
