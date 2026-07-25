import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../lib/types";
import { theme, categoryColor } from "../lib/theme";

const CATEGORY_LABEL: Record<string, string> = {
  reach: "Reach",
  target: "Target",
  safety: "Safety",
};

// Human labels for the factors jsonb keys, same vocabulary the web app's
// School Detail breakdown tab uses.
function factorLabel(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type Props = NativeStackScreenProps<RootStackParamList, "SchoolDetail">;

export default function SchoolDetailScreen({ route }: Props) {
  const { match } = route.params;
  const color = categoryColor[match.category] ?? theme.secondary;
  const factors = match.factors ? Object.entries(match.factors) : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={[styles.badge, { backgroundColor: color + "22" }]}>
          <Text style={[styles.badgeText, { color }]}>
            {CATEGORY_LABEL[match.category] ?? match.category}
          </Text>
        </View>
        <Text style={styles.schoolName}>{match.school_name}</Text>

        {/* Numbers earn trust: the percentage is the headline, not a footnote. */}
        <View style={styles.percentageRow}>
          <Text style={styles.percentageNumber}>{match.percentage}%</Text>
          <Text style={styles.percentageLabel}>estimated fit</Text>
        </View>

        <Text style={styles.whyText}>
          {match.is_manual
            ? "This school was added manually, so an AI assessment isn't available."
            : match.why_text}
        </Text>
      </View>

      {factors.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Match breakdown</Text>
          {factors.map(([key, value]) => (
            <View key={key} style={styles.factorRow}>
              <Text style={styles.factorLabel}>{factorLabel(key)}</Text>
              <Text style={styles.factorText}>{value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.footnote}>
        Full school stats, cost estimates, and outcomes live on the Kairos
        website's school page.
      </Text>
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
    marginBottom: 16,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  schoolName: { fontSize: 24, fontWeight: "700", color: theme.text, marginBottom: 12 },
  percentageRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 12 },
  percentageNumber: { fontSize: 40, fontWeight: "800", color: theme.primary },
  percentageLabel: { fontSize: 14, color: theme.secondary },
  whyText: { fontSize: 15, color: theme.text, lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.text, marginBottom: 12 },
  factorRow: { marginBottom: 12 },
  factorLabel: { fontSize: 13, fontWeight: "700", color: theme.primary, marginBottom: 2 },
  factorText: { fontSize: 14, color: theme.text, lineHeight: 20 },
  footnote: { fontSize: 12, color: theme.secondary, textAlign: "center", marginTop: 4 },
});
