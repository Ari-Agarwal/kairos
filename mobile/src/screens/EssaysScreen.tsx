import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { formatDate, type EssayRow, type RootStackParamList } from "../lib/types";
import { theme } from "../lib/theme";

// Read-only history of essay feedback generated on the web app
// (essay_feedback_history, RLS-scoped to the student). Submitting a new
// draft stays web-only for now: generation runs through the web app's
// Anthropic-backed API route, not directly from clients.
export default function EssaysScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [entries, setEntries] = useState<EssayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const { data, error: queryError } = await supabase
      .from("essay_feedback_history")
      .select("id, school, essay_text, feedback, is_rubric, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
    } else {
      setEntries((data ?? []) as EssayRow[]);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Loading essay feedback…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Couldn't load essay feedback: {error}</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>
          No essay feedback yet. Get feedback on a draft on the Kairos website
          and your history will show up here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={entries}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("EssayDetail", { entry: item })}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <Text style={styles.school} numberOfLines={1}>
              {item.school || "General essay"}
            </Text>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </View>
          <Text style={styles.excerpt} numberOfLines={2}>
            {item.essay_text}
          </Text>
          <Text style={styles.meta}>
            {item.feedback.length} feedback point{item.feedback.length === 1 ? "" : "s"}
            {item.is_rubric ? "  ·  Rubric mode" : ""}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  list: { padding: 16 },
  centered: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  muted: { color: theme.secondary, textAlign: "center", fontSize: 15 },
  errorText: { color: theme.red, textAlign: "center", fontSize: 15 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  school: { fontSize: 16, fontWeight: "700", color: theme.text, flexShrink: 1 },
  date: { fontSize: 12, color: theme.secondary },
  excerpt: { fontSize: 14, color: theme.text, lineHeight: 20, marginBottom: 8 },
  meta: { fontSize: 12, color: theme.secondary },
});
