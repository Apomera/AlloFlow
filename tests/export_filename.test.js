// Topic-derived export filenames (2026-07-02). Downloads used to be a generic
// localized "alloflow-export.html" for every pack; the filename now derives
// from the document's own <title> ("Photosynthesis — Lesson Pack" →
// "Photosynthesis.html") with the generic name as fallback.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'export_handlers_module.js'), 'utf8');

function extractFn(source, name) {
  const start = source.indexOf(`const ${name} = (`);
  expect(start, `${name} must exist`).toBeGreaterThan(-1);
  let i = source.indexOf('{', start);
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) break; }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + source.slice(source.indexOf('(', start), i + 1) + ')');
}

const fname = extractFn(src, '_alloExportFilename');

describe('_alloExportFilename', () => {
  it('derives the filename from the document title, dropping the pack suffix', () => {
    expect(fname('<html><head><title>Photosynthesis — Lesson Pack</title></head></html>', 'x')).toBe('Photosynthesis');
  });
  it('decodes entities and strips filesystem/shell-hostile characters (incl. &)', () => {
    expect(fname('<title>Cells &amp; Tissues: A &quot;Deep&quot; Dive</title>', 'x')).toBe('Cells Tissues A Deep Dive');
  });
  it('falls back to the generic name for missing/short titles', () => {
    expect(fname('<html></html>', 'alloflow-export')).toBe('alloflow-export');
    expect(fname('<title>ab</title>', 'alloflow-export')).toBe('alloflow-export');
    expect(fname(null, 'alloflow-export')).toBe('alloflow-export');
  });
  it('all three download sites route through it', () => {
    const n = (src.match(/_alloExportFilename\(/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(3); // 3 call sites (definition uses `= (…)`)
  });
});
