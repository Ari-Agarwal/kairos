import React from "react";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import MatchesScreen from "./src/screens/MatchesScreen";
import TimelineScreen from "./src/screens/TimelineScreen";
import { theme } from "./src/lib/theme";

type Tab = "matches" | "timeline";

function AuthedApp() {
  const { signOut } = useAuth();
  const [tab, setTab] = React.useState<Tab>("matches");

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {tab === "matches" ? "Matches" : "Timeline"}
        </Text>
        <TouchableOpacity onPress={signOut} accessibilityRole="button">
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {tab === "matches" ? <MatchesScreen /> : <TimelineScreen />}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setTab("matches")}
          accessibilityRole="button"
        >
          <Text style={[styles.tabLabel, tab === "matches" && styles.tabLabelActive]}>
            Matches
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setTab("timeline")}
          accessibilityRole="button"
        >
          <Text style={[styles.tabLabel, tab === "timeline" && styles.tabLabelActive]}>
            Timeline
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Root() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return session ? <AuthedApp /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  loadingScreen: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.card,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: theme.primary },
  signOut: { fontSize: 14, color: theme.secondary, fontWeight: "600" },
  content: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.card,
  },
  tabButton: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabLabel: { fontSize: 13, fontWeight: "600", color: theme.secondary },
  tabLabelActive: { color: theme.primary },
});
