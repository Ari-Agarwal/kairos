import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropic, MODEL, ONBOARDING_CHAT_PROMPT } from "@/lib/anthropic";
import { logAiUsage, flagAnomalousUsage } from "@/lib/ai-usage-log";
import { checkRateLimit } from "@/lib/rate-limit";
import { rejectScriptTags, ValidationError } from "@/lib/validate";
import { isTrustedOrigin } from "@/lib/origin-check";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 2000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const EXTRACT_TOOL = {
  name: "update_profile_draft",
  description: "Reply to the student and report the full cumulative set of profile fields extracted so far.",
  input_schema: {
    type: "object" as const,
    properties: {
      reply_to_student: { type: "string" as const },
      ready_to_submit: { type: "boolean" as const },
      fields: {
        type: "object" as const,
        properties: {
          full_name: { type: "string" as const },
          grade_level: { type: "string" as const, enum: ["Freshman", "Sophomore", "Junior", "Senior"] },
          unweighted_gpa: { type: "number" as const },
          weighted_gpa: { type: "number" as const },
          current_school: { type: "string" as const },
          intended_major: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "One or more intended majors the student mentioned -- most students name just one, but capture all if they name several.",
          },
          interests: { type: "string" as const },
          extracurriculars: { type: "array" as const, items: { type: "string" as const } },
          sat_score: { type: "number" as const },
          act_score: { type: "number" as const },
          no_test_yet: { type: "boolean" as const },
        },
      },
    },
    required: ["reply_to_student", "ready_to_submit", "fields"],
  },
};

export async function POST(req: Request) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, `onboarding-chat:${user.id}`, 20, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new ValidationError("At least one message is required.");
    }
    if (body.messages.length > MAX_MESSAGES) {
      throw new ValidationError("Conversation is too long -- please finish or restart onboarding.");
    }
    messages = body.messages.map((m: unknown) => {
      if (
        typeof m !== "object" || m === null ||
        !("role" in m) || !("content" in m) ||
        (m.role !== "user" && m.role !== "assistant") ||
        typeof m.content !== "string"
      ) {
        throw new ValidationError("Malformed message.");
      }
      if (m.content.length > MAX_MESSAGE_LENGTH) {
        throw new ValidationError(`A message exceeds ${MAX_MESSAGE_LENGTH} characters.`);
      }
      rejectScriptTags(m.content, "Message");
      return { role: m.role, content: m.content };
    });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  flagAnomalousUsage("onboarding/chat", user.id);
  const t0 = Date.now();
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: ONBOARDING_CHAT_PROMPT,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "update_profile_draft" },
      messages,
    });
    logAiUsage("onboarding/chat", user.id, MODEL, t0, response);
    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "Failed to process response. Please try again." }, { status: 502 });
    }
    return NextResponse.json(toolUse.input);
  } catch (err) {
    logAiUsage("onboarding/chat", user.id, MODEL, t0, err instanceof Error ? err : new Error(String(err)));
    return NextResponse.json({ error: "Failed to process response. Please try again." }, { status: 502 });
  }
}
