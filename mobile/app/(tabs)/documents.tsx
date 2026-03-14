import { View, Text, StyleSheet } from "react-native";

export default function DocumentsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Documents</Text>
      <Text style={styles.subtitle}>Document library coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
});
