import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { formatDate, type RootStackParamList } from "../lib/types";
import { theme } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "EssayDetail">;

export default function EssayDetailScreen({ route }: Props) {
  const { entry } = route.params;
  const [showEssay, setShowEssay] = useState(false);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.school}>{entry.school || "General essay"}</Text>
        <Text style={styles.meta}>
          {formatDate(entry.created_at)}
          {entry.is_rubric ? "  ·  Rubric mode" : ""}
        </Text>
      </View>

      {entry.feedback.map((f, idx) => (
        <View key={idx} style={styles.card}>
          <Text style={styles.feedbackLabel}>{f.label}</Text>
          {f.dimension ? <Text style={styles.dimension}>{f.dimension}</Text> : null}
          {f.quote ? (
            <View style={styles.quoteBlock}>
              <Text style={styles.quoteText}>"{f.quote}"</Text>
            </View>
          ) : null}
          <Text style={styles.feedbackText}>{f.text}</Text>
        </View>
      ))}

      <TouchableOpacity
        style={styles.essayToggle}
        onPress={() => setShowEssay((v) => !v)}
        accessibilityRole="button"
      >
        <Text style={styles.essayToggleText}>
          {showEssay ? "Hide submitted draft" : "Show submitted draft"}
        </Text>
      </TouchableOpacity>

      {showEssay ? (
        <View style={styles.card}>
          <Text style={styles.essayText}>{entry.essay_text}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },
  school: { fontSize: 20, fontWeight: "700", color: theme.text, marginBottom: 4 },
  meta: { fontSize: 13, color: theme.secondary },
  feedbackLabel: { fontSize: 15, fontWeight: "700", color: theme.primary, marginBottom: 4 },
  dimension: { fontSize: 12, color: theme.secondary, marginBottom: 6 },
  quoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: theme.border,
    paddingLeft: 10,
    marginBottom: 8,
  },
  quoteText: { fontSize: 14, color: theme.secondary, fontStyle: "italic", lineHeight: 20 },
  feedbackText: { fontSize: 14, color: theme.text, lineHeight: 21 },
  essayToggle: { alignItems: "center", paddingVertical: 10, marginBottom: 12 },
  essayToggleText: { fontSize: 14, fontWeight: "600", color: theme.primary },
  essayText: { fontSize: 14, color: theme.text, lineHeight: 22 },
});
