// Mirrors the web app's palette (see /Users/ari/Desktop/Kairos/CLAUDE.md's
// "Design rules" -- parchment/forest-green base, reach=red, safety=green,
// premium=purple, secondary=neutral) so the native app doesn't invent a
// second visual language for the same product.
export const theme = {
  bg: "#F8F6EC",
  card: "#FDFCF7",
  primary: "#3C5E3B",
  red: "#DC4C3F",
  premium: "#8B5CF6",
  green: "#6B9080",
  secondary: "#78716A",
  text: "#1C1B1A",
  border: "#E7E3D6",
};

export const categoryColor: Record<string, string> = {
  reach: theme.red,
  target: theme.primary,
  safety: theme.green,
};
