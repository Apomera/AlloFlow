#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_SVG = path.join(REPO_ROOT, 'allobot.svg');
const OUTPUT_DIR = path.join(REPO_ROOT, 'desktop', 'build-resources');
const OUTPUT_ICO = path.join(OUTPUT_DIR, 'icon.ico');
const ICON_SIZES = [256, 128, 64, 48, 32, 16];

function writeIco(images) {
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + entrySize * images.length;
  const chunks = [];

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  chunks.push(header);

  for (const image of images) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(image.size === 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size === 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.png.length;
    chunks.push(entry);
  }

  for (const image of images) {
    chunks.push(image.png);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_ICO, Buffer.concat(chunks));
}

async function renderPngs(svg) {
  const browser = await chromium.launch({ headless: true });
  try {
    const images = [];
    for (const size of ICON_SIZES) {
      const page = await browser.newPage({
        viewport: { width: size, height: size },
        deviceScaleFactor: 1,
      });
      await page.setContent(`
        <!doctype html>
        <html>
          <head>
            <style>
              html, body {
                width: ${size}px;
                height: ${size}px;
                margin: 0;
                background: transparent;
                overflow: hidden;
              }

              .icon-wrap {
                width: ${size}px;
                height: ${size}px;
                display: grid;
                place-items: center;
              }

              .icon-wrap svg {
                width: ${Math.round(size * 0.92)}px;
                height: ${Math.round(size * 0.92)}px;
                display: block;
              }
            </style>
          </head>
          <body>
            <div class="icon-wrap" id="icon">${svg}</div>
          </body>
        </html>
      `);
      const png = await page.locator('#icon').screenshot({ omitBackground: true });
      await page.close();
      images.push({ size, png });
    }
    return images;
  } finally {
    await browser.close();
  }
}

async function main() {
  const svg = fs.readFileSync(SOURCE_SVG, 'utf8');
  const images = await renderPngs(svg);
  writeIco(images);
  console.log('[AlloFlow Desktop] Allobot icon written to ' + path.relative(REPO_ROOT, OUTPUT_ICO));
}

main().catch((error) => {
  console.error('[AlloFlow Desktop] ' + error.message);
  process.exitCode = 1;
});
