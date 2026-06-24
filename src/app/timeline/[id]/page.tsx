import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import NavShell from "@/components/NavShell";
import TaskDetailClient from "./TaskDetailClient";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: item } = await supabase
    .from("timeline_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!item) notFound();

  return (
    <NavShell>
      <TaskDetailClient item={item} />
    </NavShell>
  );
}
