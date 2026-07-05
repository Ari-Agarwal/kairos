"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export interface FlaggedStudent {
  user_id: string;
  name: string;
  grade_level: string;
  reasons: string[];
}

export default function AtRiskClient({ students }: { students: FlaggedStudent[] }) {
  return (
    <div className="px-5 md:px-8 py-8 max-w-3xl mx-auto w-full">
      <h1 className="font-serif text-2xl text-text mb-2">At-Risk Flags</h1>
      <p className="text-text-gray text-sm mb-6">
        Students with overdue deadlines, no active matches, or extended inactivity, worth a check-in.
      </p>

      {students.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <p className="text-text-gray text-sm">No students currently flagged. Everyone&apos;s on track.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <Link
              key={s.user_id}
              href={`/counselor/students/${s.user_id}`}
              className="block bg-card border border-red/30 rounded-2xl p-5 hover:border-red/60 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-text">{s.name}</p>
                <span className="text-text-gray text-xs">{s.grade_level}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {s.reasons.map((reason) => (
                  <span
                    key={reason}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-tint text-red"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {reason}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
