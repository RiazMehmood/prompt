import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "shared/stores/authStore";
import { AuthHelper } from "shared/lib/auth";
import { secureStorageAdapter } from "@/lib/secureStorage";

const authHelper = new AuthHelper(secureStorageAdapter);

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const method = params.method as string;
  const identifier = params.identifier as string;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint =
        method === "email" ? "/api/v1/auth/verify/email" : "/api/v1/auth/verify/phone";

      const body =
        method === "email" ? { email: identifier, code } : { phone: identifier, otp: code };

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      // Store auth data
      await authHelper.setToken(data.access_token);
      await authHelper.setUser(data.user);
      setAuth(data.user, data.access_token);

      // Redirect to home
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setResendCooldown(60);
    // TODO: Implement resend logic
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Your Account</Text>
        <Text style={styles.subtitle}>
          Enter the {method === "email" ? "6-digit code" : "OTP"} sent to
        </Text>
        <Text style={styles.identifier}>{identifier}</Text>
      </View>

      <TextInput
        style={styles.codeInput}
        placeholder="000000"
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, (loading || code.length !== 6) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading || code.length !== 6}
      >
        <Text style={styles.buttonText}>{loading ? "Verifying..." : "Verify"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResend}
        disabled={resendCooldown > 0}
      >
        <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  identifier: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    fontSize: 32,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendButton: {
    padding: 16,
    alignItems: "center",
  },
  resendText: {
    fontSize: 16,
    color: "#000",
  },
  resendTextDisabled: {
    color: "#999",
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
});
