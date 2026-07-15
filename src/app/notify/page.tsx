import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotifyPage() {
  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl sm:text-4xl text-text max-w-xl leading-tight">
        We&apos;re building something new for students applying to college.
      </h1>
      <p className="mt-4 text-text-gray max-w-md">
        Be the first to know when it&apos;s ready.
      </p>
      <Button asChild size="lg" className="mt-8 h-14 rounded-2xl px-8 text-base">
        <Link href="/notify/join">Notify me at launch</Link>
      </Button>
    </main>
  );
}
