import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { theme } from "../lib/theme";

// Account deletion is an App Store hard requirement (guideline 5.1.1(v)).
// It calls the delete-account edge function, which mirrors the web app's
// /api/account/delete cleanup list -- keep those two in sync when adding
// tables (see the comment in supabase/functions/delete-account/index.ts).
export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = session?.user?.email ?? "Unknown";

  function confirmDelete() {
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your Kairos account and all your data: profile, matches, timeline, essay feedback, everything. This is the same account you use on the Kairos website. It cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: runDelete,
        },
      ]
    );
  }

  async function runDelete() {
    setDeleting(true);
    setError(null);
    const { error: fnError } = await supabase.functions.invoke("delete-account", {
      method: "POST",
    });
    if (fnError) {
      setDeleting(false);
      setError("Couldn't delete your account. Check your connection and try again.");
      return;
    }
    // The auth user is gone server-side; clear the local session too.
    await signOut();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{email}</Text>
        <Text style={styles.hint}>
          One Kairos account across web and app. Profile editing, school list
          changes, and plan upgrades live on the website.
        </Text>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut} accessibilityRole="button">
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.dangerTitle}>Danger zone</Text>
        <Text style={styles.dangerBody}>
          Deleting your account removes all of your Kairos data permanently,
          on both the app and the website.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
          onPress={confirmDelete}
          disabled={deleting}
          accessibilityRole="button"
        >
          <Text style={styles.deleteText}>
            {deleting ? "Deleting…" : "Delete account"}
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
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.text, marginBottom: 12 },
  label: { fontSize: 12, color: theme.secondary, marginBottom: 2 },
  value: { fontSize: 16, fontWeight: "600", color: theme.text, marginBottom: 12 },
  hint: { fontSize: 13, color: theme.secondary, lineHeight: 19, marginBottom: 16 },
  signOutButton: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: theme.bg,
  },
  // Dark text on a light-filled button, per the design rules.
  signOutText: { fontSize: 15, fontWeight: "600", color: theme.text },
  dangerCard: { borderColor: theme.red + "55" },
  dangerTitle: { fontSize: 16, fontWeight: "700", color: theme.red, marginBottom: 8 },
  dangerBody: { fontSize: 13, color: theme.secondary, lineHeight: 19, marginBottom: 12 },
  error: { color: theme.red, fontSize: 14, marginBottom: 10 },
  deleteButton: {
    backgroundColor: theme.red,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteButtonDisabled: { opacity: 0.6 },
  deleteText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
