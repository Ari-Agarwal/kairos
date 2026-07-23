import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { theme, categoryColor } from "../lib/theme";

// Same shape/query as the web app's src/app/matches/page.tsx --
// school_matches filtered to is_active, ordered reach/target/safety --
// so this can't drift from the schema (Section 7's "ports cleanly" bullet).
// Read-only: no regenerate/lock/manual-add here, those stay web-only for now.
interface Match {
  id: string;
  school_name: string;
  category: "reach" | "target" | "safety";
  percentage: number;
  why_text: string;
  is_manual: boolean;
}

const CATEGORY_ORDER: Record<string, number> = { reach: 0, target: 1, safety: 2 };
const CATEGORY_LABEL: Record<string, string> = {
  reach: "Reach",
  target: "Target",
  safety: "Safety",
};

export default function MatchesScreen() {
  const { session } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    const { data, error: queryError } = await supabase
      .from("school_matches")
      .select("id, school_name, category, percentage, why_text, is_manual")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .order("percentage", { ascending: false });

    if (queryError) {
      setError(queryError.message);
    } else {
      const sorted = [...(data ?? [])].sort(
        (a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]
      );
      setMatches(sorted as Match[]);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.user]);

  useEffect(() => {
    load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Loading matches…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Couldn't load matches: {error}</Text>
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>
          No matches yet. Generate them on the Kairos website and they'll show up here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={matches}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.schoolName}>{item.school_name}</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: categoryColor[item.category] + "22" },
              ]}
            >
              <Text style={[styles.badgeText, { color: categoryColor[item.category] }]}>
                {CATEGORY_LABEL[item.category]}
              </Text>
            </View>
          </View>
          <Text style={styles.percentage}>{item.percentage}% estimated fit</Text>
          <Text style={styles.whyText}>
            {item.is_manual
              ? "This school was added manually, so an AI assessment isn't available."
              : item.why_text}
          </Text>
        </View>
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
    alignItems: "center",
    marginBottom: 6,
  },
  schoolName: { fontSize: 17, fontWeight: "700", color: theme.text, flexShrink: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  percentage: { fontSize: 13, color: theme.secondary, marginBottom: 8 },
  whyText: { fontSize: 14, color: theme.text, lineHeight: 20 },
});
