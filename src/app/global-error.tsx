"use client";

// App Router global error boundary. Catches errors thrown during render in
// the root layout/template and reports them to Sentry. Renders its own
// <html>/<body> because it replaces the root layout when it triggers.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0A",
          color: "#FAFAFA",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "420px", textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "28px",
              marginBottom: "12px",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: "#A3A3A3", marginBottom: "24px", lineHeight: 1.5 }}>
            An unexpected error occurred. The team has been notified. Please try
            again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              backgroundColor: "#F2F2F2",
              color: "#0A0A0A",
              border: "none",
              borderRadius: "12px",
              padding: "12px 24px",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
