// Render goldens for the BASIC MATH MANIPULATIVES — the tools the youngest
// students touch most (base-10 blocks, fractions, number line, area model,
// multiplication table, money, coordinate grid, protractor, volume cubes).
// None had golden coverage before the 2026-06-10 math-polish wave; this pins
// a deterministic render DIGEST per tool so drive-by edits (or future polish
// waves) that structurally change a math tool's render fail loudly.
//
// Same pattern as tests/stem_big_tools_golden.test.js: digest = length bucket
// + element counts + content sha over the default-state SSR render, with Date
// + Math.random frozen. Re-baseline INTENTIONAL changes with
//   npx vitest -u tests/stem_math_tools_golden.test.js

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// file (under stem_lab/) + registered tool id. fractions registers TWO tools.
const TOOLS = [
  { file: 'stem_lab/stem_tool_manipulatives.js', id: 'base10' },
  { file: 'stem_lab/stem_tool_fractions.js', id: 'fractionViz' },
  { file: 'stem_lab/stem_tool_fractions.js', id: 'fractions' },
  { file: 'stem_lab/stem_tool_numberline.js', id: 'numberline' },
  { file: 'stem_lab/stem_tool_areamodel.js', id: 'areamodel' },
  { file: 'stem_lab/stem_tool_multtable.js', id: 'multtable' },
  { file: 'stem_lab/stem_tool_money.js', id: 'moneyMath' },
  { file: 'stem_lab/stem_tool_coordgrid.js', id: 'coordinate' },
  { file: 'stem_lab/stem_tool_angles.js', id: 'protractor' },
  { file: 'stem_lab/stem_tool_volume.js', id: 'volume' },
];

function digest(html) {
  const count = (re) => (html.match(re) || []).length;
  return {
    lengthBucket: Math.round(html.length / 200),
    buttons: count(/role="button"|<button/g),
    svgs: count(/<svg/g),
    inputs: count(/<input/g),
    rects: count(/<rect/g),
    circles: count(/<circle/g),
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

describe('basic-math manipulatives render goldens (default state)', () => {
  for (const tool of TOOLS) {
    it('renders + pins a digest for ' + tool.id, () => {
      const cfg = loadTool(tool.file, tool.id);
      expect(typeof cfg.render).toBe('function');
      let html;
      try {
        html = renderTool(tool.id, {});
      } catch (e) {
        throw new Error('render threw for ' + tool.id + ' (' + tool.file + '): ' + (e && e.message ? e.message : e));
      }
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
      expect(digest(html)).toMatchSnapshot();
    });
  }

  it('all tool ids are unique (no copy-paste id collisions)', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
