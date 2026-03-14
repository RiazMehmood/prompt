import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";

interface PhoneSignupProps {
  onSuccess: (data: any) => void;
}

export function PhoneSignup({ onSuccess }: PhoneSignupProps) {
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");

    if (digits.startsWith("92")) {
      const formatted = digits.slice(2);
      if (formatted.length <= 3) {
        return `+92-${formatted}`;
      } else if (formatted.length <= 10) {
        return `+92-${formatted.slice(0, 3)}-${formatted.slice(3)}`;
      }
      return `+92-${formatted.slice(0, 3)}-${formatted.slice(3, 10)}`;
    }

    return value;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setPhone(formatted);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/auth/signup/phone`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone,
            full_name: fullName,
            role_id: "lawyer",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      onSuccess({ phone, method: "phone" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />

      <TextInput
        style={styles.input}
        placeholder="+92-3XX-XXXXXXX"
        value={phone}
        onChangeText={handlePhoneChange}
        keyboardType="phone-pad"
      />
      <Text style={styles.hint}>Pakistani mobile number</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Sending OTP..." : "Sign Up with Phone"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginTop: -8,
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
  error: {
    color: "#dc2626",
    fontSize: 14,
  },
});
