import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Regression guard for two defects found on 2026-09-15:
//  1. Detached scratch canvases called getContext('2d').method() with no null check.
//     When a context is unavailable (GPU/context-limit exhaustion) "Capture Keyframe"
//     and the depth-map previews threw an uncaught TypeError inside a click handler.
//  2. The AI stereogram pattern stored the LIVE ImageData buffer instead of an owned
//     copy, unlike every sibling call site which uses copyArtStudioPixels().
// desktop/app-build is a gitignored BUILD OUTPUT: the desktop build clears and
// regenerates it, so between builds the tool is legitimately absent and pinning
// it as a required path failed on a missing file rather than on a real defect.
// The tracked copies are always checked; a build mirror is checked only when it
// is actually present, which still catches the case that matters — a repaired
// tool shipped to one mirror and not another.
const REQUIRED_COPIES = [
  path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js'),
  path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_artstudio.js'),
];
const BUILD_MIRRORS = [
  path.join(process.cwd(), 'desktop', 'web-app', 'build', 'stem_lab', 'stem_tool_artstudio.js'),
  path.join(process.cwd(), 'desktop', 'app-build', 'stem_lab', 'stem_tool_artstudio.js'),
];
const COPIES = REQUIRED_COPIES.concat(BUILD_MIRRORS.filter((file) => fs.existsSync(file)));

function readSource(file) {
  return fs.readFileSync(file, 'utf8');
}

describe('Art Studio canvas context guards', () => {
  it.each(COPIES)('never calls a 2d context method on an unchecked getContext (%s)', (file) => {
    const source = readSource(file);
    const offenders = [];
    source.split('\n').forEach((line, index) => {
      if (!/getContext\(['"]2d['"]\)\s*\./.test(line)) return;
      offenders.push(`${index + 1}: ${line.trim().slice(0, 120)}`);
    });
    // The single historical exception sits inside its own try/catch.
    const allowed = offenders.filter((entry) => entry.includes('staticDepthCanvas.getContext'));
    expect(offenders.filter((entry) => !allowed.includes(entry))).toEqual([]);
  });

  it.each(COPIES)('stores an owned pixel copy for the AI stereogram pattern (%s)', (file) => {
    const source = readSource(file);
    const line = source
      .split('\n')
      .find((entry) => entry.includes("upd('stereoAiPatternImg'"));
    expect(line, 'stereoAiPatternImg assignment should exist').toBeTruthy();
    expect(line).toContain('copyArtStudioPixels(');
    // A live ImageData view must never be written straight into tool state.
    expect(line).not.toMatch(/getImageData\([^)]*\)\.data/);
  });

  it('uses the possessive form in the harmony descriptions', () => {
    const source = readSource(COPIES[0]);
    expect(source).not.toMatch(/childrens (books|design)/i);
    expect(source).toContain('Children’s books');
    expect(source).toContain('children’s design');
  });
});
