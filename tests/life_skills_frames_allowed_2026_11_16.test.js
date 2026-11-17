// Pages the Life Skills tool embeds must be allowed to load in a frame (2026-11-16).
//
// A security pass put "X-Frame-Options: DENY" and "frame-ancestors 'none'" on the
// six Life Skills 3D pages. Hours later the Life Skills tool started showing those
// same pages inside an <iframe>. Nothing tested the two together, so the inline 3D
// lab would have been an empty frame on the hosted site and in Gemini Canvas.
//
// The list of embedded pages is read from the tool itself, so a seventh page added
// there is checked here without anyone remembering to.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const read =(rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const HEADERS = read('_headers');
const TOOL = read('stem_lab/stem_tool_lifeskills.js');

// _headers -> [{ pattern, headers: { name: value } }]
function parseHeaderBlocks(text) {
  const blocks = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) { current = { pattern: raw.trim(), headers: {} }; blocks.push(current); continue; }
    const m = raw.trim().match(/^([^:]+):\s*(.*)$/);
    if (m && current) current.headers[m[1].toLowerCase()] = m[2];
  }
  return blocks;
}

function embeddedPaths() {
  const fn = sliceBetween(TOOL, 'function buildLifeSkills3dUrl(', 'function ', { file: 'stem_lab/stem_tool_lifeskills.js', occurrence: 1 });
  const body = sliceBetween(fn, 'var paths = {', 'return ', { file: 'stem_lab/stem_tool_lifeskills.js', label: 'paths table' });
  return Array.from(body.matchAll(/'(\/life_skills_[a-z0-9_]+\/[a-z0-9_]+\.html)'/g)).map((m) => m[1]);
}

const matches = (pattern, path) => (pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : pattern === path);

describe('Life Skills 3D pages can be shown inside the Life Skills tool', () => {
  const blocks = parseHeaderBlocks(HEADERS);
  const paths = embeddedPaths();

  it('finds the embedded pages and really embeds them in a frame', () => {
    expect(paths.length).toBeGreaterThanOrEqual(6);
    expect(TOOL).toMatch(/h\('iframe'/);
  });

  it('no header rule forbids framing an embedded page', () => {
    for (const path of paths) {
      for (const block of blocks.filter((b) => matches(b.pattern, path))) {
        expect(block.headers['x-frame-options'], path + ' via ' + block.pattern).toBeUndefined();
        expect(block.headers['content-security-policy'] || '', path + ' via ' + block.pattern).not.toMatch(/frame-ancestors/);
      }
    }
  });

  it('the pages keep their other protections', () => {
    for (const path of paths) {
      const own = blocks.filter((b) => b.pattern !== '/*' && matches(b.pattern, path));
      expect(own.length, path + ' has one rule of its own').toBe(1);
      expect(own[0].headers['content-security-policy']).toContain("object-src 'none'");
      expect(own[0].headers['referrer-policy']).toBe('no-referrer');
    }
  });

  it('no path pattern is declared twice (two blocks send two conflicting values)', () => {
    const seen = new Map();
    blocks.forEach((b) => seen.set(b.pattern, (seen.get(b.pattern) || 0) + 1));
    const twice = Array.from(seen.entries()).filter(([, n]) => n > 1).map(([p]) => p);
    expect(twice).toEqual([]);
  });
});
