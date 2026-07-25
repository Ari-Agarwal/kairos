#!/usr/bin/env node
// Composes raw simulator captures in /screenshots into framed, captioned
// 1320x2868 App Store marketing images using the Kairos design system.
// Usage: node scripts/frame-screenshots.mjs

import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

const SRC_DIR = "screenshots";
const OUT_DIR = "screenshots/framed";
const CANVAS_W = 1320;
const CANVAS_H = 2868;

// Kairos design tokens (src/app/globals.css)
const BG = "#F8F6EC";
const PRIMARY = "#3C5E3B";
const PRIMARY_DEEP = "#24391F";
const TEXT = "#1E2218";
const CARD = "#FDFCF7";
const BORDER = "#DCDFC9";

const CAPTIONS = {
  "mobile-01-login.png": "Sign in and pick up right where you left off",
  "mobile-02-matches.png": "See your real odds at every school, reach to safety",
  "mobile-03-school-detail.png": "Understand why a school fits, factor by factor",
  "mobile-04-timeline.png": "Never miss a deadline across every application",
  "mobile-05-task-detail.png": "Track every task from draft to submitted",
  "mobile-06-essays.png": "Get feedback on every essay, for every school",
  "mobile-07-essay-detail.png": "See your essay history and how it's improved",
  "mobile-08-profile.png": "One profile, every application, always in sync",
};

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrapText(text, maxCharsPerLine) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function frameOne(file) {
  const srcPath = path.join(SRC_DIR, file);
  const meta = await sharp(srcPath).metadata();

  // Screenshot rendered at ~72% canvas width, centered, with rounded corners
  // and a soft shadow, sitting on a caption-topped parchment background.
  const shotW = Math.round(CANVAS_W * 0.78);
  const shotH = Math.round((meta.height / meta.width) * shotW);
  const shotX = Math.round((CANVAS_W - shotW) / 2);
  const shotY = 620;
  const cornerRadius = 48;

  const roundedShot = await sharp(srcPath)
    .resize(shotW, shotH)
    .composite([
      {
        input: Buffer.from(
          `<svg width="${shotW}" height="${shotH}"><rect x="0" y="0" width="${shotW}" height="${shotH}" rx="${cornerRadius}" ry="${cornerRadius}" fill="#fff"/></svg>`
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const caption = CAPTIONS[file] || "";
  const lines = wrapText(caption, 26);
  const lineHeight = 76;
  const captionStartY = 260;
  const captionSvgLines = lines
    .map(
      (line, i) =>
        `<text x="${CANVAS_W / 2}" y="${captionStartY + i * lineHeight}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="64" fill="${TEXT}">${escapeXml(line)}</text>`
    )
    .join("\n");

  const background = Buffer.from(`
    <svg width="${CANVAS_W}" height="${CANVAS_H}">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${BG}"/>
          <stop offset="100%" stop-color="${BG}"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="24" stdDeviation="36" flood-color="${PRIMARY_DEEP}" flood-opacity="0.18"/>
        </filter>
      </defs>
      <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#bgGrad)"/>
      <rect x="0" y="0" width="${CANVAS_W}" height="12" fill="${PRIMARY}"/>
      ${captionSvgLines}
      <rect x="${shotX}" y="${shotY}" width="${shotW}" height="${shotH}" rx="${cornerRadius}" fill="${CARD}" stroke="${BORDER}" stroke-width="2" filter="url(#shadow)"/>
    </svg>
  `);

  const outPath = path.join(OUT_DIR, file);
  await sharp(background)
    .composite([{ input: roundedShot, left: shotX, top: shotY }])
    .png()
    .toFile(outPath);

  console.log(`framed: ${outPath}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const files = (await readdir(SRC_DIR)).filter((f) => f.endsWith(".png"));
  for (const file of files) {
    await frameOne(file);
  }
  console.log(`\nDone. ${files.length} framed screenshots in ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
