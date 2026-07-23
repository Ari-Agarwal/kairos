// Recommender-facing brief export (Software_Timeline.md Section 16) --
// gives a recommender a real, downloadable, well-formatted document instead
// of relying on the student to explain verbally what to write about.
// Mirrors lib/college-list-pdf.ts's plain, print-friendly jsPDF approach.

import { jsPDF } from "jspdf";

export interface RecommenderBriefData {
  studentFirstName: string;
  recommenderName: string;
  relationship: string;
  bragSheet: {
    activities: string;
    achievements: string;
    anecdotes: string;
    additional_context: string;
  };
  narrative: {
    throughline: string;
    core_values: string[];
    differentiator: string;
  } | null;
}

const PAGE_MARGIN = 56; // pt
const PAGE_WIDTH = 612; // US Letter, pt
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

export function buildRecommenderBriefPdf(data: RecommenderBriefData): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = PAGE_MARGIN;

  function ensureSpace(needed: number) {
    if (y + needed > 792 - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  }

  function heading(text: string) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(text, PAGE_MARGIN, y);
    y += 8;
    doc.setDrawColor(200);
    doc.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y);
    y += 18;
  }

  function paragraph(text: string) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const lines: string[] = doc.splitTextToSize(text, CONTENT_WIDTH);
    for (const line of lines) {
      ensureSpace(14);
      doc.text(line, PAGE_MARGIN, y);
      y += 14;
    }
    y += 10;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Recommendation Letter Brief", PAGE_MARGIN, y);
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`Prepared by ${data.studentFirstName} for ${data.recommenderName} (${data.relationship})`, PAGE_MARGIN, y);
  y += 16;
  const generatedOn = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(`Generated on ${generatedOn}`, PAGE_MARGIN, y);
  y += 24;
  doc.setTextColor(0);

  if (data.narrative) {
    heading("Who they are");
    paragraph(data.narrative.throughline);
    if (data.narrative.core_values.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      ensureSpace(14);
      doc.text("Core values:", PAGE_MARGIN, y);
      y += 14;
      paragraph(data.narrative.core_values.join(", "));
    }
    if (data.narrative.differentiator) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      ensureSpace(14);
      doc.text("What sets them apart:", PAGE_MARGIN, y);
      y += 14;
      paragraph(data.narrative.differentiator);
    }
  }

  if (data.bragSheet.activities) {
    heading("Activities & Involvement");
    paragraph(data.bragSheet.activities);
  }
  if (data.bragSheet.achievements) {
    heading("Achievements & Awards");
    paragraph(data.bragSheet.achievements);
  }
  if (data.bragSheet.anecdotes) {
    heading("Anecdotes to Share");
    paragraph(data.bragSheet.anecdotes);
  }
  if (data.bragSheet.additional_context) {
    heading("Additional Context");
    paragraph(data.bragSheet.additional_context);
  }

  heading("A specific ask");
  paragraph(
    `If you're able to, ${data.studentFirstName} would appreciate a letter that speaks to specific, concrete moments you've observed directly -- not just a general character reference. The context above is meant to jog your memory, not replace your own observations.`
  );

  return doc;
}

export function downloadRecommenderBriefPdf(data: RecommenderBriefData): void {
  const doc = buildRecommenderBriefPdf(data);
  const filenameSafeName = data.studentFirstName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  doc.save(`${filenameSafeName || "student"}-recommendation-brief.pdf`);
}
