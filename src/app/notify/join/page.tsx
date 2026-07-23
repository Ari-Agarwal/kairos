import { Suspense } from "react";
import { createServiceClient } from "@/lib/supabase/server";
import { NotifyJoinClient } from "./NotifyJoinClient";

export default async function NotifyJoinPage() {
  const service = createServiceClient();
  const { count, error } = await service
    .from("waitlist_signups")
    .select("id", { count: "exact", head: true });
  if (error) console.error("waitlist count query failed:", error);

  return (
    <Suspense>
      <NotifyJoinClient signupCount={count ?? null} />
    </Suspense>
  );
}
