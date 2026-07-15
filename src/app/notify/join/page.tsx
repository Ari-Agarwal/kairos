import { Suspense } from "react";
import { NotifyJoinClient } from "./NotifyJoinClient";

export default function NotifyJoinPage() {
  return (
    <Suspense>
      <NotifyJoinClient />
    </Suspense>
  );
}
