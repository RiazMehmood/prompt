import { View, Text, StyleSheet } from "react-native";
import { useAuthStore } from "shared/stores/authStore";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function HomeScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Your Dashboard</Text>
      <Text style={styles.subtitle}>
        Start by asking a legal question or generating a document
      </Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Chat with AI</Text>
          <Text style={styles.cardText}>
            Ask legal questions and get AI-powered answers with citations
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Generate Documents</Text>
          <Text style={styles.cardText}>
            Create bail applications and other legal documents
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Document Library</Text>
          <Text style={styles.cardText}>
            Access your generated documents and legal resources
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  grid: {
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: "#666",
  },
});
