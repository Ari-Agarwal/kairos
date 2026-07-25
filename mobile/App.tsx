import React from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import MatchesScreen from "./src/screens/MatchesScreen";
import TimelineScreen from "./src/screens/TimelineScreen";
import EssaysScreen from "./src/screens/EssaysScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SchoolDetailScreen from "./src/screens/SchoolDetailScreen";
import TaskDetailScreen from "./src/screens/TaskDetailScreen";
import EssayDetailScreen from "./src/screens/EssayDetailScreen";
import type { RootStackParamList } from "./src/lib/types";
import { theme } from "./src/lib/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

// Text-label tab icons keep the scaffold dependency-light (no icon font);
// swap for real glyphs if the design pass calls for them.
function tabIcon(label: string) {
  return function TabIcon({ color }: { color: string }) {
    return <Text style={[styles.tabIcon, { color }]}>{label}</Text>;
  };
}

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.bg,
    card: theme.card,
    text: theme.text,
    primary: theme.primary,
    border: theme.border,
  },
};

function HomeTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTitleStyle: { color: theme.text, fontWeight: "700" },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.secondary,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
      }}
    >
      <Tabs.Screen
        name="Matches"
        component={MatchesScreen}
        options={{ tabBarIcon: tabIcon("◎") }}
      />
      <Tabs.Screen
        name="Timeline"
        component={TimelineScreen}
        options={{ tabBarIcon: tabIcon("☰") }}
      />
      <Tabs.Screen
        name="Essays"
        component={EssaysScreen}
        options={{ tabBarIcon: tabIcon("✎") }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: tabIcon("●") }}
      />
    </Tabs.Navigator>
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

  if (!session) return <LoginScreen />;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.card },
          headerTintColor: theme.primary,
          headerTitleStyle: { color: theme.text, fontWeight: "700" },
        }}
      >
        <Stack.Screen name="Tabs" component={HomeTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="SchoolDetail"
          component={SchoolDetailScreen}
          options={({ route }) => ({ title: route.params.match.school_name })}
        />
        <Stack.Screen
          name="TaskDetail"
          component={TaskDetailScreen}
          options={{ title: "Task" }}
        />
        <Stack.Screen
          name="EssayDetail"
          component={EssayDetailScreen}
          options={({ route }) => ({ title: route.params.entry.school || "Essay feedback" })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
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
  loadingScreen: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: { fontSize: 18 },
});
