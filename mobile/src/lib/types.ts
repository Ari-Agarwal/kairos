// Row shapes shared between list screens and their detail screens. These
// mirror the web app's queries (src/app/matches, src/app/timeline,
// src/app/essay-feedback) so the two clients can't drift apart.

export interface MatchRow {
  id: string;
  school_name: string;
  category: "reach" | "target" | "safety";
  percentage: number;
  why_text: string;
  is_manual: boolean;
  factors: Record<string, string> | null;
}

export interface TimelineRow {
  id: string;
  title: string;
  due_date: string | null;
  school_tags: string[] | null;
  tier: "free" | "premium";
  completed: boolean;
  why_text: string;
}

export interface FeedbackItem {
  label: string;
  text: string;
  dimension?: string;
  quote?: string;
}

export interface EssayRow {
  id: string;
  school: string | null;
  essay_text: string;
  feedback: FeedbackItem[];
  is_rubric: boolean;
  created_at: string;
}

export type RootStackParamList = {
  Tabs: undefined;
  SchoolDetail: { match: MatchRow };
  TaskDetail: { item: TimelineRow };
  EssayDetail: { entry: EssayRow };
};

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No due date";
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
