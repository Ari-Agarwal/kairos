import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList, TimelineRow } from "../lib/types";
import { theme } from "../lib/theme";

// Same shape/query as the web app's src/app/timeline/page.tsx and
// TimelineClient.tsx. Completion toggling lives on the Task detail screen;
// this list reloads on focus so toggles made there show up here.
// Regenerate/ICS export stay web-only.
type TimelineItem = TimelineRow;

function sortItems(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No due date";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TimelineScreen() {
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const { data, error: queryError } = await supabase
      .from("timeline_items")
      .select("id, title, due_date, school_tags, tier, completed, why_text")
      .eq("user_id", session.user.id);

    if (queryError) {
      setError(queryError.message);
    } else {
      setItems(sortItems((data ?? []) as TimelineItem[]));
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
        <Text style={styles.muted}>Loading timeline…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Couldn't load timeline: {error}</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>
          No timeline items yet. Generate them on the Kairos website and they'll show up here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("TaskDetail", { item })}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <Text
              style={[styles.itemTitle, item.completed && styles.itemTitleCompleted]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <View
              style={[
                styles.statusPill,
                item.completed ? styles.statusDone : styles.statusOpen,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: item.completed ? theme.green : theme.red },
                ]}
              >
                {item.completed ? "Done" : "Open"}
              </Text>
            </View>
          </View>
          <Text style={styles.dueDate}>{formatDate(item.due_date)}</Text>
          {item.why_text ? <Text style={styles.whyText}>{item.why_text}</Text> : null}
          {item.tier === "premium" ? (
            <Text style={styles.premiumTag}>Premium</Text>
          ) : null}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  list: { padding: 16, gap: 12 },
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
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  itemTitle: { fontSize: 16, fontWeight: "700", color: theme.text, flex: 1 },
  itemTitleCompleted: { textDecorationLine: "line-through", color: theme.secondary },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusDone: { backgroundColor: theme.green + "22" },
  statusOpen: { backgroundColor: theme.red + "22" },
  statusText: { fontSize: 12, fontWeight: "700" },
  dueDate: { fontSize: 13, color: theme.secondary, marginBottom: 6 },
  whyText: { fontSize: 14, color: theme.text, lineHeight: 20 },
  premiumTag: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: theme.premium,
  },
});
