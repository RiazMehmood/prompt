/**
 * Login screen — email/password or phone+OTP toggle.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../lib/auth';

type Mode = 'email' | 'phone';
type PhoneStep = 'enter_phone' | 'enter_otp';

export default function LoginScreen() {
  const { login, loginWithPhone, sendPhoneOtp, isLoading } = useAuth();
  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('enter_phone');
  const [submitting, setSubmitting] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message ?? 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone) return;
    setSubmitting(true);
    try {
      await sendPhoneOtp(phone.trim());
      setPhoneStep('enter_otp');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to send OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setSubmitting(true);
    try {
      await loginWithPhone(phone.trim(), otp.trim());
    } catch (e: any) {
      Alert.alert('Verification Failed', e.message ?? 'Invalid OTP');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Prompt</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
      </View>

      {/* Mode toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'email' && styles.toggleActive]}
          onPress={() => setMode('email')}
        >
          <Text style={[styles.toggleText, mode === 'email' && styles.toggleActiveText]}>
            Email
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'phone' && styles.toggleActive]}
          onPress={() => setMode('phone')}
        >
          <Text style={[styles.toggleText, mode === 'phone' && styles.toggleActiveText]}>
            Phone
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'email' ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleEmailLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          {phoneStep === 'enter_phone' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="+92XXXXXXXXXX"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.otpHint}>Enter the 6-digit code sent to {phone}</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Sign In</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPhoneStep('enter_phone')}>
                <Text style={styles.backLink}>← Change phone number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '700', color: '#1a1a2e' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  toggle: { flexDirection: 'row', borderRadius: 8, backgroundColor: '#f0f0f0', marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: '#1a1a2e' },
  toggleText: { fontSize: 14, color: '#666' },
  toggleActiveText: { color: '#fff', fontWeight: '600' },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  otpInput: { letterSpacing: 8, textAlign: 'center', fontSize: 20 },
  otpHint: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 4 },
  button: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backLink: { textAlign: 'center', color: '#1a1a2e', marginTop: 12, fontSize: 14 },
});
