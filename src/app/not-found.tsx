import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-serif text-6xl text-primary mb-4">404</p>
        <h1 className="font-serif text-2xl text-text mb-3">Page not found</h1>
        <p className="text-text-gray text-sm mb-8">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-primary hover:bg-primary-hover transition-colors text-bg font-medium text-sm px-5 py-2.5"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
