"use client";

import { useRef, useState, useCallback } from "react";

interface ShareCardData {
  schoolName: string;
  percentage: number;
  category: "reach" | "target" | "safety";
}

// Palette values must stay in sync with globals.css :root
const PALETTE = {
  bg: "#0A0A0A",
  card: "#171717",
  border: "#2A2A2A",
  text: "#FAFAFA",
  textGray: "#A3A3A3",
  primary: "#FFB020",
  red: "#FF5C4D",
  redTint: "rgba(255, 92, 77, 0.14)",
  amber: "#FFB020",
  amberTint: "rgba(255, 176, 32, 0.14)",
  amberTextOnTint: "#FFC862",
  green: "#9C9789",
  greenTint: "rgba(156, 151, 137, 0.14)",
} as const;

const CATEGORY_COLOR: Record<string, { tint: string; text: string; label: string }> = {
  reach: { tint: PALETTE.redTint, text: PALETTE.red, label: "Reach" },
  target: { tint: PALETTE.amberTint, text: PALETTE.amberTextOnTint, label: "Target" },
  safety: { tint: PALETTE.greenTint, text: PALETTE.green, label: "Safety" },
};

// W=1080 H=1080 (universal square for social sharing)
const W = 1080;
const H = 1080;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCard(canvas: HTMLCanvasElement, data: ShareCardData) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = W;
  canvas.height = H;
  ctx.scale(1, 1);

  // Background
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle ambient gradient behind the card
  const grad = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, W * 0.7);
  grad.addColorStop(0, "rgba(255, 176, 32, 0.04)");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Card panel
  const cx = 80;
  const cy = 180;
  const cw = W - 160;
  const ch = H - 360;
  drawRoundedRect(ctx, cx, cy, cw, ch, 32);
  ctx.fillStyle = PALETTE.card;
  ctx.fill();
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const cat = CATEGORY_COLOR[data.category] ?? CATEGORY_COLOR.target;

  // Tier badge pill
  const pillText = cat.label;
  ctx.font = "500 28px system-ui, -apple-system, sans-serif";
  const pillW = ctx.measureText(pillText).width + 48;
  const pillH = 52;
  const pillX = cx + 52;
  const pillY = cy + 64;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fillStyle = cat.tint;
  ctx.fill();
  ctx.fillStyle = cat.text;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(pillText, pillX + 24, pillY + pillH / 2);

  // School name (serif)
  ctx.font = `bold clamp(36px, 5vw, 52px) Georgia, "Times New Roman", serif`;
  // Canvas doesn't support clamp — use fixed size, scale by name length
  const nameFontSize = data.schoolName.length > 30 ? 52 : data.schoolName.length > 20 ? 62 : 72;
  ctx.font = `bold ${nameFontSize}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = PALETTE.text;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  // Word-wrap school name to fit cw - 104 px
  const maxWidth = cw - 104;
  const words = data.schoolName.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const nameY = pillY + pillH + 48;
  const lineH = nameFontSize * 1.25;
  lines.forEach((l, i) => {
    ctx.fillText(l, cx + 52, nameY + i * lineH);
  });

  // Percentage — large amber serif
  const pctY = nameY + lines.length * lineH + 72;
  ctx.font = `bold 200px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = PALETTE.primary;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const pctStr = `${data.percentage}%`;
  ctx.fillText(pctStr, cx + 52, pctY);

  // "admission chance" label under percentage
  ctx.font = `400 30px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = PALETTE.textGray;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("estimated admission chance", cx + 52, pctY + 220);

  // Thin separator
  const sepY = cy + ch - 100;
  ctx.beginPath();
  ctx.moveTo(cx + 52, sepY);
  ctx.lineTo(cx + cw - 52, sepY);
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Kairos wordmark (bottom of card)
  ctx.font = `bold 40px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = PALETTE.primary;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("Kairos", cx + 52, sepY + 50);

  ctx.font = `400 26px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = PALETTE.textGray;
  ctx.textAlign = "right";
  ctx.fillText("kairos.app", cx + cw - 52, sepY + 50);
}

function useShareCard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const getCanvas = useCallback((): HTMLCanvasElement => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    return canvasRef.current;
  }, []);

  const renderToBlob = useCallback(
    (data: ShareCardData): Promise<Blob> =>
      new Promise((resolve, reject) => {
        const canvas = getCanvas();
        drawCard(canvas, data);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
          "image/png"
        );
      }),
    [getCanvas]
  );

  return { renderToBlob };
}

interface ShareChancesCardProps {
  data: ShareCardData;
  onClose: () => void;
}

export default function ShareChancesCard({ data, onClose }: ShareChancesCardProps) {
  const { renderToBlob } = useShareCard();
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  // Draw preview into the visible canvas element
  const setPreviewCanvas = useCallback((el: HTMLCanvasElement | null) => {
    previewRef.current = el;
    if (el) drawCard(el, data);
  }, [data]);

  async function handleDownload() {
    setStatus("working");
    try {
      const blob = await renderToBlob(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.schoolName.replace(/\s+/g, "-")}-chances.png`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function handleShare() {
    setStatus("working");
    try {
      const blob = await renderToBlob(data);
      const file = new File([blob], `${data.schoolName.replace(/\s+/g, "-")}-chances.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `My chances at ${data.schoolName}` });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
      setStatus("idle");
    } catch (err) {
      // User cancelled share — not an error worth surfacing
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
      } else {
        setStatus("error");
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share chances card"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-serif text-lg text-text">Share your chances</p>
          <button
            onClick={onClose}
            className="text-text-gray hover:text-text text-xl leading-none px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Live canvas preview scaled to fit modal */}
        <div className="rounded-xl overflow-hidden border border-border aspect-square w-full bg-bg">
          <canvas
            ref={setPreviewCanvas}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>

        <p className="text-text-gray text-xs leading-relaxed">
          AI-generated estimates based on your profile and general acceptance data, not a
          guarantee of admission. All numbers shown are estimates only.
        </p>

        {status === "error" && (
          <p role="alert" className="text-red text-xs">Something went wrong. Please try again.</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleDownload}
            disabled={status === "working"}
            className="flex-1 rounded-xl border border-border text-text-gray hover:text-text text-sm font-medium py-2.5 transition-colors disabled:opacity-40"
          >
            {status === "working" ? "Working…" : "Download PNG"}
          </button>
          <button
            onClick={handleShare}
            disabled={status === "working"}
            className="flex-1 rounded-xl bg-primary hover:bg-primary-hover text-bg text-sm font-medium py-2.5 transition-colors disabled:opacity-40"
          >
            {status === "working" ? "Working…" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
