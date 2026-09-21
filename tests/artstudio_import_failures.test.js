import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The depth-map import had NO error handling at all. A file the browser could
 * not decode -- a .txt renamed to .png, a truncated download -- reached
 * `img.src` and then nothing happened: no toast, no announcement, and the file
 * input still held the rejected file so picking the SAME file again fired no
 * change event. The student is left clicking a button that does nothing.
 *
 * Reproduced in Chromium 2026-09-21 against the pre-fix file:
 *   toasts: []  sr: []  input cleared: false
 * and after the fix:
 *   toasts: ["Could not read that image. Try a PNG or JPG file."]  input cleared: true
 *
 * The sculpture-JSON importer a few thousand lines away already had all four
 * guards, so this was a missed path, not a different design.
 */
const COPIES = [
  'stem_lab/stem_tool_artstudio.js',
  'desktop/web-app/public/stem_lab/stem_tool_artstudio.js',
];

// The depth-map import handler, isolated so an assertion cannot accidentally
// match the sculpture importer's guards instead.
function depthImportBlock(src) {
  const start = src.indexOf('var inputEl = e.target;');
  expect(start, 'depth-map import handler not found').toBeGreaterThan(-1);
  const end = src.indexOf('reader.readAsDataURL(file);', start);
  expect(end, 'readAsDataURL not found after the handler').toBeGreaterThan(start);
  return src.slice(start, end);
}

describe('Art Studio file imports fail out loud', () => {
  for (const file of COPIES) {
    const src = fs.readFileSync(path.join(process.cwd(), file), 'utf8');

    it(file + ' tells the student when an image cannot be decoded', () => {
      const block = depthImportBlock(src);
      // Without this the path is silent: img.onload never fires and nothing else runs.
      expect(block, 'a file the browser cannot decode must not fail silently')
        .toContain('img.onerror =');
      expect(block, 'a unreadable file must not fail silently').toContain('reader.onerror =');
    });

    it(file + ' clears the input so the same file can be retried', () => {
      const block = depthImportBlock(src);
      // A file input that still holds the rejected file fires no change event,
      // so re-picking it after fixing the file does nothing.
      expect(block).toContain('clearDepthInput');
      expect(block).toContain("inputEl.value = '';");
    });

    it(file + ' guards the canvas context and caps the file size', () => {
      const block = depthImportBlock(src);
      expect(block, 'getContext can return null').toContain('if (!ctx)');
      expect(block, 'an unbounded image read can hang the tab').toMatch(/Number\(file\.size\) > \d/);
    });

    it(file + ' routes every import failure through a translator', () => {
      // These reach addToast as a VARIABLE, so check_hardcoded_toast_text.cjs
      // cannot see them -- its AST walk only inspects the call's own argument.
      // That blind spot is why this assertion exists here.
      for (const fn of ['rejectImport', 'rejectDepth']) {
        const re = new RegExp(fn + '\\(\'[^\']+', 'g');
        expect(src.match(re) || [], fn + ' was handed a bare English string').toEqual([]);
      }
    });
  }
});
