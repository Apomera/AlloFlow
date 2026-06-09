// STEM Lab tool render goldens.
//
// WHY: the 111 STEM tools had ONLY crash-smoke coverage (check_stem_render.cjs /
// stem_widgets_smoke) — "does it throw?" — and ZERO behaviour pinning. So a
// refactor (e.g. the deferred aquaculture / optics monolith decompositions) or a
// drive-by edit could silently change a tool's render with nothing to catch it.
//
// This pins a deterministic render DIGEST (length + element counts + a content
// hash) for a curated set: the tools changed in the 2026-06-08 refinement pass,
// the new Cellular Automaton Lab, and the two deferred refactor targets
// (aquaculture, optics) so they have a baseline to refactor against. Plus a
// targeted INVARIANT locking the worldbuilder penmanship overclaim fix.
//
// Determinism: Date + Math.random are frozen so the digest is stable run-to-run
// (this is exactly why the sibling smoke harness skipped snapshots). Re-baseline
// an INTENTIONAL render change with `npx vitest -u tests/stem_tool_golden.test.js`.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOLS = [
  // new tool (2026-06-08)
  { file: 'stem_lab/stem_tool_cellular.js', id: 'cellularLab' },
  // changed in the 2026-06-08 refinement pass
  { file: 'stem_lab/stem_tool_music.js', id: 'musicSynth' },
  { file: 'stem_lab/stem_tool_worldbuilder.js', id: 'worldBuilder' },
  { file: 'stem_lab/stem_tool_ecosystem.js', id: 'ecosystem' },
  { file: 'stem_lab/stem_tool_evolab.js', id: 'evoLab' },
  { file: 'stem_lab/stem_tool_geometryworld.js', id: 'geometryWorld' },
  { file: 'stem_lab/stem_tool_spacecolony.js', id: 'spaceColony' },
  { file: 'stem_lab/stem_tool_climateExplorer.js', id: 'climateExplorer' },
  { file: 'stem_lab/stem_tool_behaviorlab.js', id: 'behaviorLab' },
  { file: 'stem_lab/stem_tool_aquarium.js', id: 'aquarium' },
  // deferred refactor targets — golden baseline so a future decomposition can be
  // verified behaviour-preserving
  { file: 'stem_lab/stem_tool_aquaculture.js', id: 'aquacultureLab' },
  { file: 'stem_lab/stem_tool_optics.js', id: 'opticsLab' },
];

function digest(html) {
  const count = (re) => (html.match(re) || []).length;
  return {
    // bucket the length so a 1-char copy tweak doesn't churn, but a structural
    // change (lost panel / doubled tree) does.
    lengthBucket: Math.round(html.length / 200),
    buttons: count(/role="button"|<button/g),
    svgs: count(/<svg/g),
    inputs: count(/<input/g),
    sha: crypto.createHash('sha256').update(html).digest('hex').slice(0, 16),
  };
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.4242);
});
afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
beforeEach(() => resetStemLab());

describe('STEM tool render goldens (default state)', () => {
  for (const tool of TOOLS) {
    it('renders + pins a digest for ' + tool.id, () => {
      loadTool(tool.file, tool.id);
      const html = renderTool(tool.id, {});
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
      expect(digest(html)).toMatchSnapshot();
    });
  }

  it('digest is deterministic (same render twice → identical sha)', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_cellular.js', 'cellularLab');
    const a = digest(renderTool('cellularLab', {}));
    resetStemLab();
    loadTool('stem_lab/stem_tool_cellular.js', 'cellularLab');
    const b = digest(renderTool('cellularLab', {}));
    expect(a.sha).toBe(b.sha);
  });
});

// ── Targeted invariant: worldbuilder penmanship is qualitative, NOT a score ──
// Locks the 2026-06-08 credibility fix: a Gemini Vision guess must NOT be
// presented as a precise /100 + four /25 measurement. The card lives in a sub-
// view that a single SSR render can't easily reach, so this pins the source of
// the Penmanship Feedback card directly (same source-content pattern the
// behavior_lens golden uses for its template-literal checks).
import { readFileSync as _readFileSync } from 'node:fs';
import { resolve as _resolve } from 'node:path';

describe('STEM invariant · worldbuilder penmanship is not an overclaimed score', () => {
  // Extract the Penmanship Feedback card block from the source.
  const src = _readFileSync(_resolve(process.cwd(), 'stem_lab/stem_tool_worldbuilder.js'), 'utf8');
  const start = src.indexOf('// ── Penmanship Feedback Card ──');
  // Bound the block precisely: the card ends at the close button that clears hwResult.
  const end = start !== -1 ? src.indexOf("upd('hwResult', null)", start) : -1;
  const block = (start !== -1 && end !== -1) ? src.slice(start, end) : '';

  it('the Penmanship Feedback card block exists', () => {
    expect(start).toBeGreaterThan(-1);
    expect(block).toContain('Penmanship Feedback');
  });

  it('shows an "AI estimate" disclaimer and qualitative bands, not /100 or /25', () => {
    expect(block).toMatch(/AI estimate/i);
    expect(block).toMatch(/Legible|Very legible|Developing|Keep practicing/);
    expect(block).toMatch(/Strong|Solid|Growing/);
    // The card must not RENDER a precise validated score — check the string
    // literals that would be emitted (quoted), so an explanatory comment that
    // merely mentions /25 doesn't trip it.
    expect(block).not.toContain("'/100'");
    expect(block).not.toContain("'/25'");
  });

  it('softens the toast/SR announcement (no "score: N out of 100")', () => {
    expect(src).not.toMatch(/Penmanship score: '?\s*\+/);
    expect(src).toContain('Penmanship tips ready');
  });
});
