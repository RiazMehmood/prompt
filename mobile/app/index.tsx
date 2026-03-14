import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Domain-Adaptive Platform</Text>
      <Text style={{ marginTop: 16, color: "#666" }}>AI-powered platform for professionals</Text>
    </View>
  );
}
