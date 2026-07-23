import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { theme } from "../lib/theme";

// Password sign-in only for this scaffold. Kairos students onboard on web
// today with email/password (see src/app/login); this reuses the same
// Supabase Auth users, so a student who onboarded on web can sign into the
// app with the same credentials -- no separate mobile account. Magic-link /
// social providers, and any store-required "Sign in with Apple" (flagged in
// Software_Timeline.md Section 7's submission-realities bullet), are left
// for whoever wires up real store submission, since that's an Apple/Google
// developer-account-gated step this scaffold can't complete.
export default function LoginScreen() {
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    const { error: signInError } = await signInWithPassword(email.trim(), password);
    setLoading(false);
    if (signInError) setError(signInError);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Kairos</Text>
        <Text style={styles.subtitle}>Sign in with your Kairos account</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={theme.secondary}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={theme.secondary}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color={theme.card} />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          Same email/password as the Kairos website -- this is one account,
          not a separate app login.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.secondary,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 16,
    color: theme.text,
    backgroundColor: theme.bg,
  },
  error: {
    color: theme.red,
    marginBottom: 12,
    fontSize: 14,
  },
  button: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.card,
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: theme.secondary,
    textAlign: "center",
  },
});
