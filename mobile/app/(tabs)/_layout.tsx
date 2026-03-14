import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: "Documents",
        }}
      />
    </Tabs>
  );
}
