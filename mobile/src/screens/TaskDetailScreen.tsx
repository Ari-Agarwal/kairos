import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { formatDate, type RootStackParamList } from "../lib/types";
import { theme } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "TaskDetail">;

// Completion toggling is the same client-side timeline_items update (behind
// RLS) the web app's TimelineClient uses -- optimistic flip, revert on error.
export default function TaskDetailScreen({ route }: Props) {
  const { item } = route.params;
  const [completed, setCompleted] = useState(item.completed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleCompleted() {
    const next = !completed;
    setCompleted(next);
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("timeline_items")
      .update({ completed: next })
      .eq("id", item.id);
    setSaving(false);
    if (updateError) {
      setCompleted(!next);
      setError("Couldn't save that change. Check your connection and try again.");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: (completed ? theme.green : theme.red) + "22" },
            ]}
          >
            <Text style={[styles.statusText, { color: completed ? theme.green : theme.red }]}>
              {completed ? "Done" : "Open"}
            </Text>
          </View>
          {item.tier === "premium" ? <Text style={styles.premiumTag}>Premium</Text> : null}
        </View>

        <Text style={[styles.title, completed && styles.titleCompleted]}>{item.title}</Text>
        <Text style={styles.dueDate}>{formatDate(item.due_date)}</Text>

        {item.school_tags && item.school_tags.length > 0 ? (
          <View style={styles.tagRow}>
            {item.school_tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {item.why_text ? <Text style={styles.whyText}>{item.why_text}</Text> : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.toggleButton,
            completed ? styles.toggleButtonUndo : null,
            saving && styles.toggleButtonDisabled,
          ]}
          onPress={toggleCompleted}
          disabled={saving}
          accessibilityRole="button"
        >
          <Text style={[styles.toggleButtonText, completed && styles.toggleButtonTextUndo]}>
            {completed ? "Mark as not done" : "Mark complete"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "700" },
  premiumTag: { fontSize: 12, fontWeight: "700", color: theme.premium },
  title: { fontSize: 22, fontWeight: "700", color: theme.text, marginBottom: 6 },
  titleCompleted: { textDecorationLine: "line-through", color: theme.secondary },
  dueDate: { fontSize: 14, color: theme.secondary, marginBottom: 12 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  tag: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 12, color: theme.text, fontWeight: "600" },
  whyText: { fontSize: 15, color: theme.text, lineHeight: 22, marginBottom: 16 },
  error: { color: theme.red, fontSize: 14, marginBottom: 12 },
  toggleButton: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  toggleButtonUndo: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  toggleButtonDisabled: { opacity: 0.6 },
  toggleButtonText: { color: theme.card, fontSize: 16, fontWeight: "600" },
  // Dark text on the light-filled undo button, per the design rules.
  toggleButtonTextUndo: { color: theme.text },
});
