import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function NotifyPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>;
}) {
  const { src } = await searchParams;
  const joinHref = src ? `/notify/join?src=${encodeURIComponent(src)}` : "/notify/join";

  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl sm:text-4xl text-text max-w-xl leading-tight">
        The college guidance you deserve, without the $10,000 price tag.
      </h1>
      <p className="mt-4 text-text-gray max-w-md">
        Kairos gives every student a personalized school list, application timeline, and essay feedback, free. Join the waitlist to be first in when we launch.
      </p>
      <Button asChild size="lg" className="mt-8 h-14 rounded-2xl px-8 text-base">
        <Link href={joinHref}>Notify me at launch</Link>
      </Button>
    </main>
  );
}
