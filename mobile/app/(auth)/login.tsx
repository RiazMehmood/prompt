import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "shared/stores/authStore";
import { AuthHelper } from "shared/lib/auth";
import { secureStorageAdapter } from "@/lib/secureStorage";
import { BiometricHelper } from "@/lib/biometric";

const authHelper = new AuthHelper(secureStorageAdapter);

export default function LoginScreen() {
  const router = useRouter();
  const [method, setMethod] = useState<"email" | "phone" | "google" | "biometric" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);

  // Check biometric availability on mount
  useState(() => {
    BiometricHelper.checkCapabilities().then((caps) => {
      setBiometricAvailable(caps.isAvailable);
    });
  });

  const handleEmailLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
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

  const handleBiometricLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const biometricType = await BiometricHelper.getBiometricTypeName();
      const result = await BiometricHelper.authenticate(`Login with ${biometricType}`);

      if (!result.success) {
        throw new Error(result.error || "Biometric authentication failed");
      }

      // Get stored token
      const token = await authHelper.getToken();
      const user = await authHelper.getUser();

      if (!token || !user) {
        throw new Error("No saved credentials. Please login with email/phone first.");
      }

      setAuth(user, token);
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!method) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Choose your login method</Text>
        </View>

        <View style={styles.buttonGroup}>
          {biometricAvailable && (
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setMethod("biometric")}
            >
              <Text style={styles.optionButtonText}>Login with Biometric</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.optionButton} onPress={() => setMethod("email")}>
            <Text style={styles.optionButtonText}>Login with Email</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton} onPress={() => setMethod("phone")}>
            <Text style={styles.optionButtonText}>Login with Phone</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton} onPress={() => setMethod("google")}>
            <Text style={styles.optionButtonText}>Login with Google</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push("/signup")}>
          <Text style={styles.link}>
            Don't have an account? <Text style={styles.linkBold}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (method === "biometric") {
    handleBiometricLogin();
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Authenticating...</Text>
      </View>
    );
  }

  if (method === "email") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Sign in with your email</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
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

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={() => setMethod(null)}>
            <Text style={styles.backButtonText}>Back to options</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>
          {method === "phone" ? "Phone login" : "Google login"} coming soon
        </Text>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => setMethod(null)}>
        <Text style={styles.backButtonText}>Back to options</Text>
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
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    padding: 16,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    color: "#666",
  },
  link: {
    textAlign: "center",
    fontSize: 14,
    color: "#666",
  },
  linkBold: {
    fontWeight: "600",
    color: "#000",
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
  },
});
