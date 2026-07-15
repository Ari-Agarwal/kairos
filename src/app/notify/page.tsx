import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotifyPage() {
  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl sm:text-4xl text-text max-w-xl leading-tight">
        Kairos gives every student the kind of college guidance a private counselor would give — free.
      </h1>
      <p className="mt-4 text-text-gray max-w-md">
        We&apos;re opening up soon. Get notified the moment it launches.
      </p>
      <Button asChild size="lg" className="mt-8 h-14 rounded-2xl px-8 text-base">
        <Link href="/notify/join">Notify me at launch</Link>
      </Button>
    </main>
  );
}
