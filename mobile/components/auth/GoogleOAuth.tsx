import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";

interface GoogleOAuthProps {
  onSuccess: (data: any) => void;
}

export function GoogleOAuth({ onSuccess }: GoogleOAuthProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      // TODO: Integrate with Expo AuthSession for Google OAuth
      setError("Google OAuth integration pending");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleGoogleSignIn}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Signing in..." : "Continue with Google"}
        </Text>
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  button: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
  },
});
