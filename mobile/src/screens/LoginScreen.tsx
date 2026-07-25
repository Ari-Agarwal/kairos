import React, { useEffect, useState } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
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
import {
  appleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
  type AuthResult,
} from "../lib/oauth";
import { theme } from "../lib/theme";

// One Kairos account across web and app: email/password reuses the same
// Supabase Auth users students created on web, and "Continue with Google"
// goes through the same Google provider as the web login page. Sign in
// with Apple is here because App Store guideline 4.8 requires it once
// Google login is offered (see Software_Timeline.md, mobile section).
export default function LoginScreen() {
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"password" | "google" | "apple" | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    appleSignInAvailable().then((available) => {
      if (mounted) setAppleAvailable(available);
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading("password");
    const { error: signInError } = await signInWithPassword(email.trim(), password);
    setLoading(null);
    if (signInError) setError(signInError);
  }

  async function handleProvider(kind: "google" | "apple", fn: () => Promise<AuthResult>) {
    setError(null);
    setLoading(kind);
    const result = await fn();
    setLoading(null);
    if (result.error && !result.cancelled) setError(result.error);
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
          style={[styles.button, loading !== null && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading !== null}
          accessibilityRole="button"
        >
          {loading === "password" ? (
            <ActivityIndicator color={theme.card} />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.providerButton, loading !== null && styles.buttonDisabled]}
          onPress={() => handleProvider("google", signInWithGoogle)}
          disabled={loading !== null}
          accessibilityRole="button"
        >
          {loading === "google" ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            // Dark text on a light-filled button, per the design rules.
            <Text style={styles.providerButtonText}>Continue with Google</Text>
          )}
        </TouchableOpacity>

        {appleAvailable ? (
          // Apple's HIG requires their own button component for this.
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={styles.appleButton}
            onPress={() => handleProvider("apple", signInWithApple)}
          />
        ) : null}

        <Text style={styles.hint}>
          Same account as the Kairos website -- signing in here connects to
          the matches, timeline, and essays you already have.
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.border,
  },
  dividerText: {
    fontSize: 12,
    color: theme.secondary,
  },
  providerButton: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: theme.bg,
    marginBottom: 12,
  },
  providerButtonText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "600",
  },
  appleButton: {
    height: 48,
    width: "100%",
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: theme.secondary,
    textAlign: "center",
  },
});
