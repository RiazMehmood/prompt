import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../../lib/api-client';
import { detectScript, isRTLScript } from '../../lib/rtl';

interface SlotDefinition {
  name: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
  max_length?: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
  slot_definitions: SlotDefinition[];
  output_languages: string[];
}

type FieldValues = Record<string, string>;

const OUTPUT_LANG_LABELS: Record<string, string> = {
  english: 'English',
  urdu: 'اردو',
  sindhi: 'سنڌي',
};

export default function DocumentGenerationForm() {
  const router = useRouter();
  const { template_id, name } = useLocalSearchParams<{ template_id: string; name?: string }>();

  const [template, setTemplate] = useState<Template | null>(null);
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [outputLanguage, setOutputLanguage] = useState('english');
  const [fieldRTL, setFieldRTL] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTemplate();
  }, [template_id]);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const t = await apiClient.get<Template>(`/templates/${template_id}`);
      setTemplate(t);
      const initial: FieldValues = {};
      t.slot_definitions.forEach((s) => { initial[s.name] = ''; });
      setFieldValues(initial);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (slotName: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [slotName]: value }));
    // Auto-detect RTL for text fields
    const rtl = isRTLScript(value);
    setFieldRTL((prev) => ({ ...prev, [slotName]: rtl }));
  };

  const validate = (): string | null => {
    if (!template) return 'Template not loaded';
    for (const slot of template.slot_definitions) {
      if (slot.required && !fieldValues[slot.name]?.trim()) {
        return `"${slot.label}" is required`;
      }
      if (slot.max_length && fieldValues[slot.name]?.length > slot.max_length) {
        return `"${slot.label}" exceeds maximum length of ${slot.max_length}`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const resp = await apiClient.post<{ id: string }>('/api/generate', {
        template_id,
        output_language: outputLanguage,
        output_parameters: fieldValues,
      });
      router.push({
        pathname: '/generate/progress',
        params: { doc_id: resp.id },
      });
    } catch (err: any) {
      setError(err.message ?? 'Failed to start generation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!template || error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Template not found'}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>{template.name}</Text>
        <Text style={styles.subheading}>{template.description}</Text>

        {/* Output Language Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Output Language</Text>
          <View style={styles.langRow}>
            {template.output_languages.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langBtn, outputLanguage === lang && styles.langBtnActive]}
                onPress={() => setOutputLanguage(lang)}
              >
                <Text
                  style={[styles.langBtnText, outputLanguage === lang && styles.langBtnTextActive]}
                >
                  {OUTPUT_LANG_LABELS[lang] ?? lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dynamic form fields */}
        {template.slot_definitions.map((slot) => (
          <View key={slot.name} style={styles.fieldGroup}>
            <Text style={styles.label}>
              {slot.label}
              {slot.required && <Text style={styles.required}> *</Text>}
            </Text>

            {slot.type === 'textarea' ? (
              <TextInput
                style={[
                  styles.textarea,
                  fieldRTL[slot.name] && styles.rtlInput,
                ]}
                value={fieldValues[slot.name]}
                onChangeText={(v) => handleFieldChange(slot.name, v)}
                placeholder={slot.placeholder ?? `Enter ${slot.label.toLowerCase()}`}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                textAlign={fieldRTL[slot.name] ? 'right' : 'left'}
              />
            ) : slot.type === 'select' ? (
              <View style={styles.selectContainer}>
                {(slot.options ?? []).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.selectOption,
                      fieldValues[slot.name] === opt && styles.selectOptionActive,
                    ]}
                    onPress={() => handleFieldChange(slot.name, opt)}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        fieldValues[slot.name] === opt && styles.selectOptionTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={[
                  styles.input,
                  fieldRTL[slot.name] && styles.rtlInput,
                ]}
                value={fieldValues[slot.name]}
                onChangeText={(v) => handleFieldChange(slot.name, v)}
                placeholder={slot.placeholder ?? `Enter ${slot.label.toLowerCase()}`}
                placeholderTextColor="#9ca3af"
                keyboardType={slot.type === 'number' ? 'numeric' : 'default'}
                textAlign={fieldRTL[slot.name] ? 'right' : 'left'}
              />
            )}
          </View>
        ))}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Generate Document</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { padding: 20 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subheading: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  langBtnActive: { borderColor: '#111827', backgroundColor: '#111827' },
  langBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  langBtnTextActive: { color: '#fff' },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required: { color: '#dc2626' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textarea: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
  },
  rtlInput: { textAlign: 'right', writingDirection: 'rtl' },
  selectContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  selectOptionActive: { borderColor: '#111827', backgroundColor: '#111827' },
  selectOptionText: { fontSize: 13, color: '#374151' },
  selectOptionTextActive: { color: '#fff' },
  errorText: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  submitBtn: {
    backgroundColor: '#111827',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
