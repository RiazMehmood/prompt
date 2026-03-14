import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { EmailSignup } from "@/components/auth/EmailSignup";
import { PhoneSignup } from "@/components/auth/PhoneSignup";
import { GoogleOAuth } from "@/components/auth/GoogleOAuth";

export default function SignupScreen() {
  const router = useRouter();
  const [method, setMethod] = useState<"email" | "phone" | "google" | null>(null);

  const handleSuccess = (data: any) => {
    router.push({
      pathname: "/verify",
      params: { method: data.method, identifier: data.email || data.phone },
    });
  };

  if (!method) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Choose your signup method</Text>
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.optionButton} onPress={() => setMethod("email")}>
            <Text style={styles.optionButtonText}>Sign up with Email</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton} onPress={() => setMethod("phone")}>
            <Text style={styles.optionButtonText}>Sign up with Phone</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton} onPress={() => setMethod("google")}>
            <Text style={styles.optionButtonText}>Sign up with Google</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={styles.link}>
            Already have an account? <Text style={styles.linkBold}>Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          {method === "email" && "Sign up with email"}
          {method === "phone" && "Sign up with phone"}
          {method === "google" && "Sign up with Google"}
        </Text>
      </View>

      {method === "email" && <EmailSignup onSuccess={handleSuccess} />}
      {method === "phone" && <PhoneSignup onSuccess={handleSuccess} />}
      {method === "google" && <GoogleOAuth onSuccess={handleSuccess} />}

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
});
