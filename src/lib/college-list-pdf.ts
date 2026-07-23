// Client-side "college list + rationale" PDF export (Software_Timeline.md
// Section 16). Uses jspdf directly rather than trying to replicate the app's
// visual design pixel-for-pixel -- simple headings/spacing, print-friendly.

import { jsPDF } from "jspdf";

export type PdfCategory = "reach" | "target" | "safety";

export interface PdfMatch {
  school_name: string;
  category: PdfCategory;
  percentage: number;
  why_text: string;
  is_manual: boolean;
}

const TIER_LABEL: Record<PdfCategory, string> = {
  reach: "Reach",
  target: "Target",
  safety: "Safety",
};

const PAGE_MARGIN = 56; // pt
const PAGE_WIDTH = 612; // US Letter, pt
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

export function buildCollegeListPdf(matches: PdfMatch[], studentName: string | null): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = PAGE_MARGIN;

  function ensureSpace(needed: number) {
    if (y + needed > 792 - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  }

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("College List & Rationale", PAGE_MARGIN, y);
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  const headerLine = studentName ? `Prepared for ${studentName}` : "Prepared by Kairos";
  doc.text(headerLine, PAGE_MARGIN, y);
  y += 16;

  const generatedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Generated on ${generatedOn}`, PAGE_MARGIN, y);
  y += 28;
  doc.setTextColor(0);

  const grouped = (["reach", "target", "safety"] as PdfCategory[]).map((cat) => ({
    cat,
    items: matches
      .filter((m) => m.category === cat)
      .sort((a, b) => b.percentage - a.percentage),
  }));

  if (matches.length === 0) {
    doc.setFontSize(12);
    doc.text("No matches yet.", PAGE_MARGIN, y);
  }

  for (const { cat, items } of grouped) {
    if (items.length === 0) continue;

    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${TIER_LABEL[cat]} (${items.length})`, PAGE_MARGIN, y);
    y += 8;
    doc.setDrawColor(200);
    doc.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y);
    y += 20;

    for (const m of items) {
      ensureSpace(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const pct = m.is_manual ? "" : `  —  ${m.percentage}% match`;
      doc.text(`${m.school_name}${pct}`, PAGE_MARGIN, y);
      y += 16;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      const rationale = m.is_manual
        ? "This school was added manually, so an AI assessment isn't available."
        : m.why_text || "No rationale available.";
      const lines: string[] = doc.splitTextToSize(rationale, CONTENT_WIDTH);
      for (const line of lines) {
        ensureSpace(14);
        doc.text(line, PAGE_MARGIN, y);
        y += 14;
      }
      y += 14;
    }
  }

  return doc;
}

export function downloadCollegeListPdf(matches: PdfMatch[], studentName: string | null): void {
  const doc = buildCollegeListPdf(matches, studentName);
  const filenameSafeName = (studentName || "college-list").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  doc.save(`${filenameSafeName || "college-list"}.pdf`);
}
