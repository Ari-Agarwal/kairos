"use client";

import { downloadRecommenderBriefPdf } from "@/lib/recommender-brief-pdf";

interface Props {
  studentFirstName: string;
  recommenderName: string;
  relationship: string;
  bragSheet: {
    activities: string;
    achievements: string;
    anecdotes: string;
    additional_context: string;
  };
  narrative: { throughline: string; core_values: string[]; differentiator: string } | null;
}

export default function RecommenderBriefDownload({
  studentFirstName,
  recommenderName,
  relationship,
  bragSheet,
  narrative,
}: Props) {
  return (
    <button
      onClick={() =>
        downloadRecommenderBriefPdf({
          studentFirstName,
          recommenderName,
          relationship,
          bragSheet,
          narrative,
        })
      }
      className="rounded-xl border border-primary/30 hover:border-primary/60 text-primary hover:text-primary-hover text-sm font-medium px-4 py-2 transition-colors whitespace-nowrap"
    >
      Download brief as PDF
    </button>
  );
}
