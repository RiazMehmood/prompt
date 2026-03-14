import { View, Text, StyleSheet } from "react-native";
import { useAuthStore } from "shared/stores/authStore";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";

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
      <View style={styles.header}>
        <Text style={styles.title}>Legal Assistant</Text>
        <Text style={styles.subtitle}>
          Ask questions about Pakistani law
        </Text>
      </View>

      <View style={styles.chatContainer}>
        <ChatInterface />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  chatContainer: {
    flex: 1,
  },
});
